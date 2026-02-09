import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Resolves the system user UUID at application startup.
 *
 * Used by automated processes (schedulers, cron jobs) to attribute
 * changes to a real database user instead of a magic string.
 *
 * Falls back to 'SYSTEM' if no system user exists in the database,
 * allowing the application to start without a seeded system user.
 */
@Injectable()
export class SystemUserService implements OnModuleInit {
  private readonly logger = new Logger(SystemUserService.name);
  private systemUserId: string | undefined;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const systemUser = await this.prisma.user.findFirst({
      where: { isSystemUser: true },
    });

    if (!systemUser) {
      this.logger.warn(
        'System user not found in database. Run database seed to create it. ' +
          'Scheduler will use fallback "SYSTEM" string until seed is run.'
      );
      return;
    }

    this.systemUserId = systemUser.id;
    // SEC-013: Log ID only — no PII in application logs
    this.logger.log(`System user resolved: ${systemUser.id}`);
  }

  getSystemUserId(): string {
    return this.systemUserId ?? 'SYSTEM';
  }
}
