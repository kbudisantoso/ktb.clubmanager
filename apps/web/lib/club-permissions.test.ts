import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  PERMISSION_GROUPS,
  useClubPermissions,
  useCanManageSettings,
  useCanManageUsers,
  useCanManageFinances,
  useIsBoardMember,
  useIsOwner,
  useIsClubMember,
  useIsAdminOnly,
} from './club-permissions';

// Mock the club store
let mockActiveClub: { roles: string[] } | null = null;

vi.mock('./club-store', () => ({
  useActiveClub: () => mockActiveClub,
}));

describe('club-permissions', () => {
  beforeEach(() => {
    mockActiveClub = null;
  });

  describe('PERMISSION_GROUPS', () => {
    it('CLUB_MEMBERS includes OWNER, TREASURER, SECRETARY, MEMBER but not ADMIN', () => {
      expect(PERMISSION_GROUPS.CLUB_MEMBERS).toContain('OWNER');
      expect(PERMISSION_GROUPS.CLUB_MEMBERS).toContain('TREASURER');
      expect(PERMISSION_GROUPS.CLUB_MEMBERS).toContain('SECRETARY');
      expect(PERMISSION_GROUPS.CLUB_MEMBERS).toContain('MEMBER');
      expect(PERMISSION_GROUPS.CLUB_MEMBERS).not.toContain('ADMIN');
    });

    it('BOARD_MEMBERS includes OWNER, TREASURER, SECRETARY but not ADMIN or MEMBER', () => {
      expect(PERMISSION_GROUPS.BOARD_MEMBERS).toContain('OWNER');
      expect(PERMISSION_GROUPS.BOARD_MEMBERS).toContain('TREASURER');
      expect(PERMISSION_GROUPS.BOARD_MEMBERS).toContain('SECRETARY');
      expect(PERMISSION_GROUPS.BOARD_MEMBERS).not.toContain('ADMIN');
      expect(PERMISSION_GROUPS.BOARD_MEMBERS).not.toContain('MEMBER');
    });

    it('USER_MANAGERS includes OWNER and ADMIN only', () => {
      expect(PERMISSION_GROUPS.USER_MANAGERS).toContain('OWNER');
      expect(PERMISSION_GROUPS.USER_MANAGERS).toContain('ADMIN');
      expect(PERMISSION_GROUPS.USER_MANAGERS).toHaveLength(2);
    });

    it('SETTINGS_MANAGERS includes OWNER and ADMIN only', () => {
      expect(PERMISSION_GROUPS.SETTINGS_MANAGERS).toContain('OWNER');
      expect(PERMISSION_GROUPS.SETTINGS_MANAGERS).toContain('ADMIN');
      expect(PERMISSION_GROUPS.SETTINGS_MANAGERS).toHaveLength(2);
    });

    it('FINANCE_MANAGERS includes OWNER and TREASURER only', () => {
      expect(PERMISSION_GROUPS.FINANCE_MANAGERS).toContain('OWNER');
      expect(PERMISSION_GROUPS.FINANCE_MANAGERS).toContain('TREASURER');
      expect(PERMISSION_GROUPS.FINANCE_MANAGERS).toHaveLength(2);
    });

    it('PROTOCOL_MANAGERS includes OWNER and SECRETARY only', () => {
      expect(PERMISSION_GROUPS.PROTOCOL_MANAGERS).toContain('OWNER');
      expect(PERMISSION_GROUPS.PROTOCOL_MANAGERS).toContain('SECRETARY');
      expect(PERMISSION_GROUPS.PROTOCOL_MANAGERS).toHaveLength(2);
    });
  });

  describe('useClubPermissions()', () => {
    it('returns all false when no active club', () => {
      mockActiveClub = null;
      const { result } = renderHook(() => useClubPermissions());

      expect(result.current.roles).toEqual([]);
      expect(result.current.hasAccess).toBe(false);
      expect(result.current.isClubMember).toBe(false);
      expect(result.current.isAdminOnly).toBe(false);
      expect(result.current.isOwner).toBe(false);
      expect(result.current.isBoardMember).toBe(false);
      expect(result.current.canManageUsers).toBe(false);
      expect(result.current.canManageFinances).toBe(false);
      expect(result.current.canManageSettings).toBe(false);
      expect(result.current.canManageProtocols).toBe(false);
    });

    it('returns correct permissions for OWNER', () => {
      mockActiveClub = { roles: ['OWNER'] };
      const { result } = renderHook(() => useClubPermissions());

      expect(result.current.roles).toEqual(['OWNER']);
      expect(result.current.hasAccess).toBe(true);
      expect(result.current.isClubMember).toBe(true);
      expect(result.current.isAdminOnly).toBe(false);
      expect(result.current.isOwner).toBe(true);
      expect(result.current.isBoardMember).toBe(true);
      expect(result.current.canManageUsers).toBe(true);
      expect(result.current.canManageFinances).toBe(true);
      expect(result.current.canManageSettings).toBe(true);
      expect(result.current.canManageProtocols).toBe(true);
    });

    it('returns correct permissions for ADMIN only', () => {
      mockActiveClub = { roles: ['ADMIN'] };
      const { result } = renderHook(() => useClubPermissions());

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.isClubMember).toBe(false);
      expect(result.current.isAdminOnly).toBe(true);
      expect(result.current.isOwner).toBe(false);
      expect(result.current.isBoardMember).toBe(false);
      expect(result.current.canManageUsers).toBe(true);
      expect(result.current.canManageFinances).toBe(false);
      expect(result.current.canManageSettings).toBe(true);
      expect(result.current.canManageProtocols).toBe(false);
    });

    it('returns correct permissions for ADMIN with MEMBER role', () => {
      mockActiveClub = { roles: ['ADMIN', 'MEMBER'] };
      const { result } = renderHook(() => useClubPermissions());

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.isClubMember).toBe(true);
      expect(result.current.isAdminOnly).toBe(false);
      expect(result.current.canManageUsers).toBe(true);
      expect(result.current.canManageSettings).toBe(true);
    });

    it('returns correct permissions for MEMBER', () => {
      mockActiveClub = { roles: ['MEMBER'] };
      const { result } = renderHook(() => useClubPermissions());

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.isClubMember).toBe(true);
      expect(result.current.isAdminOnly).toBe(false);
      expect(result.current.isOwner).toBe(false);
      expect(result.current.isBoardMember).toBe(false);
      expect(result.current.canManageUsers).toBe(false);
      expect(result.current.canManageFinances).toBe(false);
      expect(result.current.canManageSettings).toBe(false);
      expect(result.current.canManageProtocols).toBe(false);
    });

    it('returns correct permissions for TREASURER', () => {
      mockActiveClub = { roles: ['TREASURER'] };
      const { result } = renderHook(() => useClubPermissions());

      expect(result.current.isClubMember).toBe(true);
      expect(result.current.isBoardMember).toBe(true);
      expect(result.current.canManageFinances).toBe(true);
      expect(result.current.canManageUsers).toBe(false);
      expect(result.current.canManageSettings).toBe(false);
    });

    it('returns correct permissions for SECRETARY', () => {
      mockActiveClub = { roles: ['SECRETARY'] };
      const { result } = renderHook(() => useClubPermissions());

      expect(result.current.isClubMember).toBe(true);
      expect(result.current.isBoardMember).toBe(true);
      expect(result.current.canManageProtocols).toBe(true);
      expect(result.current.canManageFinances).toBe(false);
      expect(result.current.canManageUsers).toBe(false);
    });
  });

  describe('individual permission hooks', () => {
    describe('useCanManageSettings()', () => {
      it('returns true for OWNER', () => {
        mockActiveClub = { roles: ['OWNER'] };
        const { result } = renderHook(() => useCanManageSettings());
        expect(result.current).toBe(true);
      });

      it('returns true for ADMIN', () => {
        mockActiveClub = { roles: ['ADMIN'] };
        const { result } = renderHook(() => useCanManageSettings());
        expect(result.current).toBe(true);
      });

      it('returns false for MEMBER', () => {
        mockActiveClub = { roles: ['MEMBER'] };
        const { result } = renderHook(() => useCanManageSettings());
        expect(result.current).toBe(false);
      });
    });

    describe('useCanManageUsers()', () => {
      it('returns true for OWNER', () => {
        mockActiveClub = { roles: ['OWNER'] };
        const { result } = renderHook(() => useCanManageUsers());
        expect(result.current).toBe(true);
      });

      it('returns true for ADMIN', () => {
        mockActiveClub = { roles: ['ADMIN'] };
        const { result } = renderHook(() => useCanManageUsers());
        expect(result.current).toBe(true);
      });

      it('returns false for MEMBER', () => {
        mockActiveClub = { roles: ['MEMBER'] };
        const { result } = renderHook(() => useCanManageUsers());
        expect(result.current).toBe(false);
      });
    });

    describe('useCanManageFinances()', () => {
      it('returns true for TREASURER', () => {
        mockActiveClub = { roles: ['TREASURER'] };
        const { result } = renderHook(() => useCanManageFinances());
        expect(result.current).toBe(true);
      });

      it('returns false for ADMIN', () => {
        mockActiveClub = { roles: ['ADMIN'] };
        const { result } = renderHook(() => useCanManageFinances());
        expect(result.current).toBe(false);
      });
    });

    describe('useIsBoardMember()', () => {
      it('returns true for TREASURER', () => {
        mockActiveClub = { roles: ['TREASURER'] };
        const { result } = renderHook(() => useIsBoardMember());
        expect(result.current).toBe(true);
      });

      it('returns false for ADMIN', () => {
        mockActiveClub = { roles: ['ADMIN'] };
        const { result } = renderHook(() => useIsBoardMember());
        expect(result.current).toBe(false);
      });

      it('returns false for MEMBER', () => {
        mockActiveClub = { roles: ['MEMBER'] };
        const { result } = renderHook(() => useIsBoardMember());
        expect(result.current).toBe(false);
      });
    });

    describe('useIsOwner()', () => {
      it('returns true for OWNER', () => {
        mockActiveClub = { roles: ['OWNER'] };
        const { result } = renderHook(() => useIsOwner());
        expect(result.current).toBe(true);
      });

      it('returns false for ADMIN', () => {
        mockActiveClub = { roles: ['ADMIN'] };
        const { result } = renderHook(() => useIsOwner());
        expect(result.current).toBe(false);
      });
    });

    describe('useIsClubMember()', () => {
      it('returns true for MEMBER', () => {
        mockActiveClub = { roles: ['MEMBER'] };
        const { result } = renderHook(() => useIsClubMember());
        expect(result.current).toBe(true);
      });

      it('returns false for ADMIN only', () => {
        mockActiveClub = { roles: ['ADMIN'] };
        const { result } = renderHook(() => useIsClubMember());
        expect(result.current).toBe(false);
      });

      it('returns true for ADMIN with MEMBER', () => {
        mockActiveClub = { roles: ['ADMIN', 'MEMBER'] };
        const { result } = renderHook(() => useIsClubMember());
        expect(result.current).toBe(true);
      });
    });

    describe('useIsAdminOnly()', () => {
      it('returns true for ADMIN only', () => {
        mockActiveClub = { roles: ['ADMIN'] };
        const { result } = renderHook(() => useIsAdminOnly());
        expect(result.current).toBe(true);
      });

      it('returns false for ADMIN with MEMBER', () => {
        mockActiveClub = { roles: ['ADMIN', 'MEMBER'] };
        const { result } = renderHook(() => useIsAdminOnly());
        expect(result.current).toBe(false);
      });

      it('returns false for OWNER', () => {
        mockActiveClub = { roles: ['OWNER'] };
        const { result } = renderHook(() => useIsAdminOnly());
        expect(result.current).toBe(false);
      });

      it('returns false for MEMBER', () => {
        mockActiveClub = { roles: ['MEMBER'] };
        const { result } = renderHook(() => useIsAdminOnly());
        expect(result.current).toBe(false);
      });
    });
  });
});
