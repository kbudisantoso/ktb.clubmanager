import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClubDeletionSchedulerService } from './club-deletion-scheduler.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { ClubDeletionService } from './club-deletion.service.js';
import type { ClubDeletionLogService } from './club-deletion-log.service.js';

const mockPrisma = {
  club: {
    findMany: vi.fn(),
  },
} as unknown as PrismaService;

const mockClubDeletionService = {
  permanentlyDeleteClub: vi.fn(),
} as unknown as ClubDeletionService;

const mockClubDeletionLogService = {
  findPending: vi.fn(),
  updateNotificationEvents: vi.fn(),
} as unknown as ClubDeletionLogService;

describe('ClubDeletionSchedulerService', () => {
  let service: ClubDeletionSchedulerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClubDeletionSchedulerService(
      mockPrisma,
      mockClubDeletionService,
      mockClubDeletionLogService
    );
  });

  describe('handlePermanentDeletions()', () => {
    it('should find clubs past their deletion date and delete them', async () => {
      (mockPrisma.club.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'club-1', name: 'Club One', slug: 'club-one' },
        { id: 'club-2', name: 'Club Two', slug: 'club-two' },
      ]);
      (mockClubDeletionService.permanentlyDeleteClub as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await service.handlePermanentDeletions();

      expect(mockPrisma.club.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deactivatedAt: { not: null },
            scheduledDeletionAt: { lte: expect.any(Date) },
            deletedAt: null,
          }),
        })
      );
      expect(mockClubDeletionService.permanentlyDeleteClub).toHaveBeenCalledTimes(2);
      expect(mockClubDeletionService.permanentlyDeleteClub).toHaveBeenCalledWith(
        'club-1',
        'Club One',
        'club-one'
      );
      expect(mockClubDeletionService.permanentlyDeleteClub).toHaveBeenCalledWith(
        'club-2',
        'Club Two',
        'club-two'
      );
    });

    it('should continue processing when one club deletion fails', async () => {
      (mockPrisma.club.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'club-1', name: 'Club One', slug: 'club-one' },
        { id: 'club-2', name: 'Club Two', slug: 'club-two' },
      ]);
      (mockClubDeletionService.permanentlyDeleteClub as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('DB timeout'))
        .mockResolvedValueOnce(undefined);

      // Should NOT throw
      await expect(service.handlePermanentDeletions()).resolves.toBeUndefined();

      // Both clubs should have been attempted
      expect(mockClubDeletionService.permanentlyDeleteClub).toHaveBeenCalledTimes(2);
    });

    it('should do nothing when no clubs are pending deletion', async () => {
      (mockPrisma.club.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await service.handlePermanentDeletions();

      expect(mockClubDeletionService.permanentlyDeleteClub).not.toHaveBeenCalled();
    });
  });

  describe('handleNotificationMilestones()', () => {
    it('should add T-7 event when 7 days remaining and grace period > 7', async () => {
      const now = new Date();
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + 5); // 5 days remaining
      const deactivatedDate = new Date(now);
      deactivatedDate.setDate(deactivatedDate.getDate() - 25); // 30-day grace period

      (mockClubDeletionLogService.findPending as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'log-1',
          clubSlug: 'test-club',
          scheduledDeletionAt: scheduledDate,
          deactivatedAt: deactivatedDate,
          notificationEvents: [],
        },
      ]);
      (
        mockClubDeletionLogService.updateNotificationEvents as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      await service.handleNotificationMilestones();

      expect(mockClubDeletionLogService.updateNotificationEvents).toHaveBeenCalledWith(
        'log-1',
        expect.arrayContaining([expect.objectContaining({ type: 'T-7' })])
      );
    });

    it('should skip T-7 event when grace period is <= 7 days', async () => {
      const now = new Date();
      const deactivatedDate = new Date(now);
      deactivatedDate.setDate(deactivatedDate.getDate() - 2); // Deactivated 2 days ago
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + 5); // 5 days remaining (7-day grace)

      (mockClubDeletionLogService.findPending as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'log-1',
          clubSlug: 'test-club',
          scheduledDeletionAt: scheduledDate,
          deactivatedAt: deactivatedDate,
          notificationEvents: [],
        },
      ]);
      (
        mockClubDeletionLogService.updateNotificationEvents as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      await service.handleNotificationMilestones();

      // updateNotificationEvents should NOT be called since gracePeriod <= 7
      // and there are no other milestone conditions met
      const calls = (
        mockClubDeletionLogService.updateNotificationEvents as ReturnType<typeof vi.fn>
      ).mock.calls;
      if (calls.length > 0) {
        const events = calls[0]![1] as Array<{ type: string }>;
        expect(events.every((e) => e.type !== 'T-7')).toBe(true);
      }
    });

    it('should handle no pending logs gracefully', async () => {
      (mockClubDeletionLogService.findPending as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(service.handleNotificationMilestones()).resolves.toBeUndefined();

      expect(mockClubDeletionLogService.updateNotificationEvents).not.toHaveBeenCalled();
    });
  });
});
