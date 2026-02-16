import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { VALID_TRANSITIONS, type MemberStatus, type LeftCategory } from '@ktb/shared';

/**
 * Helper to format a Date to YYYY-MM-DD string.
 * Avoids timezone shift issues with Prisma @db.Date fields.
 */
function toDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable()
export class MemberStatusService {
  private readonly logger = new Logger(MemberStatusService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Change a member's status with validation against the VALID_TRANSITIONS state machine.
   * Wrapped in $transaction for atomicity. Creates a MemberStatusTransition audit record.
   *
   * Supports self-transitions (from === to) for membership type changes.
   * Supports optional membershipTypeId for period management:
   * - Self-transitions: closes current period, creates new one with new type (required)
   * - Non-self transitions with membershipTypeId: inline type change during transition
   * - Transitions to LEFT: closes active period
   *
   * @param clubId - Club tenant ID
   * @param memberId - Member to change status for
   * @param newStatus - Target status
   * @param reason - Human-readable reason for the status change
   * @param userId - User performing the change
   * @param effectiveDate - Optional effective date (YYYY-MM-DD), defaults to today
   * @param leftCategory - Required when transitioning to LEFT
   * @param membershipTypeId - Optional membership type for period management
   */
  async changeStatus(
    clubId: string,
    memberId: string,
    newStatus: MemberStatus,
    reason: string,
    userId: string,
    effectiveDate?: string,
    leftCategory?: LeftCategory,
    membershipTypeId?: string
  ) {
    const effectiveDateValue = effectiveDate || toDateString(new Date());

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findFirst({
        where: { id: memberId, clubId, deletedAt: null },
      });

      if (!member) {
        throw new NotFoundException('Mitglied nicht gefunden');
      }

      const currentStatus = member.status as MemberStatus;
      const isSelfTransition = currentStatus === newStatus;
      const allowedTransitions = VALID_TRANSITIONS[currentStatus];

      if (!allowedTransitions.includes(newStatus)) {
        throw new BadRequestException(
          `Ungueltige Statusaenderung: ${currentStatus} -> ${newStatus} ist nicht erlaubt. ` +
            `Erlaubte Uebergaenge: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'keine (Endstatus)'}`
        );
      }

      // Validate leftCategory is provided when transitioning to LEFT
      if (newStatus === 'LEFT' && !leftCategory) {
        throw new BadRequestException(
          'Austrittsgrund (leftCategory) ist erforderlich bei Statuswechsel zu LEFT'
        );
      }

      // Self-transitions require membershipTypeId (that's the whole point)
      if (isSelfTransition && !membershipTypeId) {
        throw new BadRequestException(
          'Mitgliedsart ist erforderlich bei Aenderung der Mitgliedsart'
        );
      }

      // Create audit trail record
      await tx.memberStatusTransition.create({
        data: {
          memberId,
          clubId,
          fromStatus: currentStatus,
          toStatus: newStatus,
          reason,
          leftCategory: newStatus === 'LEFT' ? leftCategory : null,
          effectiveDate: new Date(effectiveDateValue),
          actorId: userId,
        },
      });

      // If transitioning to LEFT, close active membership period and set cancellation date if needed
      if (newStatus === 'LEFT') {
        const activePeriod = await tx.membershipPeriod.findFirst({
          where: { memberId, leaveDate: null },
          orderBy: { joinDate: 'desc' },
        });

        if (activePeriod) {
          await tx.membershipPeriod.update({
            where: { id: activePeriod.id },
            data: { leaveDate: new Date(effectiveDateValue) },
          });
        }

        if (!member.cancellationDate) {
          await tx.member.update({
            where: { id: memberId },
            data: { cancellationDate: new Date(effectiveDateValue) },
          });
        }
      }

      // Handle membership type changes via period management
      if (membershipTypeId && newStatus !== 'LEFT') {
        const currentPeriod = await tx.membershipPeriod.findFirst({
          where: { memberId, leaveDate: null },
          orderBy: { joinDate: 'desc' },
        });

        if (currentPeriod && currentPeriod.membershipTypeId !== membershipTypeId) {
          // Close current period and create new one with new type
          await tx.membershipPeriod.update({
            where: { id: currentPeriod.id },
            data: { leaveDate: new Date(effectiveDateValue) },
          });
          await tx.membershipPeriod.create({
            data: {
              memberId,
              joinDate: new Date(effectiveDateValue),
              membershipTypeId,
            },
          });
        } else if (!currentPeriod) {
          // No active period (e.g., PENDING activation) — create new one
          await tx.membershipPeriod.create({
            data: {
              memberId,
              joinDate: new Date(effectiveDateValue),
              membershipTypeId,
            },
          });
        }
      }

      // For self-transitions: only bump version, no status change needed
      if (isSelfTransition) {
        const updated = await tx.member.update({
          where: { id: memberId },
          data: {
            statusChangedAt: new Date(),
            statusChangedBy: userId,
            statusChangeReason: reason,
            version: { increment: 1 },
          },
        });

        this.logger.log(
          `Membership type changed: Member ${memberId} (self-transition ${currentStatus}) by ${userId}`
        );

        return updated;
      }

      const updated = await tx.member.update({
        where: { id: memberId },
        data: {
          status: newStatus,
          statusChangedAt: new Date(),
          statusChangedBy: userId,
          statusChangeReason: reason,
          version: { increment: 1 },
        },
      });

      this.logger.log(
        `Status changed: Member ${memberId} from ${currentStatus} to ${newStatus} by ${userId}`
      );

      return updated;
    });
  }

  /**
   * Set a cancellation date for a member.
   * The member stays in their current status until the cancellation date passes,
   * at which point the scheduler transitions them to LEFT.
   * Creates an audit trail record to document the cancellation event.
   *
   * @param clubId - Club tenant ID
   * @param memberId - Member to cancel
   * @param cancellationDate - When the membership ends (YYYY-MM-DD)
   * @param cancellationReceivedAt - When the cancellation notice was received (YYYY-MM-DD)
   * @param userId - User recording the cancellation
   * @param reason - Reason for the cancellation
   */
  async setCancellation(
    clubId: string,
    memberId: string,
    cancellationDate: string,
    cancellationReceivedAt: string,
    userId: string,
    reason: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findFirst({
        where: { id: memberId, clubId, deletedAt: null },
      });

      if (!member) {
        throw new NotFoundException('Mitglied nicht gefunden');
      }

      const currentStatus = member.status as MemberStatus;
      const cancellableStatuses: MemberStatus[] = ['ACTIVE', 'PROBATION', 'DORMANT', 'SUSPENDED'];

      if (!cancellableStatuses.includes(currentStatus)) {
        throw new BadRequestException(
          `Kuendigung kann nur fuer aktive, auf Probe, ruhende oder gesperrte Mitglieder erfasst werden. Aktueller Status: ${currentStatus}`
        );
      }

      // Create audit trail for cancellation event (status stays the same)
      await tx.memberStatusTransition.create({
        data: {
          memberId,
          clubId,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          reason: reason || `Kuendigung zum ${cancellationDate} erfasst`,
          effectiveDate: new Date(cancellationDate),
          actorId: userId,
        },
      });

      const updated = await tx.member.update({
        where: { id: memberId },
        data: {
          cancellationDate: new Date(cancellationDate),
          cancellationReceivedAt: new Date(cancellationReceivedAt),
          statusChangeReason: reason || `Kuendigung zum ${cancellationDate} erfasst`,
          statusChangedAt: new Date(),
          statusChangedBy: userId,
          version: { increment: 1 },
        },
      });

      this.logger.log(
        `Cancellation set: Member ${memberId} cancellation date ${cancellationDate} by ${userId}`
      );

      return updated;
    });
  }

  /**
   * Bulk status change for multiple members.
   * Validates each member individually, skips invalid transitions.
   *
   * @returns Object with updated and skipped member lists
   */
  async bulkChangeStatus(
    clubId: string,
    memberIds: string[],
    newStatus: MemberStatus,
    reason: string,
    userId: string,
    leftCategory?: LeftCategory
  ) {
    const updated: string[] = [];
    const skipped: { id: string; reason: string }[] = [];

    for (const memberId of memberIds) {
      try {
        await this.changeStatus(
          clubId,
          memberId,
          newStatus,
          reason,
          userId,
          undefined,
          leftCategory
        );
        updated.push(memberId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        skipped.push({ id: memberId, reason: message });
      }
    }

    this.logger.log(
      `Bulk status change: ${updated.length} updated, ${skipped.length} skipped (target: ${newStatus})`
    );

    return { updated, skipped };
  }

  /**
   * Get status transition history for a member.
   * Excludes soft-deleted entries.
   */
  async getStatusHistory(clubId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, clubId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    const transitions = await this.prisma.memberStatusTransition.findMany({
      where: { memberId, clubId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return transitions.map((t) => ({
      id: t.id,
      memberId: t.memberId,
      clubId: t.clubId,
      fromStatus: t.fromStatus,
      toStatus: t.toStatus,
      reason: t.reason,
      leftCategory: t.leftCategory,
      effectiveDate: toDateString(t.effectiveDate),
      actorId: t.actorId,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  /**
   * Update a status history entry (reason, effectiveDate, leftCategory).
   * Only modifiable fields can be changed - fromStatus/toStatus are immutable.
   *
   * @param clubId - Club tenant ID
   * @param memberId - Member the transition belongs to
   * @param transitionId - ID of the transition to update
   * @param updates - Fields to update
   * @param userId - User performing the update (for audit)
   */
  async updateStatusHistoryEntry(
    clubId: string,
    memberId: string,
    transitionId: string,
    updates: { reason?: string; effectiveDate?: string; leftCategory?: LeftCategory },
    userId: string
  ) {
    const transition = await this.prisma.memberStatusTransition.findFirst({
      where: { id: transitionId, memberId, clubId, deletedAt: null },
    });

    if (!transition) {
      throw new NotFoundException('Statusuebergang nicht gefunden');
    }

    const data: Record<string, unknown> = {};
    if (updates.reason !== undefined) {
      data.reason = updates.reason;
    }
    if (updates.effectiveDate !== undefined) {
      data.effectiveDate = new Date(updates.effectiveDate);
    }
    if (updates.leftCategory !== undefined) {
      data.leftCategory = updates.leftCategory;
    }

    const updated = await this.prisma.memberStatusTransition.update({
      where: { id: transitionId },
      data,
    });

    this.logger.log(
      `Status history entry ${transitionId} updated by ${userId} for member ${memberId}`
    );

    return {
      id: updated.id,
      memberId: updated.memberId,
      clubId: updated.clubId,
      fromStatus: updated.fromStatus,
      toStatus: updated.toStatus,
      reason: updated.reason,
      leftCategory: updated.leftCategory,
      effectiveDate: toDateString(updated.effectiveDate),
      actorId: updated.actorId,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Soft-delete a status history entry.
   * Cannot delete the most recent transition that established the current member status.
   *
   * @param clubId - Club tenant ID
   * @param memberId - Member the transition belongs to
   * @param transitionId - ID of the transition to delete
   * @param userId - User performing the deletion
   */
  async deleteStatusHistoryEntry(
    clubId: string,
    memberId: string,
    transitionId: string,
    userId: string
  ) {
    const transition = await this.prisma.memberStatusTransition.findFirst({
      where: { id: transitionId, memberId, clubId, deletedAt: null },
    });

    if (!transition) {
      throw new NotFoundException('Statusuebergang nicht gefunden');
    }

    // Check if this is the most recent transition (cannot delete current-status-establishing entry)
    const mostRecent = await this.prisma.memberStatusTransition.findFirst({
      where: { memberId, clubId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (mostRecent && mostRecent.id === transitionId) {
      throw new BadRequestException(
        'Der aktuellste Statusuebergang kann nicht geloescht werden, da er den aktuellen Status begruendet'
      );
    }

    await this.prisma.memberStatusTransition.update({
      where: { id: transitionId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    this.logger.log(
      `Status history entry ${transitionId} soft-deleted by ${userId} for member ${memberId}`
    );

    return { success: true };
  }
}
