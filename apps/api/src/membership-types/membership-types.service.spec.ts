import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MembershipTypesService } from './membership-types.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

const mockPrisma = {
  membershipType: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  membershipPeriod: {
    count: vi.fn(),
  },
  $transaction: vi.fn(),
} as unknown as PrismaService;

const CLUB_ID = 'club-1';

describe('MembershipTypesService', () => {
  let service: MembershipTypesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MembershipTypesService(mockPrisma);
  });

  describe('findAll()', () => {
    it('should return all types for a club ordered by sortOrder then name', async () => {
      const mockTypes = [
        { id: 'mt-1', name: 'Ordentliches Mitglied', code: 'ORDENTLICH', sortOrder: 0 },
        { id: 'mt-2', name: 'Passives Mitglied', code: 'PASSIV', sortOrder: 1 },
      ];
      (mockPrisma.membershipType.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockTypes);

      const result = await service.findAll(CLUB_ID);

      expect(result).toEqual(mockTypes);
      expect(mockPrisma.membershipType.findMany).toHaveBeenCalledWith({
        where: { clubId: CLUB_ID },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('findOne()', () => {
    it('should return a specific type', async () => {
      const mockType = {
        id: 'mt-1',
        name: 'Ordentliches Mitglied',
        code: 'ORDENTLICH',
      };
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockType);

      const result = await service.findOne(CLUB_ID, 'mt-1');

      expect(result).toEqual(mockType);
      expect(mockPrisma.membershipType.findFirst).toHaveBeenCalledWith({
        where: { id: 'mt-1', clubId: CLUB_ID },
      });
    });

    it('should throw NotFoundException for non-existent type', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findOne(CLUB_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    it('should create a new membership type with explicit clubId', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockPrisma.membershipType.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mt-new',
        clubId: CLUB_ID,
        name: 'Testmitglied',
        code: 'TEST',
        isDefault: false,
        sortOrder: 5,
        isActive: true,
        vote: true,
        assemblyAttendance: true,
        eligibleForOffice: true,
      });

      const result = await service.create(CLUB_ID, {
        name: 'Testmitglied',
        code: 'TEST',
      });

      expect(result.code).toBe('TEST');
      expect(result.clubId).toBe(CLUB_ID);
      expect(mockPrisma.membershipType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clubId: CLUB_ID,
          name: 'Testmitglied',
          code: 'TEST',
        }),
      });
    });

    it('should throw ConflictException for duplicate code within club', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mt-1',
        code: 'ORDENTLICH',
      });

      await expect(
        service.create(CLUB_ID, { name: 'Duplicate', code: 'ORDENTLICH' })
      ).rejects.toThrow(ConflictException);
    });

    it('should unset existing default when creating with isDefault=true', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockPrisma.membershipType.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
      });
      (mockPrisma.membershipType.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mt-new',
        clubId: CLUB_ID,
        name: 'New Default',
        code: 'NEW_DEFAULT',
        isDefault: true,
      });

      await service.create(CLUB_ID, {
        name: 'New Default',
        code: 'NEW_DEFAULT',
        isDefault: true,
      });

      expect(mockPrisma.membershipType.updateMany).toHaveBeenCalledWith({
        where: { clubId: CLUB_ID, isDefault: true },
        data: { isDefault: false },
      });
    });

    it('should NOT unset existing default when creating with isDefault=false', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockPrisma.membershipType.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mt-new',
        clubId: CLUB_ID,
        name: 'Non Default',
        code: 'NON_DEFAULT',
        isDefault: false,
      });

      await service.create(CLUB_ID, {
        name: 'Non Default',
        code: 'NON_DEFAULT',
        isDefault: false,
      });

      expect(mockPrisma.membershipType.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('should update fields', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mt-1',
        name: 'Old Name',
        code: 'OLD',
        isDefault: false,
      });
      (mockPrisma.membershipType.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mt-1',
        name: 'New Name',
        code: 'OLD',
        isDefault: false,
      });

      const result = await service.update(CLUB_ID, 'mt-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(mockPrisma.membershipType.update).toHaveBeenCalledWith({
        where: { id: 'mt-1' },
        data: { name: 'New Name' },
      });
    });

    it('should throw NotFoundException for non-existent type', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.update(CLUB_ID, 'nonexistent', { name: 'X' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ConflictException when updating code to existing value', async () => {
      // First call: find the entity being updated
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: 'mt-1',
          name: 'Type A',
          code: 'TYPE_A',
          isDefault: false,
        })
        // Second call: check for duplicate code
        .mockResolvedValueOnce({
          id: 'mt-2',
          code: 'TYPE_B',
        });

      await expect(service.update(CLUB_ID, 'mt-1', { code: 'TYPE_B' })).rejects.toThrow(
        ConflictException
      );
    });

    it('should use transaction when setting isDefault=true to unset existing default', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mt-2',
        name: 'Passiv',
        code: 'PASSIV',
        isDefault: false,
      });

      const txUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
      const txUpdate = vi.fn().mockResolvedValue({
        id: 'mt-2',
        name: 'Passiv',
        code: 'PASSIV',
        isDefault: true,
      });

      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
        const tx = {
          membershipType: {
            updateMany: txUpdateMany,
            update: txUpdate,
          },
        };
        return cb(tx);
      });

      const result = await service.update(CLUB_ID, 'mt-2', { isDefault: true });

      expect(result.isDefault).toBe(true);
      expect(txUpdateMany).toHaveBeenCalledWith({
        where: { clubId: CLUB_ID, isDefault: true },
        data: { isDefault: false },
      });
      expect(txUpdate).toHaveBeenCalledWith({
        where: { id: 'mt-2' },
        data: expect.objectContaining({ isDefault: true }),
      });
    });

    it('should NOT use transaction when isDefault is not being set to true', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mt-1',
        name: 'Old',
        code: 'OLD',
        isDefault: true,
      });
      (mockPrisma.membershipType.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mt-1',
        name: 'Updated',
        code: 'OLD',
        isDefault: true,
      });

      await service.update(CLUB_ID, 'mt-1', { name: 'Updated' });

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('remove()', () => {
    it('should delete a type not in use', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mt-1',
        name: 'Test',
        code: 'TEST',
      });
      (mockPrisma.membershipPeriod.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (mockPrisma.membershipType.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await service.remove(CLUB_ID, 'mt-1');

      expect(mockPrisma.membershipType.delete).toHaveBeenCalledWith({
        where: { id: 'mt-1' },
      });
    });

    it('should throw BadRequestException when type has membership periods', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'mt-1',
        name: 'Test',
        code: 'TEST',
      });
      (mockPrisma.membershipPeriod.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);

      await expect(service.remove(CLUB_ID, 'mt-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.membershipType.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent type', async () => {
      (mockPrisma.membershipType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.remove(CLUB_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('seedDefaults()', () => {
    it('should create 5 default types', async () => {
      (mockPrisma.membershipType.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 5,
      });

      await service.seedDefaults(CLUB_ID);

      expect(mockPrisma.membershipType.createMany).toHaveBeenCalledTimes(1);
      const call = (mockPrisma.membershipType.createMany as ReturnType<typeof vi.fn>).mock
        .calls[0]![0];
      expect(call.data).toHaveLength(5);
    });

    it('should set ORDENTLICH as the default (isDefault=true)', async () => {
      (mockPrisma.membershipType.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 5,
      });

      await service.seedDefaults(CLUB_ID);

      const call = (mockPrisma.membershipType.createMany as ReturnType<typeof vi.fn>).mock
        .calls[0]![0];
      const ordentlich = call.data.find((d: { code: string }) => d.code === 'ORDENTLICH');
      expect(ordentlich).toBeDefined();
      expect(ordentlich.isDefault).toBe(true);

      // All others should not be default
      const others = call.data.filter((d: { code: string }) => d.code !== 'ORDENTLICH');
      for (const other of others) {
        expect(other.isDefault).toBe(false);
      }
    });

    it('should include all 5 standard German membership types', async () => {
      (mockPrisma.membershipType.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 5,
      });

      await service.seedDefaults(CLUB_ID);

      const call = (mockPrisma.membershipType.createMany as ReturnType<typeof vi.fn>).mock
        .calls[0]![0];
      const codes = call.data.map((d: { code: string }) => d.code);
      expect(codes).toContain('ORDENTLICH');
      expect(codes).toContain('PASSIV');
      expect(codes).toContain('EHREN');
      expect(codes).toContain('FOERDER');
      expect(codes).toContain('JUGEND');
    });

    it('should set clubId on all seeded types', async () => {
      (mockPrisma.membershipType.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 5,
      });

      await service.seedDefaults(CLUB_ID);

      const call = (mockPrisma.membershipType.createMany as ReturnType<typeof vi.fn>).mock
        .calls[0]![0];
      for (const item of call.data) {
        expect(item.clubId).toBe(CLUB_ID);
      }
    });
  });
});
