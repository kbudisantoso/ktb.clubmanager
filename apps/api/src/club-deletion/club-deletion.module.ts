import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module.js';
import { ClubDeletionService } from './club-deletion.service.js';
import { ClubDeletionSchedulerService } from './club-deletion-scheduler.service.js';
import { ClubDeletionLogService } from './club-deletion-log.service.js';

/**
 * Module for club deletion with grace period.
 *
 * Provides:
 * - ClubDeletionService: Permanent deletion orchestration (S3 + DB cascade)
 * - ClubDeletionSchedulerService: Daily cron for deletions and notification milestones
 * - ClubDeletionLogService: CRUD for deletion audit trail
 *
 * PrismaModule and CommonModule (SystemUserService) are @Global() — no import needed.
 * FilesModule is imported for S3Service access.
 */
@Module({
  imports: [FilesModule],
  providers: [ClubDeletionService, ClubDeletionSchedulerService, ClubDeletionLogService],
  exports: [ClubDeletionService, ClubDeletionLogService],
})
export class ClubDeletionModule {}
