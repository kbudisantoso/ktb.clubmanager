import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeeTypesService } from './fee-types.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/client/index.js';

const { Decimal } = Prisma;

// Mock forClub() scoped DB — FeeType is tenant-scoped
const mockDb = {
  feeType: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(() => mockDb),
  membershipTypeFeeType: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
} as unknown as PrismaService;

const CLUB_ID = 'club-1';

function makeFeeType(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ft-1',
    clubId: CLUB_ID,
    name: 'Einzelbeitrag',
    description: null,
    isActive: true,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    membershipTypeFees: [],
    _count: { members: 0 },
    ...overrides,
  };
}

function makeCrossTableEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ct-1',
    membershipTypeId: 'mt-1',
    feeTypeId: 'ft-1',
    amount: new Decimal('120.00'),
    billingInterval: 'ANNUALLY',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    membershipType: { id: 'mt-1', name: 'Erwachsene' },
    feeType: { id: 'ft-1', name: 'Einzelbeitrag' },
    ...overrides,
  };
}

describe('FeeTypesService', () => {
  let service: FeeTypesService;

  beforeEach(() => {
    vi.clearAllMocks();
    (mockPrisma.forClub as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
    service = new FeeTypesService(mockPrisma);
  });

  // ─── FeeType CRUD ───────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all active, non-deleted fee types ordered by name', async () => {
      const feeTypes = [
        makeFeeType({ id: 'ft-1', name: 'Einzelbeitrag' }),
        makeFeeType({ id: 'ft-2', name: 'Familientarif' }),
      ];
      (mockDb.feeType.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(feeTypes);

      const result = await service.findAll(CLUB_ID);

      expect(result).toHaveLength(2);
      expect(mockPrisma.forClub).toHaveBeenCalledWith(CLUB_ID);
      expect(mockDb.feeType.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {
          membershipTypeFees: true,
          _count: { select: { members: true } },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should include membershipTypeFees relation count', async () => {
      const feeTypes = [
        makeFeeType({
          membershipTypeFees: [
            { id: 'ct-1', amount: new Decimal('120.00') },
            { id: 'ct-2', amount: new Decimal('60.00') },
          ],
        }),
      ];
      (mockDb.feeType.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(feeTypes);

      const result = await service.findAll(CLUB_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.membershipTypeFees).toHaveLength(2);
    });
  });

  describe('findOne()', () => {
    it('should return a single fee type', async () => {
      (mockDb.feeType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeFeeType());

      const result = await service.findOne(CLUB_ID, 'ft-1');

      expect(result.id).toBe('ft-1');
      expect(result.name).toBe('Einzelbeitrag');
    });

    it('should throw NotFoundException for non-existent fee type', async () => {
      (mockDb.feeType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findOne(CLUB_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    it('should create a fee type and return result', async () => {
      const created = makeFeeType({ id: 'ft-new' });
      (mockDb.feeType.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

      const result = await service.create(CLUB_ID, {
        name: 'Einzelbeitrag',
        description: 'Standard',
        isActive: true,
      });

      expect(result.id).toBe('ft-new');
      expect(result.name).toBe('Einzelbeitrag');
      expect(mockDb.feeType.create).toHaveBeenCalledWith({
        data: {
          name: 'Einzelbeitrag',
          description: 'Standard',
          isActive: true,
        } as Prisma.FeeTypeUncheckedCreateInput,
      });
    });

    it('should throw ConflictException on duplicate name within club', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.0.0',
      });
      (mockDb.feeType.create as ReturnType<typeof vi.fn>).mockRejectedValue(prismaError);

      await expect(service.create(CLUB_ID, { name: 'Einzelbeitrag' })).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('update()', () => {
    it('should update fee type fields and return result', async () => {
      (mockDb.feeType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeFeeType());
      (mockDb.feeType.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeFeeType({ name: 'Familientarif' })
      );

      const result = await service.update(CLUB_ID, 'ft-1', { name: 'Familientarif' });

      expect(result.name).toBe('Familientarif');
    });

    it('should throw NotFoundException for non-existent fee type', async () => {
      (mockDb.feeType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.update(CLUB_ID, 'nonexistent', { name: 'X' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('softDelete()', () => {
    it('should set deletedAt and deletedBy', async () => {
      (mockDb.feeType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeFeeType());
      (mockDb.feeType.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeFeeType({ deletedAt: new Date(), deletedBy: 'user-1' })
      );

      await service.softDelete(CLUB_ID, 'ft-1', 'user-1');

      expect(mockDb.feeType.update).toHaveBeenCalledWith({
        where: { id: 'ft-1' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: 'user-1',
        },
      });
    });

    it('should still soft-delete when assigned to members (D-10)', async () => {
      (mockDb.feeType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeFeeType({ _count: { members: 5 } })
      );
      (mockDb.feeType.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeFeeType({ deletedAt: new Date(), deletedBy: 'user-1' })
      );

      await service.softDelete(CLUB_ID, 'ft-1', 'user-1');

      expect(mockDb.feeType.update).toHaveBeenCalledWith({
        where: { id: 'ft-1' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: 'user-1',
        },
      });
    });

    it('should throw NotFoundException if fee type not found', async () => {
      (mockDb.feeType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.softDelete(CLUB_ID, 'nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ─── Cross-Table CRUD ───────────────────────────────────────────────

  describe('findCrossTable()', () => {
    it('should return full matrix of MembershipType x FeeType entries', async () => {
      const entries = [
        makeCrossTableEntry({ id: 'ct-1' }),
        makeCrossTableEntry({ id: 'ct-2', amount: new Decimal('60.00') }),
      ];
      (mockPrisma.membershipTypeFeeType.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        entries
      );

      const result = await service.findCrossTable(CLUB_ID);

      expect(result).toHaveLength(2);
      expect(result[0]!.amount).toBe('120.00');
      expect(result[1]!.amount).toBe('60.00');
      expect(mockPrisma.membershipTypeFeeType.findMany).toHaveBeenCalledWith({
        where: {
          feeType: { clubId: CLUB_ID, deletedAt: null },
        },
        include: {
          membershipType: { select: { id: true, name: true } },
          feeType: { select: { id: true, name: true } },
        },
      });
    });
  });

  describe('upsertCrossTableEntry()', () => {
    it('should upsert a cross-table entry', async () => {
      const entry = makeCrossTableEntry();
      (mockPrisma.membershipTypeFeeType.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(
        entry
      );

      const result = await service.upsertCrossTableEntry({
        membershipTypeId: 'mt-1',
        feeTypeId: 'ft-1',
        amount: '120.00',
        billingInterval: 'ANNUALLY',
      });

      expect(result.amount).toBe('120.00');
      expect(mockPrisma.membershipTypeFeeType.upsert).toHaveBeenCalledWith({
        where: {
          membershipTypeId_feeTypeId: {
            membershipTypeId: 'mt-1',
            feeTypeId: 'ft-1',
          },
        },
        update: {
          amount: expect.any(Decimal),
          billingInterval: 'ANNUALLY',
        },
        create: {
          membershipTypeId: 'mt-1',
          feeTypeId: 'ft-1',
          amount: expect.any(Decimal),
          billingInterval: 'ANNUALLY',
        },
      });
    });

    it('should accept amount "0.00" (Beitragsfrei)', async () => {
      const entry = makeCrossTableEntry({ amount: new Decimal('0.00') });
      (mockPrisma.membershipTypeFeeType.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(
        entry
      );

      const result = await service.upsertCrossTableEntry({
        membershipTypeId: 'mt-1',
        feeTypeId: 'ft-1',
        amount: '0.00',
      });

      expect(result.amount).toBe('0.00');
    });
  });

  describe('deleteCrossTableEntry()', () => {
    it('should delete a cross-table entry by id', async () => {
      (mockPrisma.membershipTypeFeeType.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await service.deleteCrossTableEntry('ct-1');

      expect(mockPrisma.membershipTypeFeeType.delete).toHaveBeenCalledWith({
        where: { id: 'ct-1' },
      });
    });
  });
});
