import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Scheduled service for automatic member status transitions.
 *
 * Runs cross-tenant by design - the system job processes all clubs.
 * Uses raw prisma (NOT forClub) since this is a system-level operation.
 */
@Injectable()
export class MemberSchedulerService {
  private readonly logger = new Logger(MemberSchedulerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Daily cron job: Auto-transition members with expired cancellation dates to LEFT.
   *
   * Finds all ACTIVE/INACTIVE members where cancellationDate <= today
   * and transitions them to LEFT status.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCancellationTransitions() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    this.logger.log('Starting daily cancellation auto-transition check...');

    const members = await this.prisma.member.findMany({
      where: {
        status: { in: ['ACTIVE', 'INACTIVE'] },
        cancellationDate: { lte: today },
        deletedAt: null,
      },
      include: {
        membershipPeriods: {
          where: { leaveDate: null },
          orderBy: { joinDate: 'desc' },
          take: 1,
        },
      },
    });

    this.logger.log(`Found ${members.length} members with expired cancellation dates`);

    let successCount = 0;
    let errorCount = 0;

    for (const member of members) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Update status to LEFT
          await tx.member.update({
            where: { id: member.id },
            data: {
              status: 'LEFT',
              statusChangedAt: new Date(),
              statusChangedBy: 'SYSTEM',
              statusChangeReason: 'Automatischer Austritt nach Ablauf der Kuendigungsfrist',
            },
          });

          // Close active membership period
          const activePeriod = member.membershipPeriods[0];
          if (activePeriod) {
            await tx.membershipPeriod.update({
              where: { id: activePeriod.id },
              data: { leaveDate: member.cancellationDate },
            });
          }
        });

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
