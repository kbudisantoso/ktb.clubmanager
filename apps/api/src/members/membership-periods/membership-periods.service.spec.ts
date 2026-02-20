import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MembershipPeriodsService } from './membership-periods.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock forClub() scoped DB — all membershipPeriod calls now go through db
const mockDb = {
  member: {
    findFirst: vi.fn(),
  },
  membershipPeriod: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(() => mockDb),
} as unknown as PrismaService;

function makePeriod(overrides: Record<string, unknown> = {}) {
  return {
    id: 'period-1',
    memberId: 'member-1',
    joinDate: new Date('2025-01-01'),
    leaveDate: null,
    membershipTypeId: 'type-1',
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
      mockDb.membershipPeriod.findFirst.mockResolvedValue(null); // no open period
      mockDb.membershipPeriod.findMany.mockResolvedValue([]); // no overlap
      mockDb.membershipPeriod.create.mockResolvedValue(makePeriod());

      const result = await service.create('club-1', 'member-1', {
        joinDate: '2025-01-01',
        membershipTypeId: 'type-1',
      } as never);

      expect(result.joinDate).toBe('2025-01-01');
      expect(result.membershipTypeId).toBe('type-1');
    });

    it('should throw when open period exists', async () => {
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });
      mockDb.membershipPeriod.findFirst.mockResolvedValue(
        makePeriod() // open period (leaveDate=null)
      );

      await expect(
        service.create('club-1', 'member-1', {
          joinDate: '2025-06-01',
          membershipTypeId: 'type-1',
        } as never)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for overlapping periods', async () => {
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });
      mockDb.membershipPeriod.findFirst.mockResolvedValue(null);
      mockDb.membershipPeriod.findMany.mockResolvedValue([
        makePeriod({
          joinDate: new Date('2024-01-01'),
          leaveDate: new Date('2025-06-30'),
        }),
      ]);

      await expect(
        service.create('club-1', 'member-1', {
          joinDate: '2025-01-01',
          membershipTypeId: 'type-1',
          leaveDate: '2025-12-31',
        } as never)
      ).rejects.toThrow(BadRequestException);
    });

    it('should create second period after closing first', async () => {
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });
      mockDb.membershipPeriod.findFirst.mockResolvedValue(null); // no open period
      mockDb.membershipPeriod.findMany.mockResolvedValue([
        makePeriod({
          joinDate: new Date('2024-01-01'),
          leaveDate: new Date('2024-12-31'), // closed
        }),
      ]);
      mockDb.membershipPeriod.create.mockResolvedValue(
        makePeriod({ id: 'period-2', joinDate: new Date('2025-06-01') })
      );

      const result = await service.create('club-1', 'member-1', {
        joinDate: '2025-06-01',
        membershipTypeId: 'type-1',
      } as never);

      expect(result.joinDate).toBe('2025-06-01');
    });

    it('should throw for non-existent member', async () => {
      mockDb.member.findFirst.mockResolvedValue(null);

      await expect(
        service.create('club-1', 'member-99', {
          joinDate: '2025-01-01',
          membershipTypeId: 'type-1',
        } as never)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('closePeriod()', () => {
    it('should close open period with leaveDate', async () => {
      mockDb.membershipPeriod.findUnique.mockResolvedValue(
        makePeriod({ member: { id: 'member-1' } })
      );
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });
      mockDb.membershipPeriod.update.mockResolvedValue(
        makePeriod({ leaveDate: new Date('2025-12-31') })
      );

      const result = await service.closePeriod('club-1', 'period-1', '2025-12-31');

      expect(result.leaveDate).toBe('2025-12-31');
    });

    it('should throw when leaveDate before joinDate', async () => {
      mockDb.membershipPeriod.findUnique.mockResolvedValue(
        makePeriod({
          joinDate: new Date('2025-06-01'),
          member: { id: 'member-1' },
        })
      );
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });

      await expect(service.closePeriod('club-1', 'period-1', '2025-01-01')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw when period already closed', async () => {
      mockDb.membershipPeriod.findUnique.mockResolvedValue(
        makePeriod({
          leaveDate: new Date('2025-06-30'),
          member: { id: 'member-1' },
        })
      );
      mockDb.member.findFirst.mockResolvedValue({ id: 'member-1', deletedAt: null });

      await expect(service.closePeriod('club-1', 'period-1', '2025-12-31')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
