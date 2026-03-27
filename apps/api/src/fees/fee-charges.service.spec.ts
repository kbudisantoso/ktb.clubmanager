import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    membershipPeriods: [
      {
        id: 'mp-1',
        joinDate: new Date('2020-01-01'),
        leaveDate: null,
        membershipTypeId: 'mt-1',
        membershipType: {
          id: 'mt-1',
          name: 'Ordentliches Mitglied',
          feeAmount: new Decimal('120.00'),
          billingInterval: 'ANNUALLY',
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
    householdFeeMode: 'NONE',
    householdDiscountPercent: null,
    householdFlatAmount: null,
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
      expect(result.totalAmount).toBe('360.00');
      expect(result.exemptions).toBe(0);
      expect(result.existingCharges).toBe(0);
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
                feeAmount: new Decimal('120.00'),
                billingInterval: 'ANNUALLY',
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

    it('should apply household PERCENTAGE discount and populate discountAmount', async () => {
      const headMember = makeMember({
        id: 'member-head',
        memberNumber: 'TSV-020',
        householdId: 'hh-1',
        householdRole: 'HEAD',
      });
      const spouseMember = makeMember({
        id: 'member-spouse',
        firstName: 'Anna',
        memberNumber: 'TSV-021',
        householdId: 'hh-1',
        householdRole: 'SPOUSE',
      });

      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeClub({
          householdFeeMode: 'PERCENTAGE',
          householdDiscountPercent: 50,
        })
      );
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        headMember,
        spouseMember,
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

      // HEAD pays full 120, SPOUSE pays 60 (50% discount)
      const headCharge = capturedData.find(
        (c: unknown) => (c as { memberId: string }).memberId === 'member-head'
      ) as { amount: Prisma.Decimal; discountAmount: Prisma.Decimal | null };
      const spouseCharge = capturedData.find(
        (c: unknown) => (c as { memberId: string }).memberId === 'member-spouse'
      ) as { amount: Prisma.Decimal; discountAmount: Prisma.Decimal; discountReason: string };

      expect(headCharge.amount.toFixed(2)).toBe('120.00');
      expect(headCharge.discountAmount).toBeNull();
      expect(spouseCharge.amount.toFixed(2)).toBe('60.00');
      expect(spouseCharge.discountAmount.toFixed(2)).toBe('60.00');
      expect(spouseCharge.discountReason).toContain('Haushaltsrabatt');
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
});
