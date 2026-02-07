import { ClubRole } from '../../../../../prisma/generated/client/index.js';

/**
 * Permission groups for club access control.
 *
 * Key distinction:
 * - ADMIN is a technical role (settings, user management)
 * - ADMIN alone does NOT grant access to internal club content (dashboard, protocols, etc.)
 * - Typically an ADMIN will also have MEMBER role, but external service providers may only have ADMIN
 * - Use CLUB_MEMBERS for internal club content access
 *
 * Groups:
 * - CLUB_MEMBERS: Internal club content access (dashboard, protocols with "club" visibility)
 * - BOARD_MEMBERS: Can see confidential board protocols
 * - USER_MANAGERS: Can manage users, invitations, access requests
 * - FINANCE_MANAGERS: Can access bookkeeping, fees, SEPA
 * - SETTINGS_MANAGERS: Can change club settings
 * - PROTOCOL_MANAGERS: Can create/edit protocols
 */
export const PERMISSION_GROUPS = {
  /**
   * Club members - access to internal club content (NOT ADMIN).
   * Dashboard (read-only), protocols with "club" visibility, etc.
   * Note: Member list access requires separate privacy consideration.
   */
  CLUB_MEMBERS: [ClubRole.OWNER, ClubRole.TREASURER, ClubRole.SECRETARY, ClubRole.MEMBER] as const,

  /** Board members - access to confidential documents (ADMIN is NOT included) */
  BOARD_MEMBERS: [ClubRole.OWNER, ClubRole.TREASURER, ClubRole.SECRETARY] as const,

  /** User management - invitations, access requests, role assignment */
  USER_MANAGERS: [ClubRole.OWNER, ClubRole.ADMIN] as const,

  /** Finance management - bookkeeping, fees, SEPA, reports */
  FINANCE_MANAGERS: [ClubRole.OWNER, ClubRole.TREASURER] as const,

  /** Settings management - club settings, invite codes */
  SETTINGS_MANAGERS: [ClubRole.OWNER, ClubRole.ADMIN] as const,

  /** Protocol management - create/edit protocols */
  PROTOCOL_MANAGERS: [ClubRole.OWNER, ClubRole.SECRETARY] as const,
} as const;

/**
 * Check if user's roles include any role from the required group.
 * Returns true if at least one role matches.
 */
export function hasPermission(userRoles: ClubRole[], requiredGroup: readonly ClubRole[]): boolean {
  return userRoles.some((role) => requiredGroup.includes(role));
}

/**
 * Check if user has at least one of the specified roles.
 */
export function hasAnyRole(userRoles: ClubRole[], allowedRoles: ClubRole[]): boolean {
  return userRoles.some((role) => allowedRoles.includes(role));
}

/**
 * Check if user is a board member (OWNER, TREASURER, or SECRETARY).
 * ADMIN is NOT a board member.
 */
export function isBoardMember(roles: ClubRole[]): boolean {
  return hasPermission(roles, PERMISSION_GROUPS.BOARD_MEMBERS);
}

/**
 * Check if user can manage other users (OWNER or ADMIN).
 */
export function canManageUsers(roles: ClubRole[]): boolean {
  return hasPermission(roles, PERMISSION_GROUPS.USER_MANAGERS);
}

/**
 * Check if user can access finance features (OWNER or TREASURER).
 */
export function canManageFinances(roles: ClubRole[]): boolean {
  return hasPermission(roles, PERMISSION_GROUPS.FINANCE_MANAGERS);
}

/**
 * Check if user can manage club settings (OWNER or ADMIN).
 */
export function canManageSettings(roles: ClubRole[]): boolean {
  return hasPermission(roles, PERMISSION_GROUPS.SETTINGS_MANAGERS);
}

/**
 * Check if user can manage protocols (OWNER or SECRETARY).
 */
export function canManageProtocols(roles: ClubRole[]): boolean {
  return hasPermission(roles, PERMISSION_GROUPS.PROTOCOL_MANAGERS);
}

/**
 * Check if user is an owner.
 */
export function isOwner(roles: ClubRole[]): boolean {
  return roles.includes(ClubRole.OWNER);
}

/**
 * Check if user has any access (at least one role assigned).
 * Empty roles array = no access.
 * Note: This does NOT mean they can see club content - use isClubMember for that.
 */
export function hasAccess(roles: ClubRole[]): boolean {
  return roles.length > 0;
}

/**
 * Check if user is a club member with access to internal club content.
 * Includes: OWNER, TREASURER, SECRETARY, MEMBER.
 * Excludes: ADMIN (external technical admin).
 */
export function isClubMember(roles: ClubRole[]): boolean {
  return hasPermission(roles, PERMISSION_GROUPS.CLUB_MEMBERS);
}

/**
 * Check if user has only ADMIN role without club member access.
 * Such users (e.g., external service providers) have settings/user management access
 * but no internal club content access.
 */
export function isAdminOnly(roles: ClubRole[]): boolean {
  return canManageSettings(roles) && !isClubMember(roles);
}

/**
 * Roles that can be assigned by USER_MANAGERS (ADMIN/OWNER).
 * ADMIN can assign: MEMBER, TREASURER, SECRETARY
 * OWNER can additionally assign: ADMIN
 */
export const ASSIGNABLE_ROLES_BY_ADMIN = [
  ClubRole.MEMBER,
  ClubRole.TREASURER,
  ClubRole.SECRETARY,
] as const;

export const ASSIGNABLE_ROLES_BY_OWNER = [...ASSIGNABLE_ROLES_BY_ADMIN, ClubRole.ADMIN] as const;

/**
 * Get the roles that a user can assign based on their own roles.
 */
export function getAssignableRoles(assignerRoles: ClubRole[]): ClubRole[] {
  if (isOwner(assignerRoles)) {
    return [...ASSIGNABLE_ROLES_BY_OWNER];
  }
  if (canManageUsers(assignerRoles)) {
    return [...ASSIGNABLE_ROLES_BY_ADMIN];
  }
  return [];
}
