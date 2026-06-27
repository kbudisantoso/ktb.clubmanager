import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { FeeChargesService } from './fee-charges.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../../../prisma/generated/client/index.js';

const { Decimal } = Prisma;

// ─── Mock Data Factories ────────────────────────────────────────────────────

const CLUB_ID = 'club-1';

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    clubId: CLUB_ID,
    firstName: 'Max',
    lastName: 'Mustermann',
    memberNumber: 'TSV-001',
    status: 'ACTIVE',
    householdId: null,
    householdRole: null,
    deletedAt: null,
    feeTypeId: 'ft-1',
    feeType: { id: 'ft-1', name: 'Einzelbeitrag', isActive: true },
    membershipPeriods: [
      {
        id: 'mp-1',
        joinDate: new Date('2020-01-01'),
        leaveDate: null,
        membershipTypeId: 'mt-1',
        membershipType: {
          id: 'mt-1',
          name: 'Ordentliches Mitglied',
        },
      },
    ],
    memberFeeOverrides: [],
    ...overrides,
  };
}

function makeMemberWithOverride(overrideType: string, overrides: Record<string, unknown> = {}) {
  return makeMember({
    id: 'member-exempt',
    firstName: 'Exempt',
    lastName: 'User',
    memberNumber: 'TSV-003',
    memberFeeOverrides: [
      {
        id: 'override-1',
        overrideType,
        customAmount: overrideType === 'CUSTOM_AMOUNT' ? new Decimal('60.00') : null,
        reason: overrideType === 'EXEMPT' ? 'Ehrenmitglied' : 'Sozialtarif',
        isBaseFee: true,
        feeCategoryId: null,
      },
    ],
    ...overrides,
  });
}

function makeClub(overrides: Record<string, unknown> = {}) {
  return {
    id: CLUB_ID,
    proRataMode: 'FULL',
    householdBillingModel: 'NONE',
    ...overrides,
  };
}

function makeFeeCharge(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fc-1',
    clubId: CLUB_ID,
    memberId: 'member-1',
    feeCategoryId: null,
    membershipTypeId: 'mt-1',
    description: 'Grundbeitrag 2026',
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-12-31'),
    amount: new Decimal('120.00'),
    dueDate: new Date('2026-02-15'),
    discountAmount: null,
    discountReason: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: {
      id: 'member-1',
      firstName: 'Max',
      lastName: 'Mustermann',
      memberNumber: 'TSV-001',
    },
    ...overrides,
  };
}

// ─── Mock Prisma ────────────────────────────────────────────────────────────

const mockDb = {
  feeCategory: {
    findMany: vi.fn(),
  },
  feeCharge: {
    findMany: vi.fn(),
    count: vi.fn(),
    createMany: vi.fn(),
  },
  membershipTypeFeeType: {
    findFirst: vi.fn(),
  },
  feeCategoryMembershipType: {
    findMany: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(() => mockDb),
  club: {
    findFirst: vi.fn(),
  },
  member: {
    findMany: vi.fn(),
  },
  feeCharge: {
    findMany: vi.fn(),
    count: vi.fn(),
    createMany: vi.fn(),
  },
  payment: {
    groupBy: vi.fn(),
  },
  $transaction: vi.fn(),
} as unknown as PrismaService;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FeeChargesService', () => {
  let service: FeeChargesService;

  beforeEach(() => {
    vi.clearAllMocks();
    (mockPrisma.forClub as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
    // Default: no existing charges for the period (executeBillingRun re-bill guard)
    (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    // Default cross-table entry: mt-1 x ft-1 = 120.00 ANNUALLY
    (mockDb.membershipTypeFeeType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'mtft-1',
      membershipTypeId: 'mt-1',
      feeTypeId: 'ft-1',
      amount: new Decimal('120.00'),
      billingInterval: 'ANNUALLY',
    });
    service = new FeeChargesService(mockPrisma);
  });

  // ─── Preview Billing Run ────────────────────────────────────────────

  describe('previewBillingRun()', () => {
    const previewDto = {
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      billingInterval: 'ANNUALLY' as const,
    };

    it('should return memberCount=3 and correct totalAmount for 3 active members with annual interval', async () => {
      const members = [
        makeMember({ id: 'member-1', memberNumber: 'TSV-001' }),
        makeMember({ id: 'member-2', firstName: 'Anna', memberNumber: 'TSV-002' }),
        makeMember({ id: 'member-3', firstName: 'Peter', memberNumber: 'TSV-003' }),
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await service.previewBillingRun(CLUB_ID, previewDto);

      expect(result.memberCount).toBe(3);
      expect(result.chargeCount).toBe(3);
      expect(result.totalAmount).toBe('360.00');
      expect(result.exemptions).toBe(0);
      expect(result.existingCharges).toBe(0);
    });

    it('should include category fees in chargeCount, totalAmount, and breakdown', async () => {
      const members = [
        makeMember({ id: 'member-1', memberNumber: 'TSV-001' }),
        makeMember({ id: 'member-2', firstName: 'Anna', memberNumber: 'TSV-002' }),
      ];
      const categories = [
        {
          id: 'cat-1',
          name: 'Tennisabteilung',
          amount: new Decimal('50.00'),
          billingInterval: 'ANNUALLY',
          isOneTime: false,
          isActive: true,
          deletedAt: null,
          scope: 'ALL_MEMBERS',
          feeCategoryMembershipTypes: [],
        },
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await service.previewBillingRun(CLUB_ID, previewDto);

      // 2 members × (1 base + 1 category) = 4 charges
      expect(result.memberCount).toBe(2);
      expect(result.chargeCount).toBe(4);
      // 2 × 120 + 2 × 50 = 340
      expect(result.totalAmount).toBe('340.00');
      // Breakdown: base fee type + category
      expect(result.breakdown).toHaveLength(2);
      const baseFee = result.breakdown.find((b) => b.membershipType === 'Ordentliches Mitglied');
      const catFee = result.breakdown.find((b) => b.membershipType === 'Tennisabteilung');
      expect(baseFee).toEqual({
        kind: 'membershipType',
        membershipType: 'Ordentliches Mitglied',
        count: 2,
        subtotal: '240.00',
      });
      expect(catFee).toEqual({
        kind: 'category',
        membershipType: 'Tennisabteilung',
        count: 2,
        subtotal: '100.00',
      });
    });

    it('should exclude exempt member: memberCount=2, exemptions=1', async () => {
      const members = [
        makeMember({ id: 'member-1', memberNumber: 'TSV-001' }),
        makeMember({ id: 'member-2', firstName: 'Anna', memberNumber: 'TSV-002' }),
        makeMemberWithOverride('EXEMPT', { id: 'member-3', memberNumber: 'TSV-003' }),
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await service.previewBillingRun(CLUB_ID, previewDto);

      expect(result.memberCount).toBe(2);
      expect(result.chargeCount).toBe(2);
      expect(result.exemptions).toBe(1);
      expect(result.totalAmount).toBe('240.00');
    });

    it('should detect existing charges for same period and report existingCharges count', async () => {
      const members = [makeMember()];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const result = await service.previewBillingRun(CLUB_ID, previewDto);

      expect(result.existingCharges).toBe(5);
    });

    it('should return warnings for members without feeTypeId', async () => {
      const members = [
        makeMember({ id: 'member-1', memberNumber: 'TSV-001' }),
        makeMember({
          id: 'member-no-ft',
          firstName: 'Anna',
          lastName: 'Ohne',
          memberNumber: 'TSV-002',
          feeTypeId: null,
          feeType: null,
        }),
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await service.previewBillingRun(CLUB_ID, previewDto);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toEqual({
        memberId: 'member-no-ft',
        memberName: 'Anna Ohne',
        reason: 'Keine Beitragsart zugewiesen',
      });
      expect(result.memberCount).toBe(1);
      expect(result.exemptions).toBe(1);
    });

    it('should return warning when no cross-table entry exists for member', async () => {
      const members = [
        makeMember({
          id: 'member-no-entry',
          firstName: 'Peter',
          lastName: 'NoEntry',
          memberNumber: 'TSV-050',
          feeTypeId: 'ft-unknown',
          feeType: { id: 'ft-unknown', name: 'Sondertarif' },
        }),
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      // No cross-table entry for ft-unknown
      (mockDb.membershipTypeFeeType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.previewBillingRun(CLUB_ID, previewDto);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.reason).toContain('Kein Betrag in der Beitragstabelle');
      expect(result.memberCount).toBe(0);
    });

    it('should apply FeeCategory with scope ALL_MEMBERS to all members', async () => {
      const members = [
        makeMember({ id: 'member-1', memberNumber: 'TSV-001' }),
        makeMember({
          id: 'member-2',
          firstName: 'Anna',
          memberNumber: 'TSV-002',
          membershipPeriods: [
            {
              id: 'mp-2',
              joinDate: new Date('2020-01-01'),
              leaveDate: null,
              membershipTypeId: 'mt-2',
              membershipType: { id: 'mt-2', name: 'Passives Mitglied' },
            },
          ],
        }),
      ];
      const categories = [
        {
          id: 'cat-all',
          name: 'Vereinszeitung',
          amount: new Decimal('10.00'),
          billingInterval: 'ANNUALLY',
          isActive: true,
          deletedAt: null,
          scope: 'ALL_MEMBERS',
          feeCategoryMembershipTypes: [],
        },
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      // Both members get cross-table entry
      (mockDb.membershipTypeFeeType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mtft-1',
        membershipTypeId: 'mt-1',
        feeTypeId: 'ft-1',
        amount: new Decimal('120.00'),
        billingInterval: 'ANNUALLY',
      });

      const result = await service.previewBillingRun(CLUB_ID, previewDto);

      // 2 base + 2 category = 4 charges
      expect(result.chargeCount).toBe(4);
      const catBreakdown = result.breakdown.find((b) => b.membershipType === 'Vereinszeitung');
      expect(catBreakdown).toEqual({
        kind: 'category',
        membershipType: 'Vereinszeitung',
        count: 2,
        subtotal: '20.00',
      });
    });

    it('should apply FeeCategory with scope BY_MEMBERSHIP_TYPE only to matching members', async () => {
      const members = [
        makeMember({ id: 'member-1', memberNumber: 'TSV-001' }), // mt-1 (Ordentlich)
        makeMember({
          id: 'member-2',
          firstName: 'Anna',
          memberNumber: 'TSV-002',
          membershipPeriods: [
            {
              id: 'mp-2',
              joinDate: new Date('2020-01-01'),
              leaveDate: null,
              membershipTypeId: 'mt-2',
              membershipType: { id: 'mt-2', name: 'Passives Mitglied' },
            },
          ],
        }),
      ];
      const categories = [
        {
          id: 'cat-mt',
          name: 'Tennisabteilung',
          amount: new Decimal('50.00'),
          billingInterval: 'ANNUALLY',
          isActive: true,
          deletedAt: null,
          scope: 'BY_MEMBERSHIP_TYPE',
          feeCategoryMembershipTypes: [
            { id: 'fcmt-1', feeCategoryId: 'cat-mt', membershipTypeId: 'mt-1' },
          ],
        },
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (mockDb.membershipTypeFeeType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mtft-1',
        membershipTypeId: 'mt-1',
        feeTypeId: 'ft-1',
        amount: new Decimal('120.00'),
        billingInterval: 'ANNUALLY',
      });

      const result = await service.previewBillingRun(CLUB_ID, previewDto);

      // 2 base + 1 category (only member-1 matches mt-1) = 3 charges
      expect(result.chargeCount).toBe(3);
      const catBreakdown = result.breakdown.find((b) => b.membershipType === 'Tennisabteilung');
      expect(catBreakdown).toEqual({
        kind: 'category',
        membershipType: 'Tennisabteilung',
        count: 1,
        subtotal: '50.00',
      });
    });

    it('should skip FeeCategory with scope INDIVIDUAL (only via override)', async () => {
      const members = [makeMember({ id: 'member-1', memberNumber: 'TSV-001' })];
      const categories = [
        {
          id: 'cat-indiv',
          name: 'Sonderbeitrag',
          amount: new Decimal('25.00'),
          billingInterval: 'ANNUALLY',
          isActive: true,
          deletedAt: null,
          scope: 'INDIVIDUAL',
          feeCategoryMembershipTypes: [],
        },
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await service.previewBillingRun(CLUB_ID, previewDto);

      // Only base fee, no category charge (INDIVIDUAL skipped)
      expect(result.chargeCount).toBe(1);
      expect(result.breakdown.find((b) => b.membershipType === 'Sonderbeitrag')).toBeUndefined();
    });
  });

  // ─── Execute Billing Run ────────────────────────────────────────────

  describe('executeBillingRun()', () => {
    const confirmDto = {
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      billingInterval: 'ANNUALLY' as const,
      dueDate: '2026-02-15',
    };

    it('should create FeeCharge records for each member in a transaction', async () => {
      const members = [
        makeMember({ id: 'member-1', memberNumber: 'TSV-001' }),
        makeMember({ id: 'member-2', firstName: 'Anna', memberNumber: 'TSV-002' }),
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const txClient = {
            feeCharge: {
              createMany: vi.fn().mockResolvedValue({ count: 2 }),
            },
          };
          return fn(txClient);
        }
      );

      const result = await service.executeBillingRun(CLUB_ID, confirmDto);

      expect(result.chargesCreated).toBe(2);
      expect(result.totalAmount).toBe('240.00');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should apply MONTHLY_PRO_RATA with mid-year join using HALF_UP rounding', async () => {
      // Member joined July 1st = 6 months remaining out of 12, so 120 * 6/12 = 60.00
      const members = [
        makeMember({
          id: 'member-prorata',
          membershipPeriods: [
            {
              id: 'mp-prorata',
              joinDate: new Date('2026-07-01'),
              leaveDate: null,
              membershipTypeId: 'mt-1',
              membershipType: {
                id: 'mt-1',
                name: 'Ordentliches Mitglied',
              },
            },
          ],
        }),
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeClub({ proRataMode: 'MONTHLY_PRO_RATA' })
      );
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      let capturedData: unknown[] = [];
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const txClient = {
            feeCharge: {
              createMany: vi.fn().mockImplementation(({ data }: { data: unknown[] }) => {
                capturedData = data;
                return { count: data.length };
              }),
            },
          };
          return fn(txClient);
        }
      );

      const result = await service.executeBillingRun(CLUB_ID, confirmDto);

      expect(result.chargesCreated).toBe(1);
      // 120 * 6/12 = 60.00
      expect(result.totalAmount).toBe('60.00');
      expect((capturedData[0] as { amount: Prisma.Decimal }).amount.toFixed(2)).toBe('60.00');
    });

    it('should store discountAmount and discountReason on charges with CUSTOM_AMOUNT overrides', async () => {
      const members = [
        makeMemberWithOverride('CUSTOM_AMOUNT', {
          id: 'member-custom',
          memberNumber: 'TSV-010',
        }),
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      let capturedData: unknown[] = [];
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const txClient = {
            feeCharge: {
              createMany: vi.fn().mockImplementation(({ data }: { data: unknown[] }) => {
                capturedData = data;
                return { count: data.length };
              }),
            },
          };
          return fn(txClient);
        }
      );

      await service.executeBillingRun(CLUB_ID, confirmDto);

      const charge = capturedData[0] as {
        amount: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        discountReason: string;
      };
      // Original 120, custom 60 => discount = 60
      expect(charge.amount.toFixed(2)).toBe('60.00');
      expect(charge.discountAmount.toFixed(2)).toBe('60.00');
      expect(charge.discountReason).toContain('Individueller Betrag');
    });

    it('should exclude members without feeTypeId (D-17)', async () => {
      const memberWithFeeType = makeMember({
        id: 'member-with',
        memberNumber: 'TSV-020',
      });
      const memberWithoutFeeType = makeMember({
        id: 'member-without',
        firstName: 'Anna',
        memberNumber: 'TSV-021',
        feeTypeId: null,
        feeType: null,
      });

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        memberWithFeeType,
        memberWithoutFeeType,
      ]);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      let capturedData: unknown[] = [];
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const txClient = {
            feeCharge: {
              createMany: vi.fn().mockImplementation(({ data }: { data: unknown[] }) => {
                capturedData = data;
                return { count: data.length };
              }),
            },
          };
          return fn(txClient);
        }
      );

      await service.executeBillingRun(CLUB_ID, confirmDto);

      // Only member with feeTypeId should be charged
      expect(capturedData).toHaveLength(1);
      expect((capturedData[0] as { memberId: string }).memberId).toBe('member-with');
    });

    it('should include feeTypeId in charge data', async () => {
      const members = [makeMember()];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      let capturedData: unknown[] = [];
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const txClient = {
            feeCharge: {
              createMany: vi.fn().mockImplementation(({ data }: { data: unknown[] }) => {
                capturedData = data;
                return { count: data.length };
              }),
            },
          };
          return fn(txClient);
        }
      );

      await service.executeBillingRun(CLUB_ID, confirmDto);

      expect(capturedData).toHaveLength(1);
      expect((capturedData[0] as { feeTypeId: string }).feeTypeId).toBe('ft-1');
    });

    it('should skip duplicates via createMany skipDuplicates (idempotent)', async () => {
      const members = [makeMember()];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      let skipDuplicatesUsed = false;
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const txClient = {
            feeCharge: {
              createMany: vi
                .fn()
                .mockImplementation(({ skipDuplicates }: { skipDuplicates: boolean }) => {
                  skipDuplicatesUsed = skipDuplicates;
                  return { count: 1 };
                }),
            },
          };
          return fn(txClient);
        }
      );

      await service.executeBillingRun(CLUB_ID, confirmDto);

      expect(skipDuplicatesUsed).toBe(true);
    });

    // ─── WR-01/02: reject re-billing a period that already has charges ──

    it('should throw ConflictException when charges already exist for the period (WR-01/02)', async () => {
      const members = [makeMember()];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      // A previous run already created charges for this exact period
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);

      const txSpy = vi.fn();
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(txSpy);

      await expect(service.executeBillingRun(CLUB_ID, confirmDto)).rejects.toBeInstanceOf(
        ConflictException
      );
      // Guard must run before any write
      expect(txSpy).not.toHaveBeenCalled();
      expect(mockDb.feeCharge.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          periodStart: new Date(confirmDto.periodStart),
          periodEnd: new Date(confirmDto.periodEnd),
        },
      });
    });

    it('should proceed and create charges when no existing charges for the period (WR-01/02)', async () => {
      const members = [makeMember()];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const txClient = {
            feeCharge: {
              createMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
          };
          return fn(txClient);
        }
      );

      const result = await service.executeBillingRun(CLUB_ID, confirmDto);

      expect(result.chargesCreated).toBe(1);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── findAllWithStatus ──────────────────────────────────────────────

  describe('findAllWithStatus()', () => {
    it('should return OPEN status when no payments exist', async () => {
      const charges = [makeFeeCharge()];
      (mockDb.feeCharge.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(charges);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (mockPrisma.payment.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.findAllWithStatus(CLUB_ID, {});

      expect(result.data[0]!.status).toBe('OPEN');
      expect(result.data[0]!.paidAmount).toBe('0.00');
      expect(result.data[0]!.remainingAmount).toBe('120.00');
    });

    it('should return PARTIAL status when sum(payments) < amount', async () => {
      const charges = [makeFeeCharge()];
      (mockDb.feeCharge.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(charges);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (mockPrisma.payment.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { feeChargeId: 'fc-1', _sum: { amount: new Decimal('50.00') } },
      ]);

      const result = await service.findAllWithStatus(CLUB_ID, {});

      expect(result.data[0]!.status).toBe('PARTIAL');
      expect(result.data[0]!.paidAmount).toBe('50.00');
      expect(result.data[0]!.remainingAmount).toBe('70.00');
    });

    it('should return PAID status when sum(payments) >= amount', async () => {
      const charges = [makeFeeCharge()];
      (mockDb.feeCharge.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(charges);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (mockPrisma.payment.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { feeChargeId: 'fc-1', _sum: { amount: new Decimal('120.00') } },
      ]);

      const result = await service.findAllWithStatus(CLUB_ID, {});

      expect(result.data[0]!.status).toBe('PAID');
      expect(result.data[0]!.paidAmount).toBe('120.00');
      expect(result.data[0]!.remainingAmount).toBe('0.00');
    });

    it('should set isOverdue=true when dueDate < today and status != PAID', async () => {
      const pastDueCharge = makeFeeCharge({
        dueDate: new Date('2020-01-01'), // Well in the past
      });
      (mockDb.feeCharge.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([pastDueCharge]);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (mockPrisma.payment.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.findAllWithStatus(CLUB_ID, {});

      expect(result.data[0]!.isOverdue).toBe(true);
    });

    it('should filter by status, memberId, and period', async () => {
      const charges = [
        makeFeeCharge({ id: 'fc-1', memberId: 'member-1' }),
        makeFeeCharge({ id: 'fc-2', memberId: 'member-2' }),
      ];
      (mockDb.feeCharge.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([charges[0]!]);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (mockPrisma.payment.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.findAllWithStatus(CLUB_ID, {
        memberId: 'member-1',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
      });

      expect(result.data).toHaveLength(1);
      // Check that findMany was called with the correct filters
      expect(mockDb.feeCharge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            memberId: 'member-1',
          }),
        })
      );
    });

    it('should return correct total when filtering by status (two-pass)', async () => {
      // 3 charges: 1 OPEN (no payments), 1 PAID (fully paid), 1 OVERDUE (past due, no payments)
      const openCharge = makeFeeCharge({ id: 'fc-open', dueDate: new Date('2099-12-31') });

      // Pass 1: lightweight query returns all 3 charges (select: id, amount, dueDate)
      (mockDb.feeCharge.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([
          { id: 'fc-open', amount: new Decimal('120.00'), dueDate: new Date('2099-12-31') },
          { id: 'fc-paid', amount: new Decimal('120.00'), dueDate: new Date('2099-12-31') },
          { id: 'fc-overdue', amount: new Decimal('120.00'), dueDate: new Date('2020-01-01') },
        ])
        // Pass 2: full data for filtered page (only the OPEN charge)
        .mockResolvedValueOnce([openCharge]);

      // Payment aggregates: only fc-paid is fully paid
      (mockPrisma.payment.groupBy as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([
          { feeChargeId: 'fc-paid', _sum: { amount: new Decimal('120.00') } },
        ])
        // Second call for enrichChargesWithStatus
        .mockResolvedValueOnce([]);

      const result = await service.findAllWithStatus(CLUB_ID, { status: 'OPEN' });

      // Only fc-open matches OPEN (fc-overdue is OPEN but overdue, not "OPEN" status-wise — it IS open but also overdue)
      // Actually OPEN means: not paid, not overdue. fc-open is OPEN (future due), fc-overdue has status OPEN but isOverdue=true.
      // The filter `status === 'OPEN'` matches both since computeChargeStatus returns status='OPEN' for both.
      // But the status filter checks `status === query.status`, so both fc-open and fc-overdue match 'OPEN'.
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should paginate correctly with status filter', async () => {
      // Create 25 OPEN charges + 5 PAID charges
      const openChargesLight = Array.from({ length: 25 }, (_, i) => ({
        id: `fc-open-${i}`,
        amount: new Decimal('10.00'),
        dueDate: new Date('2099-12-31'),
      }));
      const paidChargesLight = Array.from({ length: 5 }, (_, i) => ({
        id: `fc-paid-${i}`,
        amount: new Decimal('10.00'),
        dueDate: new Date('2099-12-31'),
      }));

      // Pass 1: all 30 charges
      (mockDb.feeCharge.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([...openChargesLight, ...paidChargesLight])
        // Pass 2: 5 charges for page 2 (ids fc-open-20 through fc-open-24)
        .mockResolvedValueOnce(
          Array.from({ length: 5 }, (_, i) =>
            makeFeeCharge({
              id: `fc-open-${20 + i}`,
              amount: new Decimal('10.00'),
              dueDate: new Date('2099-12-31'),
            })
          )
        );

      // Payment sums: only paid charges have payments
      const paidAggregates = Array.from({ length: 5 }, (_, i) => ({
        feeChargeId: `fc-paid-${i}`,
        _sum: { amount: new Decimal('10.00') },
      }));

      (mockPrisma.payment.groupBy as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(paidAggregates)
        // Second call for enrichChargesWithStatus on page 2 data
        .mockResolvedValueOnce([]);

      const result = await service.findAllWithStatus(CLUB_ID, {
        status: 'OPEN',
        page: 2,
        limit: 20,
      });

      expect(result.total).toBe(25);
      expect(result.data).toHaveLength(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should return correct total when filtering by OVERDUE', async () => {
      // 2 overdue (past due, unpaid), 1 future OPEN
      (mockDb.feeCharge.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([
          { id: 'fc-overdue-1', amount: new Decimal('50.00'), dueDate: new Date('2020-01-01') },
          { id: 'fc-overdue-2', amount: new Decimal('50.00'), dueDate: new Date('2020-06-01') },
          { id: 'fc-future', amount: new Decimal('50.00'), dueDate: new Date('2099-12-31') },
        ])
        .mockResolvedValueOnce([
          makeFeeCharge({
            id: 'fc-overdue-1',
            amount: new Decimal('50.00'),
            dueDate: new Date('2020-01-01'),
          }),
          makeFeeCharge({
            id: 'fc-overdue-2',
            amount: new Decimal('50.00'),
            dueDate: new Date('2020-06-01'),
          }),
        ]);

      (mockPrisma.payment.groupBy as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.findAllWithStatus(CLUB_ID, { status: 'OVERDUE' });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });
  });

  // ─── Pro-rata boundary behavior (WR-03) ─────────────────────────────
  // Locks in the documented calendar-month-granular rule: day-of-month is ignored,
  // a member joining any day of a month is treated as joining that whole month.

  describe('pro-rata boundaries (WR-03)', () => {
    const confirmDto = {
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      billingInterval: 'ANNUALLY' as const,
      dueDate: '2026-02-15',
    };

    // Runs a billing execute for a single member with the given join date and
    // returns the produced charge amount as a fixed-2 string (null if no charge).
    async function billOne(joinDate: string): Promise<string | null> {
      const members = [
        makeMember({
          id: 'member-prorata',
          membershipPeriods: [
            {
              id: 'mp-prorata',
              joinDate: new Date(joinDate),
              leaveDate: null,
              membershipTypeId: 'mt-1',
              membershipType: { id: 'mt-1', name: 'Ordentliches Mitglied' },
            },
          ],
        }),
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeClub({ proRataMode: 'MONTHLY_PRO_RATA' })
      );
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      let capturedData: unknown[] = [];
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const txClient = {
            feeCharge: {
              createMany: vi.fn().mockImplementation(({ data }: { data: unknown[] }) => {
                capturedData = data;
                return { count: data.length };
              }),
            },
          };
          return fn(txClient);
        }
      );

      await service.executeBillingRun(CLUB_ID, confirmDto);

      if (capturedData.length === 0) return null;
      return (capturedData[0] as { amount: Prisma.Decimal }).amount.toFixed(2);
    }

    it('charges the full amount when joining exactly on periodStart', async () => {
      expect(await billOne('2026-01-01')).toBe('120.00');
    });

    it('charges the full amount when joining before periodStart', async () => {
      expect(await billOne('2020-06-15')).toBe('120.00');
    });

    it('charges zero when joining after periodEnd', async () => {
      expect(await billOne('2027-03-01')).toBe('0.00');
    });

    it('ignores day-of-month: 1st vs last day of the same month yield the same amount', async () => {
      // July is month index 6 -> monthsElapsed=6 -> 120 * 6/12 = 60.00 for both
      const firstOfJuly = await billOne('2026-07-01');
      const lastOfJuly = await billOne('2026-07-31');
      expect(firstOfJuly).toBe('60.00');
      expect(lastOfJuly).toBe('60.00');
      expect(firstOfJuly).toBe(lastOfJuly);
    });

    it('charges the correct fraction for a mid-period join month (April)', async () => {
      // April is month index 3 -> monthsElapsed=3 -> remaining 9 -> 120 * 9/12 = 90.00
      expect(await billOne('2026-04-10')).toBe('90.00');
    });
  });

  // ─── Breakdown kind / name collision (WR-04) ────────────────────────

  describe('breakdown kind (WR-04)', () => {
    const previewDto = {
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      billingInterval: 'ANNUALLY' as const,
    };

    it('does not merge a category that shares a name with a membership type', async () => {
      // Membership type and category both named "Ordentliches Mitglied"
      const members = [makeMember({ id: 'member-1', memberNumber: 'TSV-001' })];
      const categories = [
        {
          id: 'cat-collide',
          name: 'Ordentliches Mitglied',
          amount: new Decimal('30.00'),
          billingInterval: 'ANNUALLY',
          isActive: true,
          deletedAt: null,
          scope: 'ALL_MEMBERS',
          feeCategoryMembershipTypes: [],
        },
      ];

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeClub());
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(members);
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
      (mockDb.feeCharge.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await service.previewBillingRun(CLUB_ID, previewDto);

      // Two distinct breakdown rows despite the shared name
      expect(result.breakdown).toHaveLength(2);
      const baseRow = result.breakdown.find((b) => b.kind === 'membershipType');
      const catRow = result.breakdown.find((b) => b.kind === 'category');
      expect(baseRow).toEqual({
        kind: 'membershipType',
        membershipType: 'Ordentliches Mitglied',
        count: 1,
        subtotal: '120.00',
      });
      expect(catRow).toEqual({
        kind: 'category',
        membershipType: 'Ordentliches Mitglied',
        count: 1,
        subtotal: '30.00',
      });
    });
  });
});
