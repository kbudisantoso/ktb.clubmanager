import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MembershipPeriodsService } from './membership-periods.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock forClub() scoped DB
const mockDb = {
  member: {
    findFirst: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(() => mockDb),
  membershipPeriod: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaService;

function makePeriod(overrides: Record<string, unknown> = {}) {
  return {
    id: 'period-1',
    memberId: 'member-1',
    joinDate: new Date('2025-01-01'),
    leaveDate: null,
    membershipType: 'FULL',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MembershipPeriodsService', () => {
  let service: MembershipPeriodsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MembershipPeriodsService(mockPrisma);
  });

  describe('create()', () => {
    it('should create period for member', async () => {
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });
      (mockPrisma.membershipPeriod.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null); // no open period
      (mockPrisma.membershipPeriod.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]); // no overlap
      (mockPrisma.membershipPeriod.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        makePeriod()
      );

      const result = await service.create('club-1', 'member-1', {
        joinDate: '2025-01-01',
        membershipType: 'FULL',
      } as never);

      expect(result.joinDate).toBe('2025-01-01');
      expect(result.membershipType).toBe('FULL');
    });

    it('should throw when open period exists', async () => {
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });
      (mockPrisma.membershipPeriod.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        makePeriod() // open period (leaveDate=null)
      );

      await expect(
        service.create('club-1', 'member-1', {
          joinDate: '2025-06-01',
          membershipType: 'FULL',
        } as never)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for overlapping periods', async () => {
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });
      (mockPrisma.membershipPeriod.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockPrisma.membershipPeriod.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        makePeriod({
          joinDate: new Date('2024-01-01'),
          leaveDate: new Date('2025-06-30'),
        }),
      ]);

      await expect(
        service.create('club-1', 'member-1', {
          joinDate: '2025-01-01',
          membershipType: 'FULL',
          leaveDate: '2025-12-31',
        } as never)
      ).rejects.toThrow(BadRequestException);
    });

    it('should create second period after closing first', async () => {
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });
      (mockPrisma.membershipPeriod.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null); // no open period
      (mockPrisma.membershipPeriod.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        makePeriod({
          joinDate: new Date('2024-01-01'),
          leaveDate: new Date('2024-12-31'), // closed
        }),
      ]);
      (mockPrisma.membershipPeriod.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        makePeriod({ id: 'period-2', joinDate: new Date('2025-06-01') })
      );

      const result = await service.create('club-1', 'member-1', {
        joinDate: '2025-06-01',
        membershipType: 'FULL',
      } as never);

      expect(result.joinDate).toBe('2025-06-01');
    });

    it('should throw for non-existent member', async () => {
      mockDb.member.findFirst.mockResolvedValue(null);

      await expect(
        service.create('club-1', 'member-99', {
          joinDate: '2025-01-01',
          membershipType: 'FULL',
        } as never)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('closePeriod()', () => {
    it('should close open period with leaveDate', async () => {
      (mockPrisma.membershipPeriod.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        makePeriod({ member: { id: 'member-1' } })
      );
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });
      (mockPrisma.membershipPeriod.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        makePeriod({ leaveDate: new Date('2025-12-31') })
      );

      const result = await service.closePeriod('club-1', 'period-1', '2025-12-31');

      expect(result.leaveDate).toBe('2025-12-31');
    });

    it('should throw when leaveDate before joinDate', async () => {
      (mockPrisma.membershipPeriod.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        makePeriod({
          joinDate: new Date('2025-06-01'),
          member: { id: 'member-1' },
        })
      );
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });

      await expect(
        service.closePeriod('club-1', 'period-1', '2025-01-01')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when period already closed', async () => {
      (mockPrisma.membershipPeriod.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        makePeriod({
          leaveDate: new Date('2025-06-30'),
          member: { id: 'member-1' },
        })
      );
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });

      await expect(
        service.closePeriod('club-1', 'period-1', '2025-12-31')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
