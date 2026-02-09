import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
// SEC-012: API returns 404 for both non-existent and unauthorized clubs (no information leakage)
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CLUB_CONTEXT_KEY, ClubContext } from '../decorators/club-context.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { hasAccess, hasAnyRole } from '../permissions/club-permissions.js';
import { ClubRole } from '../../../../../prisma/generated/client/index.js';

@Injectable()
export class ClubContextGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint requires club context
    const requiresClubContext = this.reflector.getAllAndOverride<boolean>(CLUB_CONTEXT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresClubContext) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Authentifizierung erforderlich');
    }

    // Get club slug from route params or header
    const clubSlug = request.params.slug || request.headers['x-club-slug'];

    if (!clubSlug) {
      throw new ForbiddenException('Vereinskontext erforderlich');
    }

    // Verify user has access to this club
    const clubUser = await this.prisma.clubUser.findFirst({
      where: {
        userId,
        club: {
          slug: clubSlug,
          deletedAt: null,
        },
        status: 'ACTIVE',
      },
      include: {
        club: {
          select: { id: true, slug: true },
        },
      },
    });

    if (!clubUser) {
      // SEC-012: Always return 404 regardless of whether club exists (no information leakage)
      throw new NotFoundException('Verein nicht gefunden');
    }

    // User exists but has no roles = no access
    if (!hasAccess(clubUser.roles)) {
      throw new ForbiddenException('Kein Zugriff auf diesen Verein');
    }

    // Check role requirements (user must have at least one of the required roles)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const userHasRequiredRole = hasAnyRole(clubUser.roles, requiredRoles as ClubRole[]);
      if (!userHasRequiredRole) {
        throw new ForbiddenException(`Erforderliche Rolle: ${requiredRoles.join(' oder ')}`);
      }
    }

    // Attach club context to request
    const clubContext: ClubContext = {
      clubId: clubUser.club.id,
      clubSlug: clubUser.club.slug,
      roles: clubUser.roles,
    };
    request.clubContext = clubContext;

    return true;
  }
}
