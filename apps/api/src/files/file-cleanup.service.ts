import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from './s3.service.js';

/**
 * Scheduled service for cleaning up orphaned file uploads.
 *
 * Runs cross-tenant by design — the system job processes all clubs.
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
    // Implementation in Task 2
  }
}
