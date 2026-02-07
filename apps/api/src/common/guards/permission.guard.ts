import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { Permission } from '../permissions/permissions.enum.js';
import { getUserPermissions, hasAnyPermission } from '../permissions/permission-map.js';

/**
 * Guard that checks if user has required permissions.
 *
 * Must run AFTER ClubContextGuard (needs clubContext set on request).
 *
 * Behavior:
 * 1. Read PERMISSIONS_KEY metadata from handler/class
 * 2. If no permissions required, allow access
 * 3. Super Admin bypass (full access)
 * 4. Derive permissions from user's roles (lazy load + memoize per request)
 * 5. Check if user has ANY of the required permissions (OR logic)
 *
 * Error format follows CONTEXT.md structured error pattern.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if endpoint requires permissions
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // 2. Check Super Admin bypass
    if (await this.isSuperAdmin(request.user?.id)) {
      return true;
    }

    // 3. Get club context (must be set by ClubContextGuard)
    const clubContext = request.clubContext;
    if (!clubContext) {
      throw new ForbiddenException({
        code: 'CLUB_ACCESS_DENIED',
        message: 'Vereinskontext erforderlich',
      });
    }

    // 4. Derive and memoize permissions for this request
    if (!request.userPermissions) {
      request.userPermissions = getUserPermissions(clubContext.roles);
    }

    // 5. Check if user has any required permission (OR logic)
    const hasPermission = hasAnyPermission(request.userPermissions, requiredPermissions);

    if (!hasPermission) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Du hast keine Berechtigung für diese Aktion',
        details: { required: requiredPermissions },
      });
    }

    return true;
  }

  private async isSuperAdmin(userId?: string): Promise<boolean> {
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });
    return user?.isSuperAdmin ?? false;
  }
}
