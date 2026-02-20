import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DEACTIVATION_EXEMPT_KEY } from '../decorators/deactivation-exempt.decorator.js';

/**
 * Guard that blocks write operations (POST/PUT/PATCH/DELETE) on deactivated clubs.
 *
 * Registered globally as position 6 in the guard chain (after PermissionGuard).
 * Requires `request.clubContext` to be set by ClubContextGuard.
 *
 * Two exceptions (marked with @DeactivationExempt()):
 * 1. Club reactivation endpoint
 * 2. GDPR Art. 17 member anonymization endpoint
 */
@Injectable()
export class DeactivatedClubGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only block write operations
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Check if endpoint is exempt from deactivation blocking
    const isExempt = this.reflector.getAllAndOverride<boolean>(DEACTIVATION_EXEMPT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isExempt) {
      return true;
    }

    // No club context = not a club-scoped route (admin routes, auth, etc.)
    const clubContext = request.clubContext;
    if (!clubContext) {
      return true;
    }

    // Check if club is deactivated
    const club = await this.prisma.club.findUnique({
      where: { id: clubContext.clubId },
      select: { deactivatedAt: true },
    });

    if (club?.deactivatedAt) {
      throw new ForbiddenException({
        code: 'CLUB_DEACTIVATED',
        message: 'Dieser Verein wurde deaktiviert und kann nicht mehr bearbeitet werden.',
      });
    }

    return true;
  }
}
