import { ClubRole } from '../../../../../prisma/generated/client/index.js';
import { Permission } from './permissions.enum.js';

/**
 * Role-to-permission mapping based on CONTEXT.md capability matrix.
 *
 * Key rules:
 * - OWNER: ALL permissions (full control)
 * - ADMIN: club:settings, users:* (technical role, NO finance/member access)
 * - TREASURER: finance:*, member:*, profile:*, dashboard:read
 * - SECRETARY: member:*, finance:read, profile:*, dashboard:read
 * - MEMBER: profile:*, dashboard:read
 *
 * Board members (Vorstand): OWNER, TREASURER, SECRETARY
 * Non-board: ADMIN (technical), MEMBER (regular)
 */
export const ROLE_PERMISSION_MAP: Record<ClubRole, readonly Permission[]> = {
  [ClubRole.OWNER]: [
    // All permissions
    Permission.MEMBER_CREATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_DELETE,
    Permission.MEMBER_EXPORT,
    Permission.USERS_CREATE,
    Permission.USERS_READ,
    Permission.USERS_UPDATE,
    Permission.USERS_DELETE,
    Permission.FINANCE_CREATE,
    Permission.FINANCE_READ,
    Permission.FINANCE_UPDATE,
    Permission.FINANCE_DELETE,
    Permission.CLUB_SETTINGS,
    Permission.CLUB_DELETE,
    Permission.CLUB_TRANSFER,
    Permission.ROLE_ASSIGN_OWNER,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.DASHBOARD_READ,
    Permission.PROTOCOL_CREATE,
    Permission.PROTOCOL_READ,
    Permission.PROTOCOL_UPDATE,
    Permission.PROTOCOL_DELETE,
  ],

  [ClubRole.ADMIN]: [
    // Technical role: club settings and user management only
    // NO finance access, NO member access
    Permission.CLUB_SETTINGS,
    Permission.USERS_CREATE,
    Permission.USERS_READ,
    Permission.USERS_UPDATE,
    Permission.USERS_DELETE,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.DASHBOARD_READ,
  ],

  [ClubRole.TREASURER]: [
    // Full finance access + member CRUD
    Permission.FINANCE_CREATE,
    Permission.FINANCE_READ,
    Permission.FINANCE_UPDATE,
    Permission.FINANCE_DELETE,
    Permission.MEMBER_CREATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_DELETE,
    Permission.MEMBER_EXPORT,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.DASHBOARD_READ,
  ],

  [ClubRole.SECRETARY]: [
    // Member CRUD, finance read-only, export
    Permission.MEMBER_CREATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_DELETE,
    Permission.MEMBER_EXPORT,
    Permission.FINANCE_READ,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.DASHBOARD_READ,
    Permission.PROTOCOL_CREATE,
    Permission.PROTOCOL_READ,
    Permission.PROTOCOL_UPDATE,
    Permission.PROTOCOL_DELETE,
  ],

  [ClubRole.MEMBER]: [
    // View/edit own profile, dashboard
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.DASHBOARD_READ,
  ],
};

/**
 * Board roles (Vorstand): OWNER, TREASURER, SECRETARY.
 * Used for protocol visibility and board-only content.
 * ADMIN is NOT a board member (technical role).
 */
export const BOARD_ROLES: readonly ClubRole[] = [
  ClubRole.OWNER,
  ClubRole.TREASURER,
  ClubRole.SECRETARY,
];

/**
 * Get permissions for a single role.
 *
 * @param role - The club role
 * @returns Array of permissions granted by this role
 */
export function getRolePermissions(role: ClubRole): Permission[] {
  return [...ROLE_PERMISSION_MAP[role]];
}

/**
 * Get combined permissions for all roles (deduplicated).
 *
 * @param roles - Array of club roles
 * @returns Deduplicated array of all permissions from all roles
 */
export function getUserPermissions(roles: ClubRole[]): Permission[] {
  const permissionSet = new Set<Permission>();

  for (const role of roles) {
    const rolePermissions = ROLE_PERMISSION_MAP[role];
    if (rolePermissions) {
      for (const permission of rolePermissions) {
        permissionSet.add(permission);
      }
    }
  }

  return [...permissionSet];
}

/**
 * Check if a permission exists in the permissions array.
 *
 * @param permissions - User's permissions
 * @param required - Required permission
 * @returns True if user has the required permission
 */
export function checkPermission(
  permissions: Permission[],
  required: Permission,
): boolean {
  return permissions.includes(required);
}

/**
 * Check if user has ANY of the required permissions (OR logic).
 *
 * @param permissions - User's permissions
 * @param required - Array of permissions (need at least one)
 * @returns True if user has at least one of the required permissions
 */
export function hasAnyPermission(
  permissions: Permission[],
  required: Permission[],
): boolean {
  return required.some((permission) => permissions.includes(permission));
}

/**
 * Check if user has ALL required permissions (AND logic).
 *
 * @param permissions - User's permissions
 * @param required - Array of permissions (need all)
 * @returns True if user has all required permissions
 */
export function hasAllPermissions(
  permissions: Permission[],
  required: Permission[],
): boolean {
  return required.every((permission) => permissions.includes(permission));
}

/**
 * Check if user is a board member based on their roles.
 * Board members: OWNER, TREASURER, SECRETARY (NOT ADMIN).
 *
 * @param roles - User's roles
 * @returns True if user has at least one board role
 */
export function checkBoardMember(roles: ClubRole[]): boolean {
  return roles.some((role) => BOARD_ROLES.includes(role));
}
