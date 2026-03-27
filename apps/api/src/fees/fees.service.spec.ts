import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeesService } from './fees.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/client/index.js';

const { Decimal } = Prisma;

// Mock forClub() scoped DB — FeeCategory is tenant-scoped
const mockDb = {
  feeCategory: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(() => mockDb),
  member: {
    findFirst: vi.fn(),
  },
  memberFeeOverride: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
} as unknown as PrismaService;

const CLUB_ID = 'club-1';
const OTHER_CLUB_ID = 'club-2';

function makeCategory(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fc-1',
    clubId: CLUB_ID,
    name: 'Aufnahmegebuehr',
    description: null,
    amount: new Decimal('50.00'),
    billingInterval: 'ANNUALLY',
    isActive: true,
    isOneTime: true,
    sortOrder: 0,
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
    it('should return only active, non-deleted categories with Decimal as string', async () => {
      const categories = [
        makeCategory({ id: 'fc-1', name: 'Aufnahmegebuehr' }),
        makeCategory({ id: 'fc-2', name: 'Tennisabteilung', amount: new Decimal('120.00') }),
      ];
      (mockDb.feeCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(categories);

      const result = await service.findAll(CLUB_ID);

      expect(result).toHaveLength(2);
      expect(result[0]!.amount).toBe('50.00');
      expect(result[1]!.amount).toBe('120.00');
      expect(mockPrisma.forClub).toHaveBeenCalledWith(CLUB_ID);
      expect(mockDb.feeCategory.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
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
    it('should create a fee category and return with Decimal as string', async () => {
      const created = makeCategory({ id: 'fc-new' });
      (mockDb.feeCategory.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

      const result = await service.create(CLUB_ID, {
        name: 'Aufnahmegebuehr',
        amount: '50.00',
        billingInterval: 'ANNUALLY',
        isOneTime: true,
      });

      expect(result.id).toBe('fc-new');
      expect(result.amount).toBe('50.00');
      expect(mockDb.feeCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Aufnahmegebuehr',
          amount: expect.any(Decimal),
          billingInterval: 'ANNUALLY',
          isOneTime: true,
        }),
      });
    });
  });

  describe('update()', () => {
    it('should update fee category amount and return with Decimal as string', async () => {
      (mockDb.feeCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeCategory());
      (mockDb.feeCategory.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeCategory({ amount: new Decimal('75.00') })
      );

      const result = await service.update(CLUB_ID, 'fc-1', { amount: '75.00' });

      expect(result.amount).toBe('75.00');
    });

    it('should throw NotFoundException if category not found or deleted', async () => {
      (mockDb.feeCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.update(CLUB_ID, 'nonexistent', { name: 'X' })).rejects.toThrow(
        NotFoundException
      );
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
