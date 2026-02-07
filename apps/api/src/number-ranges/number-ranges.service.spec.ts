import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NumberRangesService } from './number-ranges.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

// Mock forClub() scoped DB
const mockDb = {
  numberRange: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(() => mockDb),
  numberRange: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
} as unknown as PrismaService;

describe('NumberRangesService', () => {
  let service: NumberRangesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NumberRangesService(mockPrisma);
  });

  describe('generateNext()', () => {
    it('should return formatted number with prefix and padding', async () => {
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
        const tx = {
          numberRange: {
            findFirst: vi.fn().mockResolvedValue({
              id: 'range-1',
              clubId: 'club-1',
              entityType: 'MEMBER',
              prefix: 'M-',
              padLength: 4,
              currentValue: 41,
              yearReset: false,
              lastResetYear: 2026,
            }),
            update: vi.fn().mockResolvedValue({
              id: 'range-1',
              prefix: 'M-',
              padLength: 4,
              currentValue: 42,
            }),
          },
        };
        return cb(tx);
      });

      const result = await service.generateNext('club-1', 'MEMBER');

      expect(result).toBe('M-0042');
    });

    it('should resolve {YYYY} to current year', async () => {
      const currentYear = new Date().getFullYear();
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
        const tx = {
          numberRange: {
            findFirst: vi.fn().mockResolvedValue({
              id: 'range-1',
              clubId: 'club-1',
              entityType: 'MEMBER',
              prefix: 'TSV-{YYYY}-',
              padLength: 3,
              currentValue: 0,
              yearReset: false,
              lastResetYear: currentYear,
            }),
            update: vi.fn().mockResolvedValue({
              id: 'range-1',
              prefix: 'TSV-{YYYY}-',
              padLength: 3,
              currentValue: 1,
            }),
          },
        };
        return cb(tx);
      });

      const result = await service.generateNext('club-1', 'MEMBER');

      expect(result).toBe(`TSV-${currentYear}-001`);
    });

    it('should zero-pad to configured padLength', async () => {
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
        const tx = {
          numberRange: {
            findFirst: vi.fn().mockResolvedValue({
              id: 'range-1',
              clubId: 'club-1',
              entityType: 'MEMBER',
              prefix: '',
              padLength: 6,
              currentValue: 4,
              yearReset: false,
              lastResetYear: 2026,
            }),
            update: vi.fn().mockResolvedValue({
              id: 'range-1',
              prefix: '',
              padLength: 6,
              currentValue: 5,
            }),
          },
        };
        return cb(tx);
      });

      const result = await service.generateNext('club-1', 'MEMBER');

      expect(result).toBe('000005');
    });

    it('should throw NotFoundException when range not found', async () => {
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
        const tx = {
          numberRange: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        };
        return cb(tx);
      });

      await expect(service.generateNext('club-1', 'MEMBER')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    it('should reject duplicate entityType for same club', async () => {
      mockDb.numberRange.findFirst.mockResolvedValue({
        id: 'range-1',
        entityType: 'MEMBER',
      });

      await expect(
        service.create('club-1', { entityType: 'MEMBER' } as never)
      ).rejects.toThrow(ConflictException);
    });

    it('should create range when entityType is unique', async () => {
      mockDb.numberRange.findFirst.mockResolvedValue(null);
      (mockPrisma.numberRange.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'range-1',
        entityType: 'MEMBER',
        prefix: 'M-',
        padLength: 4,
        yearReset: false,
      });

      const result = await service.create('club-1', {
        entityType: 'MEMBER',
        prefix: 'M-',
        padLength: 4,
      } as never);

      expect(result.entityType).toBe('MEMBER');
    });
  });

  describe('delete()', () => {
    it('should reject when currentValue > 0', async () => {
      mockDb.numberRange.findFirst.mockResolvedValue({
        id: 'range-1',
        currentValue: 5,
      });

      await expect(service.delete('club-1', 'range-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete when currentValue is 0', async () => {
      mockDb.numberRange.findFirst.mockResolvedValue({
        id: 'range-1',
        currentValue: 0,
      });
      mockDb.numberRange.delete.mockResolvedValue({});

      await service.delete('club-1', 'range-1');

      expect(mockDb.numberRange.delete).toHaveBeenCalledWith({
        where: { id: 'range-1' },
      });
    });

    it('should throw NotFoundException for non-existent range', async () => {
      mockDb.numberRange.findFirst.mockResolvedValue(null);

      await expect(service.delete('club-1', 'range-1')).rejects.toThrow(NotFoundException);
    });
  });
});
