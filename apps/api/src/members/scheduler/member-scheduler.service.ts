import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SystemUserService } from '../../common/services/system-user.service.js';
import { MemberStatusService } from '../member-status.service.js';
import type { LeftCategory, MemberStatus } from '@ktb/shared';

/**
 * Scheduled service for automatic member status transitions.
 *
 * Runs cross-tenant by design — the system job processes all clubs.
 * Uses MemberStatusService.changeStatus() for full chain validation.
 *
 * Also runs on application startup to catch up on any cancellations
 * that were missed while the server was down (e.g., dev restarts).
 */
@Injectable()
export class MemberSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MemberSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private systemUserService: SystemUserService,
    private memberStatusService: MemberStatusService
  ) {}

  /**
   * On application startup, run the cancellation check to catch up
   * on any cancellations that expired while the server was offline.
   */
  async onApplicationBootstrap() {
    // Small delay to ensure all services are fully initialized
    setTimeout(() => {
      this.handleCancellationTransitions().catch((err) => {
        this.logger.error(`Startup cancellation catch-up failed: ${err.message}`);
      });
    }, 5000);
  }

  /**
   * Daily cron job: Auto-transition members with expired cancellation dates to LEFT.
   *
   * Finds all cancellable members (ACTIVE, PROBATION, DORMANT, SUSPENDED)
   * where cancellationDate <= today and transitions them to LEFT status.
   * Uses MemberStatusService.changeStatus() for proper chain recalculation.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCancellationTransitions() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    this.logger.log('Starting cancellation auto-transition check...');

    const members = await this.prisma.member.findMany({
      where: {
        status: { in: ['ACTIVE', 'PROBATION', 'DORMANT', 'SUSPENDED'] },
        cancellationDate: { lte: today },
        deletedAt: null,
      },
      select: {
        id: true,
        clubId: true,
        memberNumber: true,
        cancellationDate: true,
      },
    });

    this.logger.log(`Found ${members.length} members with expired cancellation dates`);

    let successCount = 0;
    let errorCount = 0;

    for (const member of members) {
      try {
        const systemUserId = this.systemUserService.getSystemUserId();
        const cancellationDate = member.cancellationDate!;
        const effectiveDate = `${cancellationDate.getUTCFullYear()}-${String(cancellationDate.getUTCMonth() + 1).padStart(2, '0')}-${String(cancellationDate.getUTCDate()).padStart(2, '0')}`;

        // Remove any self-transition audit entries on the cancellation date
        // (created by setCancellation for future cancellations that have now arrived).
        // This prevents the one-entry-per-day constraint from blocking the LEFT transition.
        await this.prisma.memberStatusTransition.deleteMany({
          where: {
            memberId: member.id,
            clubId: member.clubId,
            effectiveDate: cancellationDate,
            deletedAt: null,
            // Only delete self-transitions (non-LEFT), not real status changes
            toStatus: { not: 'LEFT' },
          },
        });

        // Use changeStatus for full chain validation and recalculation
        await this.memberStatusService.changeStatus(
          member.clubId,
          member.id,
          'LEFT' as MemberStatus,
          'Automatischer Austritt nach Ablauf der Kündigungsfrist',
          systemUserId,
          effectiveDate,
          'VOLUNTARY' as LeftCategory
        );

        successCount++;
        this.logger.log(
          `Auto-transitioned member ${member.id} (${member.memberNumber}) in club ${member.clubId} to LEFT`
        );
      } catch (error) {
        errorCount++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to auto-transition member ${member.id} (${member.memberNumber}): ${message}`
        );
      }
    }

    this.logger.log(
      `Cancellation auto-transition complete: ${successCount} transitioned, ${errorCount} errors`
    );
  }
}
