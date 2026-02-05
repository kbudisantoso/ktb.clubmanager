/**
 * Granular permission constants for authorization.
 *
 * Format: entity:action (e.g., 'member:create', 'finance:read')
 *
 * Permission categories:
 * - member: Membership registry operations
 * - users: ClubUser account management
 * - finance: Financial operations
 * - club: Club-level operations
 * - role: Role assignment operations
 * - profile: Self-profile operations
 * - dashboard: Dashboard access
 * - protocol: Protocol management (post-MVP)
 */
export const Permission = {
  // Member management (Vereinsmitglieder)
  MEMBER_CREATE: 'member:create',
  MEMBER_READ: 'member:read',
  MEMBER_UPDATE: 'member:update',
  MEMBER_DELETE: 'member:delete',
  MEMBER_EXPORT: 'member:export',

  // ClubUser management (Benutzer with app access)
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  // Finance operations
  FINANCE_CREATE: 'finance:create',
  FINANCE_READ: 'finance:read',
  FINANCE_UPDATE: 'finance:update',
  FINANCE_DELETE: 'finance:delete',

  // Club-level operations
  CLUB_SETTINGS: 'club:settings',
  CLUB_DELETE: 'club:delete',
  CLUB_TRANSFER: 'club:transfer',

  // Role assignment (OWNER-exclusive)
  ROLE_ASSIGN_OWNER: 'role:assign-owner',

  // Self-profile operations
  PROFILE_READ: 'profile:read',
  PROFILE_UPDATE: 'profile:update',

  // Dashboard access
  DASHBOARD_READ: 'dashboard:read',

  // Protocol management (post-MVP but defined now)
  PROTOCOL_CREATE: 'protocol:create',
  PROTOCOL_READ: 'protocol:read',
  PROTOCOL_UPDATE: 'protocol:update',
  PROTOCOL_DELETE: 'protocol:delete',
} as const;

/**
 * Permission type - union of all permission string values.
 */
export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * All permission values as an array.
 */
export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);
