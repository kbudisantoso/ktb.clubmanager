'use client';

/**
 * @deprecated This module is deprecated. Use `useClubPermissionsQuery` from
 * `@/hooks/use-club-permissions` instead. TanStack Query handles fetching
 * and caching automatically (SEC-031).
 *
 * This file is kept for backwards compatibility during migration.
 */

export {
  useClubPermissionsQuery,
  useInvalidatePermissions,
  permissionKeys,
} from '@/hooks/use-club-permissions';
