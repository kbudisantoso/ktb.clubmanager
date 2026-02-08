import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { VALID_TRANSITIONS, type MemberStatus } from '@ktb/shared';

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
   *
   * @param clubId - Club tenant ID
   * @param memberId - Member to change status for
   * @param newStatus - Target status
   * @param reason - Human-readable reason for the status change
   * @param userId - User performing the change
   * @param effectiveDate - Optional effective date (YYYY-MM-DD), defaults to today
   */
  async changeStatus(
    clubId: string,
    memberId: string,
    newStatus: MemberStatus,
    reason: string,
    userId: string,
    effectiveDate?: string
  ) {
    const db = this.prisma.forClub(clubId);

    const member = await db.member.findFirst({
      where: { id: memberId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    const currentStatus = member.status as MemberStatus;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Ungueltige Statusaenderung: ${currentStatus} -> ${newStatus} ist nicht erlaubt. ` +
          `Erlaubte Uebergaenge: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'keine (Endstatus)'}`
      );
    }

    const effectiveDateValue = effectiveDate || toDateString(new Date());

    // If transitioning to LEFT, close active membership period and set cancellation date if needed
    if (newStatus === 'LEFT') {
      // Close active membership period
      const activePeriod = await db.membershipPeriod.findFirst({
        where: { memberId, leaveDate: null },
        orderBy: { joinDate: 'desc' },
      });

      if (activePeriod) {
        await db.membershipPeriod.update({
          where: { id: activePeriod.id },
          data: { leaveDate: new Date(effectiveDateValue) },
        });
      }

      // Set cancellationDate if not already set
      if (!member.cancellationDate) {
        await db.member.update({
          where: { id: memberId },
          data: { cancellationDate: new Date(effectiveDateValue) },
        });
      }
    }

    const updated = await db.member.update({
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
  }

  /**
   * Set a cancellation date for a member.
   * The member stays ACTIVE until the cancellation date passes,
   * at which point the scheduler transitions them to LEFT.
   *
   * @param clubId - Club tenant ID
   * @param memberId - Member to cancel
   * @param cancellationDate - When the membership ends (YYYY-MM-DD)
   * @param cancellationReceivedAt - When the cancellation notice was received (YYYY-MM-DD)
   * @param userId - User recording the cancellation
   */
  async setCancellation(
    clubId: string,
    memberId: string,
    cancellationDate: string,
    cancellationReceivedAt: string,
    userId: string
  ) {
    const db = this.prisma.forClub(clubId);

    const member = await db.member.findFirst({
      where: { id: memberId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    const currentStatus = member.status as MemberStatus;
    if (currentStatus !== 'ACTIVE' && currentStatus !== 'INACTIVE') {
      throw new BadRequestException(
        `Kuendigung kann nur fuer aktive oder inaktive Mitglieder erfasst werden. Aktueller Status: ${currentStatus}`
      );
    }

    const updated = await db.member.update({
      where: { id: memberId },
      data: {
        cancellationDate: new Date(cancellationDate),
        cancellationReceivedAt: new Date(cancellationReceivedAt),
        statusChangeReason: `Kuendigung zum ${cancellationDate} erfasst`,
        statusChangedAt: new Date(),
        statusChangedBy: userId,
        version: { increment: 1 },
      },
    });

    this.logger.log(
      `Cancellation set: Member ${memberId} cancellation date ${cancellationDate} by ${userId}`
    );

    return updated;
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
    userId: string
  ) {
    const updated: string[] = [];
    const skipped: { id: string; reason: string }[] = [];

    for (const memberId of memberIds) {
      try {
        await this.changeStatus(clubId, memberId, newStatus, reason, userId);
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
}
