import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberSchedulerService } from './member-scheduler.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  member: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  membershipPeriod: {
    update: vi.fn(),
  },
} as unknown as PrismaService;

function makeMemberWithPeriod(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    memberNumber: 'M-0001',
    clubId: 'club-1',
    status: 'ACTIVE',
    cancellationDate: new Date('2026-01-01'),
    deletedAt: null,
    membershipPeriods: [
      {
        id: 'period-1',
        leaveDate: null,
      },
    ],
    ...overrides,
  };
}

describe('MemberSchedulerService', () => {
  let service: MemberSchedulerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MemberSchedulerService(mockPrisma);
  });

  describe('handleCancellationTransitions()', () => {
    it('should find and transition expired members to LEFT', async () => {
      const member = makeMemberWithPeriod();
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([member]);
      (mockPrisma.member.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.membershipPeriod.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await service.handleCancellationTransitions();

      expect(mockPrisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'member-1' },
          data: expect.objectContaining({
            status: 'LEFT',
            statusChangedBy: 'SYSTEM',
          }),
        })
      );
    });

    it('should close active membership periods', async () => {
      const member = makeMemberWithPeriod();
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([member]);
      (mockPrisma.member.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.membershipPeriod.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await service.handleCancellationTransitions();

      expect(mockPrisma.membershipPeriod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'period-1' },
          data: { leaveDate: member.cancellationDate },
        })
      );
    });

    it('should continue on individual failure', async () => {
      const member1 = makeMemberWithPeriod({ id: 'member-1', memberNumber: 'M-0001' });
      const member2 = makeMemberWithPeriod({ id: 'member-2', memberNumber: 'M-0002' });
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        member1,
        member2,
      ]);
      // First member fails, second succeeds
      (mockPrisma.member.update as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({});
      (mockPrisma.membershipPeriod.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      // Should not throw, continues processing
      await expect(service.handleCancellationTransitions()).resolves.toBeUndefined();

      // Second member should still be processed
      expect(mockPrisma.member.update).toHaveBeenCalledTimes(2);
    });

    it('should handle no expired members gracefully', async () => {
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(service.handleCancellationTransitions()).resolves.toBeUndefined();

      expect(mockPrisma.member.update).not.toHaveBeenCalled();
    });
  });
});
