import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Service for manual Super Admin promotion/demotion (admin panel).
 *
 * Automatic bootstrap promotion is handled in Better Auth's
 * databaseHooks.user.create.after (apps/web/lib/auth.ts).
 */
@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Promotes a user to Super Admin.
   *
   * After promotion, all existing sessions for this user are revoked
   * to force re-authentication with elevated privileges (SEC-009).
   *
   * @param userId - User ID to promote
   */
  async promoteToSuperAdmin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuperAdmin: true },
    });

    // SEC-009: Revoke all sessions after privilege escalation
    // Forces re-authentication so the new session reflects elevated privileges.
    // This prevents session fixation attacks where a pre-escalation session
    // could be reused without the security context being refreshed.
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    this.logger.log(`All sessions revoked for user ${userId} after Super Admin promotion`);
  }

  /**
   * Demotes a user from Super Admin.
   * Prevents demoting the last Super Admin.
   *
   * @param userId - User ID to demote
   */
  async demoteFromSuperAdmin(userId: string): Promise<void> {
    const superAdminCount = await this.prisma.user.count({
      where: { isSuperAdmin: true },
    });

    if (superAdminCount <= 1) {
      throw new Error('Cannot demote the last Super Admin');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuperAdmin: false },
    });
  }

  /**
   * Check if any Super Admin exists.
   */
  async hasSuperAdmin(): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { isSuperAdmin: true },
    });
    return count > 0;
  }
}
