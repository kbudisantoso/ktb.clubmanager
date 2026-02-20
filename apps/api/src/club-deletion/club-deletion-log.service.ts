import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/client/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * CRUD service for ClubDeletionLog table.
 *
 * Uses raw PrismaService (not forClub) because ClubDeletionLog is a
 * cross-tenant system table that survives club data deletion.
 * Purpose: GDPR Art. 30 compliance — proves erasure happened.
 */
@Injectable()
export class ClubDeletionLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find all pending (non-cancelled, non-completed) deletion logs.
   */
  async findPending() {
    return this.prisma.clubDeletionLog.findMany({
      where: {
        deletedAt: null,
        cancelled: false,
      },
      orderBy: { scheduledDeletionAt: 'asc' },
    });
  }

  /**
   * Find all deletion logs (for SuperAdmin view).
   */
  async findAll() {
    return this.prisma.clubDeletionLog.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find a deletion log entry by club slug.
   */
  async findBySlug(slug: string) {
    return this.prisma.clubDeletionLog.findFirst({
      where: { clubSlug: slug },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update the notificationEvents JSON field.
   */
  async updateNotificationEvents(id: string, events: Record<string, unknown>[]) {
    return this.prisma.clubDeletionLog.update({
      where: { id },
      data: { notificationEvents: events as unknown as Prisma.InputJsonValue },
    });
  }

  /**
   * Mark a deletion log entry as deleted (permanent deletion occurred).
   */
  async markDeleted(id: string) {
    return this.prisma.clubDeletionLog.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
