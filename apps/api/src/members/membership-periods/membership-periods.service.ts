import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreatePeriodDto, UpdatePeriodDto } from './dto/index.js';

/**
 * Helper to format a Date to YYYY-MM-DD string.
 * Avoids timezone shift issues with Prisma @db.Date fields.
 */
function toDateString(date: Date | null | undefined): string | null {
  if (!date) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable()
export class MembershipPeriodsService {
  private readonly logger = new Logger(MembershipPeriodsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * List all membership periods for a member, ordered by joinDate desc.
   */
  async findByMember(clubId: string, memberId: string) {
    const db = this.prisma.forClub(clubId);

    // Validate member exists
    const member = await db.member.findFirst({
      where: { id: memberId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    const periods = await db.membershipPeriod.findMany({
      where: { memberId },
      orderBy: { joinDate: 'desc' },
    });

    return periods.map((p) => this.formatPeriodResponse(p));
  }

  /**
   * Create a new membership period for a member.
   * Validates no overlap with existing periods.
   */
  async create(clubId: string, memberId: string, dto: CreatePeriodDto) {
    const db = this.prisma.forClub(clubId);

    // Validate member exists
    const member = await db.member.findFirst({
      where: { id: memberId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    // Check for open period (leaveDate is null)
    const openPeriod = await db.membershipPeriod.findFirst({
      where: { memberId, leaveDate: null },
    });

    if (openPeriod && !dto.leaveDate) {
      throw new BadRequestException(
        'Aktuelle Mitgliedschaft muss zuerst beendet werden, bevor eine neue angelegt werden kann'
      );
    }

    // Validate no overlap with existing periods
    await this.validateNoOverlap(db, memberId, dto.joinDate, dto.leaveDate);

    const period = await db.membershipPeriod.create({
      data: {
        memberId,
        joinDate: new Date(dto.joinDate),
        leaveDate: dto.leaveDate ? new Date(dto.leaveDate) : null,
        membershipType: dto.membershipType,
        notes: dto.notes,
      },
    });

    this.logger.log(
      `MembershipPeriod created for member ${memberId}: ${dto.joinDate} - ${dto.leaveDate ?? 'open'}`
    );

    return this.formatPeriodResponse(period);
  }

  /**
   * Update a membership period. Re-validates no overlap.
   */
  async update(clubId: string, periodId: string, dto: UpdatePeriodDto) {
    const db = this.prisma.forClub(clubId);

    const period = await db.membershipPeriod.findUnique({
      where: { id: periodId },
      include: { member: true },
    });

    if (!period) {
      throw new NotFoundException('Mitgliedschaftszeitraum nicht gefunden');
    }

    // Validate member belongs to this club
    const member = await db.member.findFirst({
      where: { id: period.memberId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    const newJoinDate = dto.joinDate ?? toDateString(period.joinDate)!;
    const newLeaveDate = dto.leaveDate ?? toDateString(period.leaveDate) ?? undefined;

    // Validate no overlap (exclude current period)
    await this.validateNoOverlap(db, period.memberId, newJoinDate, newLeaveDate, periodId);

    const updateData: Record<string, unknown> = {};
    if (dto.joinDate !== undefined) updateData.joinDate = new Date(dto.joinDate);
    if (dto.leaveDate !== undefined) updateData.leaveDate = new Date(dto.leaveDate);
    if (dto.membershipType !== undefined) updateData.membershipType = dto.membershipType;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await db.membershipPeriod.update({
      where: { id: periodId },
      data: updateData,
    });

    return this.formatPeriodResponse(updated);
  }

  /**
   * Close an open membership period by setting the leaveDate.
   */
  async closePeriod(clubId: string, periodId: string, leaveDate: string) {
    const db = this.prisma.forClub(clubId);

    const period = await db.membershipPeriod.findUnique({
      where: { id: periodId },
      include: { member: true },
    });

    if (!period) {
      throw new NotFoundException('Mitgliedschaftszeitraum nicht gefunden');
    }

    // Validate member belongs to this club
    const member = await db.member.findFirst({
      where: { id: period.memberId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    if (period.leaveDate) {
      throw new BadRequestException('Dieser Zeitraum ist bereits beendet');
    }

    const leaveDateObj = new Date(leaveDate);
    if (leaveDateObj < period.joinDate) {
      throw new BadRequestException('Austrittsdatum darf nicht vor dem Eintrittsdatum liegen');
    }

    const updated = await db.membershipPeriod.update({
      where: { id: periodId },
      data: { leaveDate: leaveDateObj },
    });

    this.logger.log(`MembershipPeriod ${periodId} closed with leaveDate ${leaveDate}`);

    return this.formatPeriodResponse(updated);
  }

  /**
   * Validate that a new/updated period does not overlap with existing periods.
   */
  private async validateNoOverlap(
    db: ReturnType<PrismaService['forClub']>,
    memberId: string,
    joinDate: string,
    leaveDate?: string,
    excludePeriodId?: string
  ) {
    const existingPeriods = await db.membershipPeriod.findMany({
      where: {
        memberId,
        ...(excludePeriodId && { id: { not: excludePeriodId } }),
      },
    });

    const newStart = new Date(joinDate);
    const newEnd = leaveDate ? new Date(leaveDate) : null;

    for (const existing of existingPeriods) {
      const existingStart = existing.joinDate;
      const existingEnd = existing.leaveDate;

      // Check overlap:
      // Two ranges [A1, A2] and [B1, B2] overlap when A1 <= B2 AND B1 <= A2
      // If either end is null (open-ended), it extends to infinity
      const existingEndOrMax = existingEnd ?? new Date('9999-12-31');
      const newEndOrMax = newEnd ?? new Date('9999-12-31');

      if (newStart <= existingEndOrMax && existingStart <= newEndOrMax) {
        throw new BadRequestException(
          `Mitgliedschaftszeitraum ueberschneidet sich mit bestehendem Zeitraum ` +
            `(${toDateString(existingStart)} - ${existingEnd ? toDateString(existingEnd) : 'offen'})`
        );
      }
    }
  }

  /**
   * Format a period record for API response.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatPeriodResponse(period: any) {
    return {
      id: period.id,
      memberId: period.memberId,
      joinDate: toDateString(period.joinDate),
      leaveDate: toDateString(period.leaveDate),
      membershipType: period.membershipType,
      notes: period.notes ?? null,
      createdAt: period.createdAt?.toISOString() ?? null,
      updatedAt: period.updatedAt?.toISOString() ?? null,
    };
  }
}
