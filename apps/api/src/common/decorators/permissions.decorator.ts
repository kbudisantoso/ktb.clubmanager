import { SetMetadata } from '@nestjs/common';

import type { Permission } from '../permissions/permissions.enum.js';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require a single permission for an endpoint.
 *
 * Usage: @RequirePermission('member:create')
 *
 * The PermissionGuard will check if the user's role includes this permission.
 */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSIONS_KEY, [permission]);

/**
 * Decorator to require any of the specified permissions (OR logic).
 *
 * Usage: @RequirePermissions(['member:read', 'member:update'])
 *
 * The user needs at least ONE of the listed permissions.
 *
 * For AND logic, stack multiple decorators:
 * @RequirePermissions(['finance:read'])
 * @RequirePermissions(['member:read'])
 *
 * This requires the user to have permissions from BOTH groups.
 */
export const RequirePermissions = (permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
