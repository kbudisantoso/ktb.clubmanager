import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ClubDeletionService } from '../../club-deletion/club-deletion.service.js';
import { ClubDeletionLogService } from '../../club-deletion/club-deletion-log.service.js';

/**
 * Service for SuperAdmin club deletion management.
 *
 * Provides capabilities beyond normal club owners:
 * - Cancel any pending club deletion (no OWNER check)
 * - Force-delete a club immediately (synchronous)
 * - List all clubs with pending deletions
 */
@Injectable()
export class AdminClubsService {
  private readonly logger = new Logger(AdminClubsService.name);

  constructor(
    private prisma: PrismaService,
    private clubDeletionService: ClubDeletionService,
    private clubDeletionLogService: ClubDeletionLogService
  ) {}

  /**
   * List clubs with pending deletions (deactivated but not yet deleted).
   */
  async listPendingDeletions() {
    const clubs = await this.prisma.club.findMany({
      where: {
        deactivatedAt: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        deactivatedAt: true,
        deactivatedBy: true,
        scheduledDeletionAt: true,
        gracePeriodDays: true,
        _count: {
          select: { clubUsers: true, members: true },
        },
      },
      orderBy: { scheduledDeletionAt: 'asc' },
    });

    return clubs;
  }

  /**
   * Cancel a pending club deletion (SuperAdmin — no OWNER check).
   * Clears deactivation fields and marks ClubDeletionLog as cancelled.
   */
  async cancelDeletion(clubId: string, userId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Verein nicht gefunden');
    }

    if (!club.deactivatedAt) {
      throw new BadRequestException('Verein ist nicht deaktiviert');
    }

    if (club.deletedAt) {
      throw new BadRequestException('Verein wurde bereits gelöscht');
    }

    const now = new Date();

    // Transaction: clear deactivation fields + cancel deletion log
    const [updated] = await this.prisma.$transaction([
      this.prisma.club.update({
        where: { id: clubId },
        data: {
          deactivatedAt: null,
          deactivatedBy: null,
          scheduledDeletionAt: null,
          gracePeriodDays: null,
        },
      }),
      this.prisma.clubDeletionLog.updateMany({
        where: {
          clubSlug: club.slug,
          cancelled: false,
          deletedAt: null,
        },
        data: {
          cancelled: true,
          cancelledAt: now,
          cancelledBy: userId,
        },
      }),
    ]);

    this.logger.log(`SuperAdmin ${userId} cancelled deletion of club "${club.name}" (${clubId})`);

    return updated;
  }

  /**
   * Force-delete a club immediately (synchronous permanent deletion).
   * If the club is not yet deactivated, creates a ClubDeletionLog entry first.
   */
  async forceDelete(clubId: string, userId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Verein nicht gefunden');
    }

    if (club.deletedAt) {
      throw new BadRequestException('Verein wurde bereits gelöscht');
    }

    // If not yet deactivated, set up deactivation + deletion log first
    if (!club.deactivatedAt) {
      const now = new Date();
      const memberCount = await this.prisma.member.count({
        where: { clubId: club.id, deletedAt: null },
      });

      await this.prisma.$transaction([
        this.prisma.club.update({
          where: { id: clubId },
          data: {
            deactivatedAt: now,
            deactivatedBy: userId,
            scheduledDeletionAt: now,
            gracePeriodDays: 0,
          },
        }),
        this.prisma.clubDeletionLog.create({
          data: {
            clubName: club.name,
            clubSlug: club.slug,
            initiatedBy: userId,
            deactivatedAt: now,
            scheduledDeletionAt: now,
            memberCount,
            notificationEvents: [
              {
                type: 'FORCE_DELETE',
                timestamp: now.toISOString(),
                message: 'Sofortige Löschung durch SuperAdmin',
              },
            ],
          },
        }),
      ]);
    }

    this.logger.log(`SuperAdmin ${userId} force-deleting club "${club.name}" (${clubId})`);

    // Execute permanent deletion synchronously
    await this.clubDeletionService.permanentlyDeleteClub(clubId, club.name, club.slug);

    this.logger.log(`Force deletion complete for club "${club.name}" (${clubId})`);
  }
}
