'use client';

import { useActiveClub } from './club-store';

/**
 * Permission groups for club access control.
 * Must match backend definitions in apps/api/src/common/permissions/club-permissions.ts
 *
 * Key distinction:
 * - ADMIN is a technical role (settings, user management)
 * - ADMIN alone does NOT grant access to internal club content (dashboard, protocols, etc.)
 * - Typically an ADMIN will also have MEMBER role, but external service providers may only have ADMIN
 * - Use CLUB_MEMBERS for internal club content access
 */
export const PERMISSION_GROUPS = {
  /**
   * Club members - access to internal club content (NOT ADMIN).
   * Dashboard (read-only), protocols with "club" visibility, etc.
   * Note: Member list access requires separate privacy consideration.
   */
  CLUB_MEMBERS: ['OWNER', 'TREASURER', 'SECRETARY', 'MEMBER'] as const,

  /** Board members - access to confidential documents (ADMIN is NOT included) */
  BOARD_MEMBERS: ['OWNER', 'TREASURER', 'SECRETARY'] as const,

  /** User management - invitations, access requests, role assignment */
  USER_MANAGERS: ['OWNER', 'ADMIN'] as const,

  /** Finance management - bookkeeping, fees, SEPA, reports */
  FINANCE_MANAGERS: ['OWNER', 'TREASURER'] as const,

  /** Settings management - club settings, invite codes */
  SETTINGS_MANAGERS: ['OWNER', 'ADMIN'] as const,

  /** Protocol management - create/edit protocols */
  PROTOCOL_MANAGERS: ['OWNER', 'SECRETARY'] as const,
} as const;

/**
 * Check if user's roles include any role from the required group.
 * Returns true if at least one role matches.
 */
function hasPermission(
  userRoles: string[],
  requiredGroup: readonly string[]
): boolean {
  return userRoles.some((role) => requiredGroup.includes(role));
}

/**
 * Hook that returns all permission checks for the active club.
 * Use this for components that need multiple permission checks.
 */
export function useClubPermissions() {
  const activeClub = useActiveClub();
  const roles = activeClub?.roles ?? [];

  const isClubMember = hasPermission(roles, PERMISSION_GROUPS.CLUB_MEMBERS);
  const canManageSettings = hasPermission(roles, PERMISSION_GROUPS.SETTINGS_MANAGERS);

  return {
    /** User's roles in the active club */
    roles,
    /**
     * User has at least one role (has any kind of access to the club).
     * Note: This does NOT mean they can see club content - use isClubMember for that.
     */
    hasAccess: roles.length > 0,
    /**
     * User is a club member with access to internal club content.
     * Includes: OWNER, TREASURER, SECRETARY, MEMBER.
     * Excludes: ADMIN (external technical admin).
     */
    isClubMember,
    /**
     * User has ADMIN role but no club member role (e.g., external service provider).
     * Has settings/user management access but no internal club content.
     */
    isAdminOnly: canManageSettings && !isClubMember,
    /** User is the club owner */
    isOwner: roles.includes('OWNER'),
    /** User is a board member (OWNER, TREASURER, or SECRETARY - NOT ADMIN) */
    isBoardMember: hasPermission(roles, PERMISSION_GROUPS.BOARD_MEMBERS),
    /** User can manage other users (OWNER or ADMIN) */
    canManageUsers: hasPermission(roles, PERMISSION_GROUPS.USER_MANAGERS),
    /** User can access finance features (OWNER or TREASURER) */
    canManageFinances: hasPermission(roles, PERMISSION_GROUPS.FINANCE_MANAGERS),
    /** User can manage club settings (OWNER or ADMIN) */
    canManageSettings,
    /** User can manage protocols (OWNER or SECRETARY) */
    canManageProtocols: hasPermission(roles, PERMISSION_GROUPS.PROTOCOL_MANAGERS),
  };
}

/**
 * Hook for checking if user can manage club settings.
 * Returns true if user is OWNER or ADMIN in the active club.
 */
export function useCanManageSettings(): boolean {
  const { canManageSettings } = useClubPermissions();
  return canManageSettings;
}

/**
 * Hook for checking if user can manage other users.
 * Returns true if user is OWNER or ADMIN in the active club.
 */
export function useCanManageUsers(): boolean {
  const { canManageUsers } = useClubPermissions();
  return canManageUsers;
}

/**
 * Hook for checking if user can access finance features.
 * Returns true if user is OWNER or TREASURER in the active club.
 */
export function useCanManageFinances(): boolean {
  const { canManageFinances } = useClubPermissions();
  return canManageFinances;
}

/**
 * Hook for checking if user is a board member.
 * Board members are OWNER, TREASURER, or SECRETARY (NOT ADMIN).
 */
export function useIsBoardMember(): boolean {
  const { isBoardMember } = useClubPermissions();
  return isBoardMember;
}

/**
 * Hook for checking if user is the club owner.
 */
export function useIsOwner(): boolean {
  const { isOwner } = useClubPermissions();
  return isOwner;
}

/**
 * Hook for checking if user is a club member (has access to internal content).
 * Returns true for OWNER, TREASURER, SECRETARY, MEMBER.
 * Returns false for ADMIN-only users (external administrators).
 */
export function useIsClubMember(): boolean {
  const { isClubMember } = useClubPermissions();
  return isClubMember;
}

/**
 * Hook for checking if user has only ADMIN role without club member access.
 * Such users (e.g., external service providers) have settings/user management access
 * but no internal club content access.
 */
export function useIsAdminOnly(): boolean {
  const { isAdminOnly } = useClubPermissions();
  return isAdminOnly;
}
