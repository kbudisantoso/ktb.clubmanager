import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Service that handles Super Admin bootstrap logic.
 *
 * Bootstrap rules (per CONTEXT.md):
 * 1. If SUPER_ADMIN_EMAIL env var is set, that user becomes Super Admin on login
 * 2. Otherwise, first registered user becomes Super Admin
 * 3. Only one Super Admin can exist via automatic bootstrap (manual promotion allowed)
 */
@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Called after a user is created. Determines if they should be Super Admin.
   *
   * @param userId - ID of newly created user
   * @param email - Email of newly created user
   */
  async checkAndPromoteToSuperAdmin(
    userId: string,
    email: string,
  ): Promise<boolean> {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();

    // Case 1: SUPER_ADMIN_EMAIL is set and matches this user
    if (superAdminEmail && email.toLowerCase() === superAdminEmail) {
      await this.promoteToSuperAdmin(userId);
      this.logger.log(
        `User ${email} promoted to Super Admin (matched SUPER_ADMIN_EMAIL)`,
      );
      return true;
    }

    // Case 2: No SUPER_ADMIN_EMAIL set, and this is the first user
    if (!superAdminEmail) {
      const hasSuperAdmin = await this.prisma.user.count({
        where: { isSuperAdmin: true },
      });

      if (hasSuperAdmin === 0) {
        // Check if this is truly the first user (excluding this one)
        const userCount = await this.prisma.user.count({
          where: { id: { not: userId } },
        });

        if (userCount === 0) {
          await this.promoteToSuperAdmin(userId);
          this.logger.log(`User ${email} promoted to Super Admin (first user)`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Promotes a user to Super Admin.
   *
   * @param userId - User ID to promote
   */
  async promoteToSuperAdmin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuperAdmin: true },
    });
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
