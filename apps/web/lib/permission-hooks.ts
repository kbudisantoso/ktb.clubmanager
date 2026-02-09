'use client';

import { useClubStore } from './club-store';
import type { TierFeatures } from './club-store';
import { useClubPermissionsQuery } from '@/hooks/use-club-permissions';

/**
 * Hook for checking if user has a specific permission in the active club.
 * Reads permissions from TanStack Query (not localStorage).
 *
 * @param permission - Permission string (e.g., 'member:create')
 * @returns boolean indicating if user has the permission
 */
export function useHasPermission(permission: string): boolean {
  const activeClubSlug = useClubStore((state) => state.activeClubSlug);
  const { data } = useClubPermissionsQuery(activeClubSlug);

  if (!activeClubSlug || !data) {
    return false;
  }

  return data.permissions?.includes(permission) ?? false;
}

/**
 * Hook for checking if user has any of the specified permissions.
 *
 * @param permissions - Array of permission strings (OR logic)
 * @returns boolean indicating if user has any of the permissions
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const activeClubSlug = useClubStore((state) => state.activeClubSlug);
  const { data } = useClubPermissionsQuery(activeClubSlug);

  if (!activeClubSlug || !data) {
    return false;
  }

  const userPermissions = data.permissions ?? [];
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * Hook for checking if a tier feature is enabled for the active club.
 *
 * @param feature - Feature name ('sepa' | 'reports' | 'bankImport')
 * @returns boolean indicating if the feature is enabled
 */
export function useTierFeature(feature: keyof TierFeatures): boolean {
  const activeClubSlug = useClubStore((state) => state.activeClubSlug);
  const { data } = useClubPermissionsQuery(activeClubSlug);

  if (!activeClubSlug || !data) {
    // Default to true to avoid flash of disabled state
    return true;
  }

  return data.features?.[feature] ?? true;
}

/**
 * Hook for checking both permission and tier feature.
 * Useful for UI elements that require both.
 *
 * @param permission - Required permission
 * @param feature - Required tier feature (optional)
 * @returns { hasPermission, hasFeature, canAccess }
 */
export function useCanAccess(
  permission: string,
  feature?: keyof TierFeatures
): { hasPermission: boolean; hasFeature: boolean; canAccess: boolean } {
  const hasPermission = useHasPermission(permission);
  const hasFeature = useTierFeature(feature ?? 'sepa'); // Default doesn't matter if feature undefined

  // If no feature requirement, only check permission
  if (!feature) {
    return { hasPermission, hasFeature: true, canAccess: hasPermission };
  }

  return {
    hasPermission,
    hasFeature,
    canAccess: hasPermission && hasFeature,
  };
}

/**
 * Hook for getting the active club's permissions.
 * Reads from TanStack Query (not localStorage).
 */
export function usePermissions(): string[] {
  const activeClubSlug = useClubStore((state) => state.activeClubSlug);
  const { data } = useClubPermissionsQuery(activeClubSlug);

  if (!activeClubSlug || !data) {
    return [];
  }

  return data.permissions ?? [];
}
