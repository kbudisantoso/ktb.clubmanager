import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClubDeletionService } from './club-deletion.service.js';
import { ClubDeletionLogService } from './club-deletion-log.service.js';

/**
 * Scheduled service for automatic club permanent deletion and notification milestones.
 *
 * Runs cross-tenant by design — the system job processes all clubs.
 *
 * Two cron jobs:
 * 1. Midnight: Find clubs past their scheduledDeletionAt and permanently delete them
 * 2. 1 AM: Track notification milestones (T-7, T-1, T-0) in ClubDeletionLog
 */
@Injectable()
export class ClubDeletionSchedulerService {
  private readonly logger = new Logger(ClubDeletionSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private clubDeletionService: ClubDeletionService,
    private clubDeletionLogService: ClubDeletionLogService
  ) {}

  /**
   * Daily at midnight: Find clubs past their scheduled deletion date and permanently delete them.
   * Individual errors do not stop processing of other clubs.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePermanentDeletions(): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    this.logger.log('Starting permanent deletion check...');

    const clubs = await this.prisma.club.findMany({
      where: {
        deactivatedAt: { not: null },
        scheduledDeletionAt: { lte: today },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    this.logger.log(`Found ${clubs.length} clubs past their deletion date`);

    let successCount = 0;
    let errorCount = 0;

    for (const club of clubs) {
      try {
        await this.clubDeletionService.permanentlyDeleteClub(club.id, club.name, club.slug);
        successCount++;
        this.logger.log(`Permanently deleted club "${club.name}" (${club.id})`);
      } catch (error) {
        errorCount++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to permanently delete club "${club.name}" (${club.id}): ${message}`
        );
      }
    }

    this.logger.log(
      `Permanent deletion check complete: ${successCount} deleted, ${errorCount} errors`
    );
  }

  /**
   * Daily at 1 AM: Track notification milestones for pending deletions.
   * Adds T-7, T-1, T-0 events to ClubDeletionLog.notificationEvents.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleNotificationMilestones(): Promise<void> {
    this.logger.log('Starting notification milestone check...');

    const pendingLogs = await this.clubDeletionLogService.findPending();

    this.logger.log(`Found ${pendingLogs.length} pending deletion logs to check`);

    let updatedCount = 0;

    for (const log of pendingLogs) {
      const now = new Date();
      const scheduledDate = new Date(log.scheduledDeletionAt);
      const daysRemaining = Math.ceil(
        (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const events = (log.notificationEvents as Record<string, unknown>[]) || [];
      const eventTypes = events.map((e) => e.type);
      let changed = false;

      // T-7: 7 days remaining (skip if grace period <= 7 days)
      if (daysRemaining <= 7 && daysRemaining > 1 && !eventTypes.includes('T-7')) {
        // Only add T-7 if the original grace period was > 7 days
        const gracePeriodDays = Math.ceil(
          (scheduledDate.getTime() - new Date(log.deactivatedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (gracePeriodDays > 7) {
          events.push({ type: 'T-7', timestamp: now.toISOString(), daysRemaining });
          changed = true;
        }
      }

      // T-1: 1 day remaining
      if (daysRemaining <= 1 && daysRemaining > 0 && !eventTypes.includes('T-1')) {
        events.push({ type: 'T-1', timestamp: now.toISOString(), daysRemaining });
        changed = true;
      }

      // T-0: Deletion day reached
      if (daysRemaining <= 0 && !eventTypes.includes('T-0')) {
        events.push({ type: 'T-0', timestamp: now.toISOString(), daysRemaining: 0 });
        changed = true;
      }

      if (changed) {
        await this.clubDeletionLogService.updateNotificationEvents(log.id, events);
        updatedCount++;
        this.logger.log(
          `Updated notification events for club "${log.clubSlug}" (${daysRemaining} days remaining)`
        );
      }
    }

    this.logger.log(`Notification milestone check complete: ${updatedCount} logs updated`);
  }
}
