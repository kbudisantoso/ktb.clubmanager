import { SetMetadata } from '@nestjs/common';

export const SUPER_ADMIN_KEY = 'super_admin_only';

/**
 * Decorator to mark endpoint as Super Admin only.
 * The SuperAdminGuard will validate user.isSuperAdmin = true.
 *
 * Usage: @SuperAdminOnly()
 */
export const SuperAdminOnly = () => SetMetadata(SUPER_ADMIN_KEY, true);
