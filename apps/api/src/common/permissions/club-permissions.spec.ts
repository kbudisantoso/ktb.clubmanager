import { describe, it, expect } from 'vitest';
import { ClubRole } from '../../../../../prisma/generated/client/index.js';
import {
  PERMISSION_GROUPS,
  hasPermission,
  hasAnyRole,
  isBoardMember,
  canManageUsers,
  canManageFinances,
  canManageSettings,
  canManageProtocols,
  isOwner,
  hasAccess,
  isClubMember,
  isAdminOnly,
  getAssignableRoles,
  ASSIGNABLE_ROLES_BY_ADMIN,
  ASSIGNABLE_ROLES_BY_OWNER,
} from './club-permissions.js';

describe('club-permissions', () => {
  describe('PERMISSION_GROUPS', () => {
    it('CLUB_MEMBERS includes OWNER, TREASURER, SECRETARY, MEMBER but not ADMIN', () => {
      expect(PERMISSION_GROUPS.CLUB_MEMBERS).toContain(ClubRole.OWNER);
      expect(PERMISSION_GROUPS.CLUB_MEMBERS).toContain(ClubRole.TREASURER);
      expect(PERMISSION_GROUPS.CLUB_MEMBERS).toContain(ClubRole.SECRETARY);
      expect(PERMISSION_GROUPS.CLUB_MEMBERS).toContain(ClubRole.MEMBER);
      expect(PERMISSION_GROUPS.CLUB_MEMBERS).not.toContain(ClubRole.ADMIN);
    });

    it('BOARD_MEMBERS includes OWNER, TREASURER, SECRETARY but not ADMIN or MEMBER', () => {
      expect(PERMISSION_GROUPS.BOARD_MEMBERS).toContain(ClubRole.OWNER);
      expect(PERMISSION_GROUPS.BOARD_MEMBERS).toContain(ClubRole.TREASURER);
      expect(PERMISSION_GROUPS.BOARD_MEMBERS).toContain(ClubRole.SECRETARY);
      expect(PERMISSION_GROUPS.BOARD_MEMBERS).not.toContain(ClubRole.ADMIN);
      expect(PERMISSION_GROUPS.BOARD_MEMBERS).not.toContain(ClubRole.MEMBER);
    });

    it('USER_MANAGERS includes OWNER and ADMIN only', () => {
      expect(PERMISSION_GROUPS.USER_MANAGERS).toContain(ClubRole.OWNER);
      expect(PERMISSION_GROUPS.USER_MANAGERS).toContain(ClubRole.ADMIN);
      expect(PERMISSION_GROUPS.USER_MANAGERS).toHaveLength(2);
    });

    it('SETTINGS_MANAGERS includes OWNER and ADMIN only', () => {
      expect(PERMISSION_GROUPS.SETTINGS_MANAGERS).toContain(ClubRole.OWNER);
      expect(PERMISSION_GROUPS.SETTINGS_MANAGERS).toContain(ClubRole.ADMIN);
      expect(PERMISSION_GROUPS.SETTINGS_MANAGERS).toHaveLength(2);
    });
  });

  describe('hasPermission()', () => {
    it('returns true when user has a role in the required group', () => {
      expect(hasPermission([ClubRole.OWNER], PERMISSION_GROUPS.CLUB_MEMBERS)).toBe(true);
      expect(hasPermission([ClubRole.MEMBER], PERMISSION_GROUPS.CLUB_MEMBERS)).toBe(true);
    });

    it('returns false when user has no role in the required group', () => {
      expect(hasPermission([ClubRole.ADMIN], PERMISSION_GROUPS.CLUB_MEMBERS)).toBe(false);
      expect(hasPermission([ClubRole.MEMBER], PERMISSION_GROUPS.BOARD_MEMBERS)).toBe(false);
    });

    it('returns true if any role matches', () => {
      expect(hasPermission([ClubRole.ADMIN, ClubRole.MEMBER], PERMISSION_GROUPS.CLUB_MEMBERS)).toBe(
        true
      );
    });

    it('returns false for empty roles array', () => {
      expect(hasPermission([], PERMISSION_GROUPS.CLUB_MEMBERS)).toBe(false);
    });
  });

  describe('hasAnyRole()', () => {
    it('returns true when user has any of the specified roles', () => {
      expect(hasAnyRole([ClubRole.OWNER], [ClubRole.OWNER, ClubRole.ADMIN])).toBe(true);
    });

    it('returns false when user has none of the specified roles', () => {
      expect(hasAnyRole([ClubRole.MEMBER], [ClubRole.OWNER, ClubRole.ADMIN])).toBe(false);
    });
  });

  describe('isBoardMember()', () => {
    it('returns true for OWNER', () => {
      expect(isBoardMember([ClubRole.OWNER])).toBe(true);
    });

    it('returns true for TREASURER', () => {
      expect(isBoardMember([ClubRole.TREASURER])).toBe(true);
    });

    it('returns true for SECRETARY', () => {
      expect(isBoardMember([ClubRole.SECRETARY])).toBe(true);
    });

    it('returns false for ADMIN', () => {
      expect(isBoardMember([ClubRole.ADMIN])).toBe(false);
    });

    it('returns false for MEMBER', () => {
      expect(isBoardMember([ClubRole.MEMBER])).toBe(false);
    });
  });

  describe('canManageUsers()', () => {
    it('returns true for OWNER', () => {
      expect(canManageUsers([ClubRole.OWNER])).toBe(true);
    });

    it('returns true for ADMIN', () => {
      expect(canManageUsers([ClubRole.ADMIN])).toBe(true);
    });

    it('returns false for MEMBER', () => {
      expect(canManageUsers([ClubRole.MEMBER])).toBe(false);
    });

    it('returns false for TREASURER', () => {
      expect(canManageUsers([ClubRole.TREASURER])).toBe(false);
    });
  });

  describe('canManageFinances()', () => {
    it('returns true for OWNER', () => {
      expect(canManageFinances([ClubRole.OWNER])).toBe(true);
    });

    it('returns true for TREASURER', () => {
      expect(canManageFinances([ClubRole.TREASURER])).toBe(true);
    });

    it('returns false for ADMIN', () => {
      expect(canManageFinances([ClubRole.ADMIN])).toBe(false);
    });

    it('returns false for MEMBER', () => {
      expect(canManageFinances([ClubRole.MEMBER])).toBe(false);
    });
  });

  describe('canManageSettings()', () => {
    it('returns true for OWNER', () => {
      expect(canManageSettings([ClubRole.OWNER])).toBe(true);
    });

    it('returns true for ADMIN', () => {
      expect(canManageSettings([ClubRole.ADMIN])).toBe(true);
    });

    it('returns false for MEMBER', () => {
      expect(canManageSettings([ClubRole.MEMBER])).toBe(false);
    });
  });

  describe('canManageProtocols()', () => {
    it('returns true for OWNER', () => {
      expect(canManageProtocols([ClubRole.OWNER])).toBe(true);
    });

    it('returns true for SECRETARY', () => {
      expect(canManageProtocols([ClubRole.SECRETARY])).toBe(true);
    });

    it('returns false for ADMIN', () => {
      expect(canManageProtocols([ClubRole.ADMIN])).toBe(false);
    });

    it('returns false for TREASURER', () => {
      expect(canManageProtocols([ClubRole.TREASURER])).toBe(false);
    });
  });

  describe('isOwner()', () => {
    it('returns true when OWNER role is present', () => {
      expect(isOwner([ClubRole.OWNER])).toBe(true);
      expect(isOwner([ClubRole.OWNER, ClubRole.ADMIN])).toBe(true);
    });

    it('returns false when OWNER role is not present', () => {
      expect(isOwner([ClubRole.ADMIN])).toBe(false);
      expect(isOwner([ClubRole.MEMBER])).toBe(false);
      expect(isOwner([])).toBe(false);
    });
  });

  describe('hasAccess()', () => {
    it('returns true when user has at least one role', () => {
      expect(hasAccess([ClubRole.MEMBER])).toBe(true);
      expect(hasAccess([ClubRole.ADMIN])).toBe(true);
    });

    it('returns false when user has no roles', () => {
      expect(hasAccess([])).toBe(false);
    });
  });

  describe('isClubMember()', () => {
    it('returns true for OWNER', () => {
      expect(isClubMember([ClubRole.OWNER])).toBe(true);
    });

    it('returns true for TREASURER', () => {
      expect(isClubMember([ClubRole.TREASURER])).toBe(true);
    });

    it('returns true for SECRETARY', () => {
      expect(isClubMember([ClubRole.SECRETARY])).toBe(true);
    });

    it('returns true for MEMBER', () => {
      expect(isClubMember([ClubRole.MEMBER])).toBe(true);
    });

    it('returns false for ADMIN only', () => {
      expect(isClubMember([ClubRole.ADMIN])).toBe(false);
    });

    it('returns true for ADMIN with MEMBER role', () => {
      expect(isClubMember([ClubRole.ADMIN, ClubRole.MEMBER])).toBe(true);
    });
  });

  describe('isAdminOnly()', () => {
    it('returns true for ADMIN without club member roles', () => {
      expect(isAdminOnly([ClubRole.ADMIN])).toBe(true);
    });

    it('returns false for ADMIN with MEMBER role', () => {
      expect(isAdminOnly([ClubRole.ADMIN, ClubRole.MEMBER])).toBe(false);
    });

    it('returns false for OWNER (even though they can manage settings)', () => {
      expect(isAdminOnly([ClubRole.OWNER])).toBe(false);
    });

    it('returns false for MEMBER only', () => {
      expect(isAdminOnly([ClubRole.MEMBER])).toBe(false);
    });

    it('returns false for empty roles', () => {
      expect(isAdminOnly([])).toBe(false);
    });
  });

  describe('getAssignableRoles()', () => {
    it('OWNER can assign MEMBER, TREASURER, SECRETARY, and ADMIN', () => {
      const roles = getAssignableRoles([ClubRole.OWNER]);
      expect(roles).toContain(ClubRole.MEMBER);
      expect(roles).toContain(ClubRole.TREASURER);
      expect(roles).toContain(ClubRole.SECRETARY);
      expect(roles).toContain(ClubRole.ADMIN);
    });

    it('ADMIN can assign MEMBER, TREASURER, SECRETARY but not ADMIN', () => {
      const roles = getAssignableRoles([ClubRole.ADMIN]);
      expect(roles).toContain(ClubRole.MEMBER);
      expect(roles).toContain(ClubRole.TREASURER);
      expect(roles).toContain(ClubRole.SECRETARY);
      expect(roles).not.toContain(ClubRole.ADMIN);
    });

    it('MEMBER cannot assign any roles', () => {
      const roles = getAssignableRoles([ClubRole.MEMBER]);
      expect(roles).toHaveLength(0);
    });

    it('TREASURER cannot assign any roles', () => {
      const roles = getAssignableRoles([ClubRole.TREASURER]);
      expect(roles).toHaveLength(0);
    });
  });

  describe('ASSIGNABLE_ROLES constants', () => {
    it('ASSIGNABLE_ROLES_BY_ADMIN contains MEMBER, TREASURER, SECRETARY', () => {
      expect(ASSIGNABLE_ROLES_BY_ADMIN).toContain(ClubRole.MEMBER);
      expect(ASSIGNABLE_ROLES_BY_ADMIN).toContain(ClubRole.TREASURER);
      expect(ASSIGNABLE_ROLES_BY_ADMIN).toContain(ClubRole.SECRETARY);
      expect(ASSIGNABLE_ROLES_BY_ADMIN).not.toContain(ClubRole.ADMIN);
    });

    it('ASSIGNABLE_ROLES_BY_OWNER includes all ADMIN assignable roles plus ADMIN', () => {
      expect(ASSIGNABLE_ROLES_BY_OWNER).toContain(ClubRole.MEMBER);
      expect(ASSIGNABLE_ROLES_BY_OWNER).toContain(ClubRole.TREASURER);
      expect(ASSIGNABLE_ROLES_BY_OWNER).toContain(ClubRole.SECRETARY);
      expect(ASSIGNABLE_ROLES_BY_OWNER).toContain(ClubRole.ADMIN);
    });
  });
});
