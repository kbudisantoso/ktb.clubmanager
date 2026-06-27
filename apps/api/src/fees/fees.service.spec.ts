import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeesService } from './fees.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/client/index.js';

const { Decimal } = Prisma;

// Mock forClub() scoped DB — FeeCategory is tenant-scoped
const mockDb = {
  feeCategory: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

// Join-table mock (tenant-unscoped delegate) — typed so tests call .mockResolvedValue without casts
const mockJoinTable = {
  createMany: vi.fn(),
  deleteMany: vi.fn(),
};

const mockPrisma = {
  forClub: vi.fn(() => mockDb),
  // tx-based writes (CR-03) call tx.feeCategory.* — point at the same mock
  // functions used by the forClub-scoped mockDb so existing setups apply.
  feeCategory: mockDb.feeCategory,
  member: {
    findFirst: vi.fn(),
  },
  memberFeeOverride: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  feeCategoryMembershipType: mockJoinTable,
  $transaction: vi.fn(),
} as unknown as PrismaService;

const CLUB_ID = 'club-1';
const OTHER_CLUB_ID = 'club-2';

function makeCategory(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fc-1',
    clubId: CLUB_ID,
    name: 'Aufnahmegebühr',
    description: null,
    amount: new Decimal('50.00'),
    billingInterval: 'ANNUALLY',
    isActive: true,
    isOneTime: true,
    sortOrder: 0,
    scope: 'ALL_MEMBERS',
    feeCategoryMembershipTypes: [],
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('FeesService', () => {
  let service: FeesService;

  beforeEach(() => {
    vi.clearAllMocks();
    (mockPrisma.forClub as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
    service = new FeesService(mockPrisma);
  });

  describe('findAll()', () => {
    it('should return only active, non-deleted categories with Decimal as string and scope', async () => {
      const categories = [
        makeCategory({ id: 'fc-1', name: 'Aufnahmegebühr' }),
        makeCategory({ id: 'fc-2', name: 'Tennisabteilung', amount: new Decimal('120.00') }),
      ];
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(categories);

      const result = await service.findAll(CLUB_ID);

      expect(result).toHaveLength(2);
      expect(result[0]!.amount).toBe('50.00');
      expect(result[0]!.scope).toBe('ALL_MEMBERS');
      expect(result[0]!.membershipTypes).toEqual([]);
      expect(result[1]!.amount).toBe('120.00');
      expect(mockPrisma.forClub).toHaveBeenCalledWith(CLUB_ID);
      expect(mockDb.feeCategory.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { feeCategoryMembershipTypes: true },
      });
    });
  });

  describe('findOne()', () => {
    it('should return a single category with Decimal as string', async () => {
      (mockDb.feeCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeCategory());

      const result = await service.findOne(CLUB_ID, 'fc-1');

      expect(result.amount).toBe('50.00');
      expect(result.id).toBe('fc-1');
    });

    it('should throw NotFoundException for non-existent or deleted category', async () => {
      (mockDb.feeCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findOne(CLUB_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    beforeEach(() => {
      // Default transaction mock — runs the callback with mockPrisma as tx
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)
      );
    });

    it('should create a fee category and return with Decimal as string', async () => {
      const created = makeCategory({ id: 'fc-new' });
      (mockDb.feeCategory.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);
      (mockDb.feeCategory.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(created);

      const result = await service.create(CLUB_ID, {
        name: 'Aufnahmegebühr',
        amount: '50.00',
        billingInterval: 'ANNUALLY',
        isOneTime: true,
      });

      expect(result.id).toBe('fc-new');
      expect(result.amount).toBe('50.00');
      expect(result.scope).toBe('ALL_MEMBERS');
      expect(result.membershipTypes).toEqual([]);
      expect(mockDb.feeCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Aufnahmegebühr',
          amount: expect.any(Decimal),
          billingInterval: 'ANNUALLY',
          isOneTime: true,
          scope: 'ALL_MEMBERS',
        }),
      });
    });

    it('should create join records when scope is BY_MEMBERSHIP_TYPE', async () => {
      const created = makeCategory({
        id: 'fc-mt',
        scope: 'BY_MEMBERSHIP_TYPE',
        feeCategoryMembershipTypes: [
          { id: 'fcmt-1', feeCategoryId: 'fc-mt', membershipTypeId: 'mt-1' },
        ],
      });
      (mockDb.feeCategory.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);
      (mockDb.feeCategory.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(created);
      mockJoinTable.createMany.mockResolvedValue({ count: 1 });

      const result = await service.create(CLUB_ID, {
        name: 'Tennisabteilung',
        amount: '50.00',
        scope: 'BY_MEMBERSHIP_TYPE' as 'ALL_MEMBERS' | 'BY_MEMBERSHIP_TYPE' | 'INDIVIDUAL',
        membershipTypeIds: ['mt-1'],
      });

      expect(result.scope).toBe('BY_MEMBERSHIP_TYPE');
      expect(result.membershipTypes).toHaveLength(1);
      expect(mockJoinTable.createMany).toHaveBeenCalledWith({
        data: [{ feeCategoryId: 'fc-mt', membershipTypeId: 'mt-1' }],
      });
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)
      );
    });

    it('should update fee category amount and return with Decimal as string', async () => {
      const updated = makeCategory({ amount: new Decimal('75.00') });
      (mockDb.feeCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeCategory());
      (mockDb.feeCategory.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
      (mockDb.feeCategory.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await service.update(CLUB_ID, 'fc-1', { amount: '75.00' });

      expect(result.amount).toBe('75.00');
    });

    it('should throw NotFoundException if category not found or deleted', async () => {
      (mockDb.feeCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.update(CLUB_ID, 'nonexistent', { name: 'X' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('should update scope and manage join records', async () => {
      const updated = makeCategory({
        scope: 'BY_MEMBERSHIP_TYPE',
        feeCategoryMembershipTypes: [
          { id: 'fcmt-1', feeCategoryId: 'fc-1', membershipTypeId: 'mt-1' },
        ],
      });
      (mockDb.feeCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeCategory());
      (mockDb.feeCategory.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
      (mockDb.feeCategory.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
      mockJoinTable.deleteMany.mockResolvedValue({ count: 0 });
      mockJoinTable.createMany.mockResolvedValue({ count: 1 });

      const result = await service.update(CLUB_ID, 'fc-1', {
        scope: 'BY_MEMBERSHIP_TYPE' as 'ALL_MEMBERS' | 'BY_MEMBERSHIP_TYPE' | 'INDIVIDUAL',
        membershipTypeIds: ['mt-1'],
      });

      expect(result.scope).toBe('BY_MEMBERSHIP_TYPE');
      expect(result.membershipTypes).toHaveLength(1);
    });
  });

  describe('softDelete()', () => {
    it('should set deletedAt and deletedBy', async () => {
      (mockDb.feeCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeCategory());
      const now = new Date();
      (mockDb.feeCategory.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeCategory({ deletedAt: now, deletedBy: 'user-1' })
      );

      await service.softDelete(CLUB_ID, 'fc-1', 'user-1');

      expect(mockDb.feeCategory.update).toHaveBeenCalledWith({
        where: { id: 'fc-1' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: 'user-1',
        },
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      (mockDb.feeCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.softDelete(CLUB_ID, 'nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should exclude soft-deleted categories from findAll', async () => {
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.findAll(CLUB_ID);

      expect(result).toHaveLength(0);
      expect(mockDb.feeCategory.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { feeCategoryMembershipTypes: true },
      });
    });
  });

  describe('createOverride()', () => {
    it('should create a member fee override with EXEMPT type', async () => {
      // Member belongs to this club
      (mockPrisma.member.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'member-1',
        clubId: CLUB_ID,
      });
      (mockPrisma.memberFeeOverride.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'override-1',
        memberId: 'member-1',
        overrideType: 'EXEMPT',
        customAmount: null,
        reason: 'Ehrenmitglied',
        isBaseFee: true,
        feeCategoryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createOverride(CLUB_ID, {
        memberId: 'member-1',
        overrideType: 'EXEMPT',
        reason: 'Ehrenmitglied',
        isBaseFee: true,
      });

      expect(result.id).toBe('override-1');
      expect(result.overrideType).toBe('EXEMPT');
    });

    it('should create a member fee override with CUSTOM_AMOUNT and store amount as string', async () => {
      (mockPrisma.member.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'member-1',
        clubId: CLUB_ID,
      });
      // feeCategoryId is set -> club ownership lookup must succeed
      (mockDb.feeCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeCategory({ id: 'fc-1' })
      );
      (mockPrisma.memberFeeOverride.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'override-2',
        memberId: 'member-1',
        overrideType: 'CUSTOM_AMOUNT',
        customAmount: new Decimal('25.00'),
        reason: 'Sozialtarif',
        isBaseFee: false,
        feeCategoryId: 'fc-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createOverride(CLUB_ID, {
        memberId: 'member-1',
        overrideType: 'CUSTOM_AMOUNT',
        customAmount: '25.00',
        feeCategoryId: 'fc-1',
        reason: 'Sozialtarif',
      });

      expect(result.id).toBe('override-2');
      expect(result.customAmount).toBe('25.00');
    });

    it('should reject a feeCategoryId belonging to a different club (CR-02 tenant isolation)', async () => {
      // Member belongs to this club...
      (mockPrisma.member.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'member-1',
        clubId: CLUB_ID,
      });
      // ...but the fee category lookup scoped to this club finds nothing
      (mockDb.feeCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.createOverride(CLUB_ID, {
          memberId: 'member-1',
          overrideType: 'CUSTOM_AMOUNT',
          customAmount: '25.00',
          feeCategoryId: 'fc-other-club',
          reason: 'Sozialtarif',
        })
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.memberFeeOverride.create).not.toHaveBeenCalled();
    });

    it('should reject memberId belonging to a different club (tenant isolation)', async () => {
      // Member belongs to a DIFFERENT club
      (mockPrisma.member.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.createOverride(CLUB_ID, {
          memberId: 'member-other-club',
          overrideType: 'EXEMPT',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOverridesForMember()', () => {
    it('should return all overrides for a specific member with Decimal serialized', async () => {
      (mockPrisma.member.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'member-1',
        clubId: CLUB_ID,
      });
      (mockPrisma.memberFeeOverride.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'override-1',
          memberId: 'member-1',
          overrideType: 'EXEMPT',
          customAmount: null,
          reason: 'Ehrenmitglied',
          isBaseFee: true,
          feeCategoryId: null,
          feeCategory: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'override-2',
          memberId: 'member-1',
          overrideType: 'CUSTOM_AMOUNT',
          customAmount: new Decimal('25.00'),
          reason: 'Sozialtarif',
          isBaseFee: false,
          feeCategoryId: 'fc-1',
          feeCategory: { id: 'fc-1', name: 'Tennisabteilung' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.findOverridesForMember(CLUB_ID, 'member-1');

      expect(result).toHaveLength(2);
      expect(result[0]!.customAmount).toBeNull();
      expect(result[1]!.customAmount).toBe('25.00');
    });

    it('should reject if member belongs to different club', async () => {
      (mockPrisma.member.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findOverridesForMember(CLUB_ID, 'member-other')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('deleteOverride()', () => {
    it('should hard-delete an override', async () => {
      (mockPrisma.memberFeeOverride.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'override-1',
        memberId: 'member-1',
        member: { id: 'member-1', clubId: CLUB_ID },
      });
      (mockPrisma.memberFeeOverride.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await service.deleteOverride(CLUB_ID, 'override-1');

      expect(mockPrisma.memberFeeOverride.delete).toHaveBeenCalledWith({
        where: { id: 'override-1' },
      });
    });

    it('should reject overrideId belonging to a member in a different club (tenant isolation)', async () => {
      (mockPrisma.memberFeeOverride.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'override-1',
        memberId: 'member-other',
        member: { id: 'member-other', clubId: OTHER_CLUB_ID },
      });

      await expect(service.deleteOverride(CLUB_ID, 'override-1')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException if override does not exist', async () => {
      (mockPrisma.memberFeeOverride.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.deleteOverride(CLUB_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
