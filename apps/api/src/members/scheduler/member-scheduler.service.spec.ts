import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberSchedulerService } from './member-scheduler.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { SystemUserService } from '../../common/services/system-user.service.js';

// Transaction client mock — receives all calls inside $transaction
const mockTx = {
  member: {
    update: vi.fn(),
  },
  membershipPeriod: {
    update: vi.fn(),
  },
};

const mockPrisma = {
  member: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  membershipPeriod: {
    update: vi.fn(),
  },
  $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
} as unknown as PrismaService;

const SYSTEM_USER_ID = 'system-user-uuid-123';
const mockSystemUserService = {
  getSystemUserId: vi.fn(() => SYSTEM_USER_ID),
} as unknown as SystemUserService;

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
    service = new MemberSchedulerService(mockPrisma, mockSystemUserService);
  });

  describe('handleCancellationTransitions()', () => {
    it('should find and transition expired members to LEFT', async () => {
      const member = makeMemberWithPeriod();
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([member]);
      mockTx.member.update.mockResolvedValue({});
      mockTx.membershipPeriod.update.mockResolvedValue({});

      await service.handleCancellationTransitions();

      expect(mockTx.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'member-1' },
          data: expect.objectContaining({
            status: 'LEFT',
            statusChangedBy: SYSTEM_USER_ID,
          }),
        })
      );
    });

    it('should close active membership periods', async () => {
      const member = makeMemberWithPeriod();
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([member]);
      mockTx.member.update.mockResolvedValue({});
      mockTx.membershipPeriod.update.mockResolvedValue({});

      await service.handleCancellationTransitions();

      expect(mockTx.membershipPeriod.update).toHaveBeenCalledWith(
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
      // First transaction fails, second succeeds
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockImplementationOnce(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx));
      mockTx.member.update.mockResolvedValue({});
      mockTx.membershipPeriod.update.mockResolvedValue({});

      // Should not throw, continues processing
      await expect(service.handleCancellationTransitions()).resolves.toBeUndefined();

      // $transaction should have been called for both members
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('should handle no expired members gracefully', async () => {
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(service.handleCancellationTransitions()).resolves.toBeUndefined();

      expect(mockPrisma.member.update).not.toHaveBeenCalled();
    });
  });
});
