import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Authentication service for Better Auth session-based auth.
 *
 * Provides user lookup and session management utilities.
 */
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find user by ID.
   */
  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by email.
   */
  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by external ID (for future Zitadel migration).
   */
  async findUserByExternalId(externalId: string) {
    return this.prisma.user.findUnique({
      where: { externalId },
    });
  }

  /**
   * Validate a session token and return the associated user.
   */
  async validateSession(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      return null;
    }

    return session.user;
  }

  /**
   * Get all active sessions for a user.
   */
  async getUserSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke a specific session.
   */
  async revokeSession(sessionId: string) {
    return this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Revoke all sessions for a user (logout everywhere).
   */
  async revokeAllUserSessions(userId: string) {
    return this.prisma.session.deleteMany({
      where: { userId },
    });
  }
}
