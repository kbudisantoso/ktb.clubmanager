import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from './s3.service.js';

/**
 * Scheduled service for cleaning up orphaned file uploads.
 *
 * Runs cross-tenant by design -- the system job processes all clubs.
 * Uses raw prisma (NOT forClub) since this is a system-level operation.
 * Same pattern as MemberSchedulerService.
 */
@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service
  ) {}

  /**
   * Clean up orphaned uploads every 6 hours.
   * Removes PENDING_UPLOAD files older than 24 hours.
   */
  @Cron('0 */6 * * *')
  async cleanupOrphanedUploads() {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const orphans = await this.prisma.file.findMany({
      where: {
        status: 'PENDING_UPLOAD',
        createdAt: { lt: threshold },
      },
    });

    if (orphans.length === 0) return;

    this.logger.log(`Found ${orphans.length} orphaned uploads to clean up`);

    let successCount = 0;
    let errorCount = 0;

    for (const file of orphans) {
      try {
        // Try to delete from S3 (may not exist if upload never started)
        if (file.s3Key) {
          await this.s3Service.deleteObject(file.s3Key).catch(() => {});
        }

        // Delete junction records first, then file record
        await this.prisma.clubFile.deleteMany({ where: { fileId: file.id } });
        await this.prisma.userFile.deleteMany({ where: { fileId: file.id } });
        await this.prisma.file.delete({ where: { id: file.id } });

        successCount++;
        this.logger.debug(`Cleaned up orphaned file: ${file.id}`);
      } catch (error) {
        errorCount++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to clean up file ${file.id}: ${message}`);
      }
    }

    this.logger.log(
      `Orphaned upload cleanup complete: ${successCount} removed, ${errorCount} errors`
    );
  }
}
