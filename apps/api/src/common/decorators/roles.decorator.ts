import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for an endpoint.
 * Works with ClubContextGuard - user must have one of the specified roles.
 *
 * Usage: @RequireRoles('ADMIN', 'OWNER')
 */
export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);
