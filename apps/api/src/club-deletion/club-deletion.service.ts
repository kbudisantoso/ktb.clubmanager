import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from '../files/s3.service.js';
import { SystemUserService } from '../common/services/system-user.service.js';
import { ClubDeletionLogService } from './club-deletion-log.service.js';

/**
 * Orchestrates permanent club deletion after the grace period expires.
 *
 * Deletion order:
 * 1. Delete S3 files (outside transaction, idempotent, errors logged but non-blocking)
 * 2. Hard-delete all child DB records in a transaction (children before parents)
 * 3. Soft-delete the Club row as a tombstone
 * 4. Mark ClubDeletionLog as deleted
 *
 * Uses raw PrismaService (not forClub) — cross-tenant system operation.
 */
@Injectable()
export class ClubDeletionService {
  private readonly logger = new Logger(ClubDeletionService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private systemUserService: SystemUserService,
    private clubDeletionLogService: ClubDeletionLogService
  ) {}

  /**
   * Permanently delete a club and all its data.
   *
   * @param clubId - ID of the club to delete
   * @param clubName - Club name (for logging)
   * @param clubSlug - Club slug (for deletion log lookup)
   */
  async permanentlyDeleteClub(clubId: string, clubName: string, clubSlug: string): Promise<void> {
    this.logger.log(`Starting permanent deletion of club "${clubName}" (${clubId})`);

    // Phase 1: Delete S3 files (outside transaction, idempotent)
    await this.deleteS3Files(clubId);

    // Phase 2: Hard-delete all child records + soft-delete club row in transaction
    await this.deleteDbRecords(clubId);

    // Phase 3: Mark ClubDeletionLog as deleted
    await this.markDeletionLogComplete(clubSlug);

    this.logger.log(`Permanent deletion complete for club "${clubName}" (${clubId})`);
  }

  /**
   * Phase 1: Delete all S3 files associated with the club.
   * Errors are logged but do not stop the deletion process.
   */
  private async deleteS3Files(clubId: string): Promise<void> {
    this.logger.log(`Deleting S3 files for club ${clubId}...`);

    // Find all files linked to this club via ClubFile junction
    const clubFiles = await this.prisma.clubFile.findMany({
      where: { clubId },
      include: { file: true },
    });

    let deletedCount = 0;
    let errorCount = 0;

    for (const clubFile of clubFiles) {
      try {
        await this.s3Service.deleteObject(clubFile.file.s3Key);
        deletedCount++;
      } catch (error) {
        errorCount++;
        const message = error instanceof Error ? error.message : 'Unknown';
        this.logger.warn(`Failed to delete S3 object "${clubFile.file.s3Key}": ${message}`);
      }
    }

    // Also delete logo file if it exists (may not be in ClubFile junction)
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: { logoFile: true },
    });

    if (club?.logoFile) {
      try {
        await this.s3Service.deleteObject(club.logoFile.s3Key);
        deletedCount++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown';
        this.logger.warn(`Failed to delete logo S3 object "${club.logoFile.s3Key}": ${message}`);
        errorCount++;
      }
    }

    this.logger.log(`S3 cleanup: ${deletedCount} deleted, ${errorCount} errors`);
  }

  /**
   * Phase 2: Hard-delete all child records in a transaction, then soft-delete club.
   * Uses atomic WHERE check to prevent race conditions.
   */
  private async deleteDbRecords(clubId: string): Promise<void> {
    this.logger.log(`Deleting DB records for club ${clubId}...`);
    const systemUserId = this.systemUserService.getSystemUserId();

    await this.prisma.$transaction(async (tx) => {
      // Atomic race condition check: club must be deactivated and not yet deleted
      const club = await tx.club.findFirst({
        where: {
          id: clubId,
          deletedAt: null,
          deactivatedAt: { not: null },
        },
      });

      if (!club) {
        throw new Error(
          `Club ${clubId} not eligible for deletion (already deleted or not deactivated)`
        );
      }

      // Delete in dependency order (children before parents)

      // 1. MemberStatusTransition (depends on Member)
      await tx.memberStatusTransition.deleteMany({ where: { clubId } });

      // 2. MembershipPeriod (depends on Member)
      const memberIds = await tx.member
        .findMany({
          where: { clubId },
          select: { id: true },
        })
        .then((members) => members.map((m) => m.id));

      if (memberIds.length > 0) {
        await tx.membershipPeriod.deleteMany({
          where: { memberId: { in: memberIds } },
        });
      }

      // 3. Member
      await tx.member.deleteMany({ where: { clubId } });

      // 4. Household
      await tx.household.deleteMany({ where: { clubId } });

      // 5. NumberRange
      await tx.numberRange.deleteMany({ where: { clubId } });

      // 6. MembershipType
      // First clear defaultMembershipTypeId to avoid FK constraint
      await tx.club.update({
        where: { id: clubId },
        data: { defaultMembershipTypeId: null },
      });
      await tx.membershipType.deleteMany({ where: { clubId } });

      // 7. Collect file IDs BEFORE deleting ClubFile junction records
      const clubFileRecords = await tx.clubFile.findMany({
        where: { clubId },
        select: { fileId: true },
      });
      const fileIds = [
        ...new Set([
          ...clubFileRecords.map((cf) => cf.fileId),
          ...(club.logoFileId ? [club.logoFileId] : []),
        ]),
      ];

      // 8. ClubFile (junction table)
      await tx.clubFile.deleteMany({ where: { clubId } });

      // 9. AccessRequest
      await tx.accessRequest.deleteMany({ where: { clubId } });

      // 10. ClubUser
      await tx.clubUser.deleteMany({ where: { clubId } });

      // 11. AuditLog (club-scoped entries)
      await tx.auditLog.deleteMany({ where: { clubId } });

      // 12. LedgerAccount
      try {
        await tx.ledgerAccount.deleteMany({ where: { clubId } });
      } catch {
        // LedgerAccount may not have data yet — safe to ignore
        this.logger.debug(`LedgerAccount deletion skipped or empty for club ${clubId}`);
      }

      // 13. Soft-delete the Club row as a tombstone
      await tx.club.update({
        where: { id: clubId },
        data: {
          deletedAt: new Date(),
          deletedBy: systemUserId,
          logoFileId: null,
          deactivatedAt: null,
          deactivatedBy: null,
          scheduledDeletionAt: null,
          gracePeriodDays: null,
        },
      });

      // 14. Delete orphaned File records (after club.logoFileId FK cleared)
      for (const fileId of fileIds) {
        const otherClubUsages = await tx.clubFile.count({
          where: { fileId },
        });
        const userUsages = await tx.userFile.count({
          where: { fileId },
        });
        if (otherClubUsages === 0 && userUsages === 0) {
          await tx.file.delete({ where: { id: fileId } });
        }
      }
    });

    this.logger.log(`DB records deleted for club ${clubId}`);
  }

  /**
   * Phase 3: Mark the ClubDeletionLog entry as completed.
   */
  private async markDeletionLogComplete(clubSlug: string): Promise<void> {
    const log = await this.clubDeletionLogService.findBySlug(clubSlug);
    if (log) {
      await this.clubDeletionLogService.markDeleted(log.id);
      this.logger.log(`Deletion log marked complete for slug "${clubSlug}"`);
    } else {
      this.logger.warn(`No deletion log found for slug "${clubSlug}"`);
    }
  }
}
