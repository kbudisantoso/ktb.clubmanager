import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberSchedulerService } from './member-scheduler.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { SystemUserService } from '../../common/services/system-user.service.js';
import type { MemberStatusService } from '../member-status.service.js';

const SYSTEM_USER_ID = 'system-user-uuid-123';

const mockTransitionDeleteMany = vi.fn();

const mockPrisma = {
  member: {
    findMany: vi.fn(),
  },
  memberStatusTransition: {
    deleteMany: mockTransitionDeleteMany,
  },
} as unknown as PrismaService;

const mockSystemUserService = {
  getSystemUserId: vi.fn(() => SYSTEM_USER_ID),
} as unknown as SystemUserService;

const mockMemberStatusService = {
  changeStatus: vi.fn(),
} as unknown as MemberStatusService;

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    memberNumber: 'M-0001',
    clubId: 'club-1',
    status: 'ACTIVE',
    cancellationDate: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

describe('MemberSchedulerService', () => {
  let service: MemberSchedulerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MemberSchedulerService(
      mockPrisma,
      mockSystemUserService,
      mockMemberStatusService
    );
  });

  describe('handleCancellationTransitions()', () => {
    it('should find and transition expired members to LEFT via changeStatus', async () => {
      const member = makeMember();
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([member]);
      (mockMemberStatusService.changeStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});
      mockTransitionDeleteMany.mockResolvedValue({ count: 0 });

      await service.handleCancellationTransitions();

      expect(mockMemberStatusService.changeStatus).toHaveBeenCalledWith(
        'club-1',
        'member-1',
        'LEFT',
        'Automatischer Austritt nach Ablauf der Kündigungsfrist',
        SYSTEM_USER_ID,
        '2026-01-01',
        'VOLUNTARY'
      );
    });

    it('should remove self-transition audit entries before LEFT transition', async () => {
      const member = makeMember();
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([member]);
      (mockMemberStatusService.changeStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});
      mockTransitionDeleteMany.mockResolvedValue({ count: 1 });

      await service.handleCancellationTransitions();

      expect(mockTransitionDeleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            memberId: 'member-1',
            clubId: 'club-1',
            effectiveDate: member.cancellationDate,
            toStatus: { not: 'LEFT' },
          }),
        })
      );
    });

    it('should query all cancellable statuses', async () => {
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await service.handleCancellationTransitions();

      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['ACTIVE', 'PROBATION', 'DORMANT', 'SUSPENDED'] },
          }),
        })
      );
    });

    it('should transition DORMANT members with expired cancellation', async () => {
      const member = makeMember({ status: 'DORMANT' });
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([member]);
      (mockMemberStatusService.changeStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});
      mockTransitionDeleteMany.mockResolvedValue({ count: 0 });

      await service.handleCancellationTransitions();

      expect(mockMemberStatusService.changeStatus).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'LEFT',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'VOLUNTARY'
      );
    });

    it('should transition SUSPENDED members with expired cancellation', async () => {
      const member = makeMember({ status: 'SUSPENDED' });
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([member]);
      (mockMemberStatusService.changeStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});
      mockTransitionDeleteMany.mockResolvedValue({ count: 0 });

      await service.handleCancellationTransitions();

      expect(mockMemberStatusService.changeStatus).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'LEFT',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'VOLUNTARY'
      );
    });

    it('should continue on individual failure', async () => {
      const member1 = makeMember({ id: 'member-1', memberNumber: 'M-0001' });
      const member2 = makeMember({ id: 'member-2', memberNumber: 'M-0002' });
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        member1,
        member2,
      ]);
      mockTransitionDeleteMany.mockResolvedValue({ count: 0 });

      // First call fails, second succeeds
      (mockMemberStatusService.changeStatus as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({});

      // Should not throw, continues processing
      await expect(service.handleCancellationTransitions()).resolves.toBeUndefined();

      // changeStatus should have been called for both members
      expect(mockMemberStatusService.changeStatus).toHaveBeenCalledTimes(2);
    });

    it('should handle no expired members gracefully', async () => {
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(service.handleCancellationTransitions()).resolves.toBeUndefined();

      expect(mockMemberStatusService.changeStatus).not.toHaveBeenCalled();
    });
  });
});
