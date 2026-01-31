import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CLUB_CONTEXT_KEY,
  ClubContext,
} from '../decorators/club-context.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class ClubContextGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint requires club context
    const requiresClubContext = this.reflector.getAllAndOverride<boolean>(
      CLUB_CONTEXT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresClubContext) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    // Get club slug from route params or header
    const clubSlug = request.params.slug || request.headers['x-club-slug'];

    if (!clubSlug) {
      throw new ForbiddenException('Club context required');
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
      // Check if club exists (for better error message)
      const club = await this.prisma.club.findFirst({
        where: { slug: clubSlug, deletedAt: null },
      });

      if (!club) {
        throw new NotFoundException('Club not found');
      }

      throw new ForbiddenException('No access to this club');
    }

    // Check role requirements
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(clubUser.role)) {
        throw new ForbiddenException(
          `Required role: ${requiredRoles.join(' or ')}`,
        );
      }
    }

    // Attach club context to request
    const clubContext: ClubContext = {
      clubId: clubUser.club.id,
      clubSlug: clubUser.club.slug,
      role: clubUser.role,
    };
    request.clubContext = clubContext;

    return true;
  }
}
