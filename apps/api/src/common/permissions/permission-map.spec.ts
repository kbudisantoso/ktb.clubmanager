import { describe, it, expect } from 'vitest';
import { ClubRole } from '../../../../../prisma/generated/client/index.js';
import {
  getRolePermissions,
  getUserPermissions,
  checkPermission,
  hasAnyPermission,
  hasAllPermissions,
  checkBoardMember,
  ROLE_PERMISSION_MAP,
  BOARD_ROLES,
} from './permission-map.js';
import { Permission } from './permissions.enum.js';

describe('permission-map', () => {
  describe('ROLE_PERMISSION_MAP', () => {
    it('should define permissions for all ClubRole values', () => {
      const allRoles = Object.values(ClubRole);
      for (const role of allRoles) {
        expect(ROLE_PERMISSION_MAP[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSION_MAP[role])).toBe(true);
      }
    });
  });

  describe('BOARD_ROLES', () => {
    it('should include OWNER, TREASURER, SECRETARY', () => {
      expect(BOARD_ROLES).toContain(ClubRole.OWNER);
      expect(BOARD_ROLES).toContain(ClubRole.TREASURER);
      expect(BOARD_ROLES).toContain(ClubRole.SECRETARY);
    });

    it('should NOT include ADMIN (technical role, not board)', () => {
      expect(BOARD_ROLES).not.toContain(ClubRole.ADMIN);
    });

    it('should NOT include MEMBER', () => {
      expect(BOARD_ROLES).not.toContain(ClubRole.MEMBER);
    });
  });

  describe('getRolePermissions', () => {
    it('should return all permissions for OWNER', () => {
      const permissions = getRolePermissions(ClubRole.OWNER);
      // OWNER has all critical permissions
      expect(permissions).toContain(Permission.MEMBER_CREATE);
      expect(permissions).toContain(Permission.MEMBER_READ);
      expect(permissions).toContain(Permission.MEMBER_UPDATE);
      expect(permissions).toContain(Permission.MEMBER_DELETE);
      expect(permissions).toContain(Permission.FINANCE_CREATE);
      expect(permissions).toContain(Permission.FINANCE_READ);
      expect(permissions).toContain(Permission.FINANCE_UPDATE);
      expect(permissions).toContain(Permission.FINANCE_DELETE);
      expect(permissions).toContain(Permission.CLUB_DELETE);
      expect(permissions).toContain(Permission.CLUB_TRANSFER);
      expect(permissions).toContain(Permission.ROLE_ASSIGN_OWNER);
      expect(permissions).toContain(Permission.USERS_CREATE);
      expect(permissions).toContain(Permission.USERS_DELETE);
      expect(permissions).toContain(Permission.CLUB_SETTINGS);
    });

    it('should return ONLY user management and settings for ADMIN (technical role, NOT board)', () => {
      const permissions = getRolePermissions(ClubRole.ADMIN);
      // ADMIN is purely technical - NOT a board member
      expect(permissions).toContain(Permission.USERS_CREATE);
      expect(permissions).toContain(Permission.USERS_READ);
      expect(permissions).toContain(Permission.USERS_UPDATE);
      expect(permissions).toContain(Permission.USERS_DELETE);
      expect(permissions).toContain(Permission.CLUB_SETTINGS);
      expect(permissions).toContain(Permission.PROFILE_READ);
      expect(permissions).toContain(Permission.PROFILE_UPDATE);
      expect(permissions).toContain(Permission.DASHBOARD_READ);
      // ADMIN has NO access to members or finance
      expect(permissions).not.toContain(Permission.FINANCE_CREATE);
      expect(permissions).not.toContain(Permission.FINANCE_READ);
      expect(permissions).not.toContain(Permission.FINANCE_UPDATE);
      expect(permissions).not.toContain(Permission.FINANCE_DELETE);
      expect(permissions).not.toContain(Permission.MEMBER_CREATE);
      expect(permissions).not.toContain(Permission.MEMBER_READ);
      expect(permissions).not.toContain(Permission.MEMBER_UPDATE);
      expect(permissions).not.toContain(Permission.MEMBER_DELETE);
      // ADMIN has NO club-level destructive permissions
      expect(permissions).not.toContain(Permission.CLUB_DELETE);
      expect(permissions).not.toContain(Permission.CLUB_TRANSFER);
      expect(permissions).not.toContain(Permission.ROLE_ASSIGN_OWNER);
    });

    it('should return finance and member permissions for TREASURER', () => {
      const permissions = getRolePermissions(ClubRole.TREASURER);
      // Full finance access
      expect(permissions).toContain(Permission.FINANCE_CREATE);
      expect(permissions).toContain(Permission.FINANCE_READ);
      expect(permissions).toContain(Permission.FINANCE_UPDATE);
      expect(permissions).toContain(Permission.FINANCE_DELETE);
      // Full member CRUD
      expect(permissions).toContain(Permission.MEMBER_CREATE);
      expect(permissions).toContain(Permission.MEMBER_READ);
      expect(permissions).toContain(Permission.MEMBER_UPDATE);
      expect(permissions).toContain(Permission.MEMBER_DELETE);
      expect(permissions).toContain(Permission.MEMBER_EXPORT);
      // No club-level destructive permissions
      expect(permissions).not.toContain(Permission.CLUB_DELETE);
      expect(permissions).not.toContain(Permission.CLUB_TRANSFER);
      expect(permissions).not.toContain(Permission.ROLE_ASSIGN_OWNER);
    });

    it('should return full member CRUD and finance read for SECRETARY', () => {
      const permissions = getRolePermissions(ClubRole.SECRETARY);
      // SECRETARY has full member CRUD (clubs vary in who manages members)
      expect(permissions).toContain(Permission.MEMBER_CREATE);
      expect(permissions).toContain(Permission.MEMBER_READ);
      expect(permissions).toContain(Permission.MEMBER_UPDATE);
      expect(permissions).toContain(Permission.MEMBER_DELETE);
      expect(permissions).toContain(Permission.MEMBER_EXPORT);
      // SECRETARY has finance read-only
      expect(permissions).toContain(Permission.FINANCE_READ);
      expect(permissions).not.toContain(Permission.FINANCE_CREATE);
      expect(permissions).not.toContain(Permission.FINANCE_UPDATE);
      expect(permissions).not.toContain(Permission.FINANCE_DELETE);
      // SECRETARY has protocol management
      expect(permissions).toContain(Permission.PROTOCOL_CREATE);
      expect(permissions).toContain(Permission.PROTOCOL_READ);
      expect(permissions).toContain(Permission.PROTOCOL_UPDATE);
      expect(permissions).toContain(Permission.PROTOCOL_DELETE);
    });

    it('should return minimal permissions for MEMBER', () => {
      const permissions = getRolePermissions(ClubRole.MEMBER);
      // MEMBER can only view dashboard and own profile
      expect(permissions).toContain(Permission.PROFILE_READ);
      expect(permissions).toContain(Permission.PROFILE_UPDATE);
      expect(permissions).toContain(Permission.DASHBOARD_READ);
      // Minimal permissions count
      expect(permissions.length).toBeLessThan(5);
      // No member management
      expect(permissions).not.toContain(Permission.MEMBER_CREATE);
      expect(permissions).not.toContain(Permission.MEMBER_DELETE);
      // No finance
      expect(permissions).not.toContain(Permission.FINANCE_READ);
      expect(permissions).not.toContain(Permission.FINANCE_CREATE);
    });

    it('should return a copy, not the original array', () => {
      const permissions1 = getRolePermissions(ClubRole.OWNER);
      const permissions2 = getRolePermissions(ClubRole.OWNER);
      expect(permissions1).not.toBe(permissions2);
      expect(permissions1).toEqual(permissions2);
    });
  });

  describe('getUserPermissions', () => {
    it('should combine permissions from multiple roles', () => {
      const permissions = getUserPermissions([ClubRole.TREASURER, ClubRole.ADMIN]);
      // TREASURER permissions
      expect(permissions).toContain(Permission.FINANCE_CREATE);
      expect(permissions).toContain(Permission.MEMBER_CREATE);
      // ADMIN permissions
      expect(permissions).toContain(Permission.CLUB_SETTINGS);
      expect(permissions).toContain(Permission.USERS_CREATE);
    });

    it('should deduplicate permissions', () => {
      const permissions = getUserPermissions([ClubRole.OWNER, ClubRole.ADMIN]);
      const unique = [...new Set(permissions)];
      expect(permissions.length).toBe(unique.length);
    });

    it('should return empty array for empty roles', () => {
      const permissions = getUserPermissions([]);
      expect(permissions).toEqual([]);
    });

    it('should handle single role', () => {
      const permissions = getUserPermissions([ClubRole.MEMBER]);
      const rolePermissions = getRolePermissions(ClubRole.MEMBER);
      expect(permissions).toEqual(rolePermissions);
    });
  });

  describe('checkPermission', () => {
    it('should return true when permission exists', () => {
      const permissions = [Permission.MEMBER_READ, Permission.MEMBER_CREATE];
      expect(checkPermission(permissions, Permission.MEMBER_READ)).toBe(true);
    });

    it('should return false when permission missing', () => {
      const permissions = [Permission.MEMBER_READ];
      expect(checkPermission(permissions, Permission.MEMBER_CREATE)).toBe(false);
    });

    it('should return false for empty permissions array', () => {
      expect(checkPermission([], Permission.MEMBER_READ)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when any permission matches', () => {
      const permissions = [Permission.MEMBER_READ];
      expect(hasAnyPermission(permissions, [Permission.MEMBER_READ, Permission.FINANCE_READ])).toBe(
        true
      );
    });

    it('should return false when no permissions match', () => {
      const permissions = [Permission.MEMBER_READ];
      expect(hasAnyPermission(permissions, [Permission.FINANCE_READ, Permission.CLUB_DELETE])).toBe(
        false
      );
    });

    it('should return false for empty required array', () => {
      const permissions = [Permission.MEMBER_READ];
      expect(hasAnyPermission(permissions, [])).toBe(false);
    });

    it('should return false for empty permissions array', () => {
      expect(hasAnyPermission([], [Permission.MEMBER_READ])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when all permissions present', () => {
      const permissions = [
        Permission.MEMBER_READ,
        Permission.MEMBER_CREATE,
        Permission.FINANCE_READ,
      ];
      expect(
        hasAllPermissions(permissions, [Permission.MEMBER_READ, Permission.MEMBER_CREATE])
      ).toBe(true);
    });

    it('should return false when missing a permission', () => {
      const permissions = [Permission.MEMBER_READ];
      expect(
        hasAllPermissions(permissions, [Permission.MEMBER_READ, Permission.MEMBER_CREATE])
      ).toBe(false);
    });

    it('should return true for empty required array', () => {
      const permissions = [Permission.MEMBER_READ];
      expect(hasAllPermissions(permissions, [])).toBe(true);
    });

    it('should return false for empty permissions array with required permissions', () => {
      expect(hasAllPermissions([], [Permission.MEMBER_READ])).toBe(false);
    });
  });

  describe('checkBoardMember', () => {
    it('should return true for OWNER', () => {
      expect(checkBoardMember([ClubRole.OWNER])).toBe(true);
    });

    it('should return true for TREASURER', () => {
      expect(checkBoardMember([ClubRole.TREASURER])).toBe(true);
    });

    it('should return true for SECRETARY', () => {
      expect(checkBoardMember([ClubRole.SECRETARY])).toBe(true);
    });

    it('should return false for ADMIN (technical role, not board)', () => {
      expect(checkBoardMember([ClubRole.ADMIN])).toBe(false);
    });

    it('should return false for MEMBER', () => {
      expect(checkBoardMember([ClubRole.MEMBER])).toBe(false);
    });

    it('should return true when any role is a board role', () => {
      expect(checkBoardMember([ClubRole.MEMBER, ClubRole.SECRETARY])).toBe(true);
    });

    it('should return false for empty roles array', () => {
      expect(checkBoardMember([])).toBe(false);
    });
  });
});
