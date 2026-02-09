import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useHasPermission,
  useHasAnyPermission,
  useTierFeature,
  useCanAccess,
  usePermissions,
} from './permission-hooks';
import { useClubStore } from './club-store';
import type { TierFeatures } from './club-store';

/** Default tier features for test fixtures */
const defaultFeatures: TierFeatures = {
  sepa: true,
  reports: true,
  bankImport: true,
};

// Mock the TanStack Query hook
let mockPermissionsData: {
  permissions: string[];
  features: TierFeatures;
  roles: string[];
} | null = null;

vi.mock('@/hooks/use-club-permissions', () => ({
  useClubPermissionsQuery: () => ({
    data: mockPermissionsData,
    isLoading: false,
    error: null,
  }),
}));

describe('permission-hooks', () => {
  beforeEach(() => {
    // Reset store before each test
    useClubStore.setState({
      activeClubSlug: null,
      clubs: [],
      lastFetched: null,
    });
    mockPermissionsData = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useHasPermission', () => {
    it('should return false when no active club', () => {
      const { result } = renderHook(() => useHasPermission('member:create'));
      expect(result.current).toBe(false);
    });

    it('should return false when no permissions data', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = null;

      const { result } = renderHook(() => useHasPermission('member:create'));
      expect(result.current).toBe(false);
    });

    it('should return true when permission exists', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: ['member:create', 'member:read'],
        features: defaultFeatures,
        roles: ['TREASURER'],
      };

      const { result } = renderHook(() => useHasPermission('member:create'));
      expect(result.current).toBe(true);
    });

    it('should return false when permission missing', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: ['member:read'],
        features: defaultFeatures,
        roles: ['MEMBER'],
      };

      const { result } = renderHook(() => useHasPermission('member:create'));
      expect(result.current).toBe(false);
    });
  });

  describe('useHasAnyPermission', () => {
    it('should return false when no active club', () => {
      const { result } = renderHook(() => useHasAnyPermission(['member:create', 'member:read']));
      expect(result.current).toBe(false);
    });

    it('should return true when any permission matches', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: ['member:read'],
        features: defaultFeatures,
        roles: ['MEMBER'],
      };

      const { result } = renderHook(() => useHasAnyPermission(['member:read', 'member:create']));
      expect(result.current).toBe(true);
    });

    it('should return false when no permissions match', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: ['dashboard:read'],
        features: defaultFeatures,
        roles: ['MEMBER'],
      };

      const { result } = renderHook(() => useHasAnyPermission(['member:create', 'finance:create']));
      expect(result.current).toBe(false);
    });

    it('should return false for empty permissions array', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: ['member:create'],
        features: defaultFeatures,
        roles: ['OWNER'],
      };

      const { result } = renderHook(() => useHasAnyPermission([]));
      expect(result.current).toBe(false);
    });
  });

  describe('useTierFeature', () => {
    it('should return true by default when no active club', () => {
      const { result } = renderHook(() => useTierFeature('sepa'));
      expect(result.current).toBe(true);
    });

    it('should return true when feature enabled', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: [],
        features: { sepa: true, reports: false, bankImport: true },
        roles: [],
      };

      const { result } = renderHook(() => useTierFeature('sepa'));
      expect(result.current).toBe(true);
    });

    it('should return false when feature disabled', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: [],
        features: { sepa: true, reports: false, bankImport: true },
        roles: [],
      };

      const { result } = renderHook(() => useTierFeature('reports'));
      expect(result.current).toBe(false);
    });

    it('should check bankImport feature', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: [],
        features: { sepa: false, reports: false, bankImport: false },
        roles: [],
      };

      const { result } = renderHook(() => useTierFeature('bankImport'));
      expect(result.current).toBe(false);
    });
  });

  describe('useCanAccess', () => {
    it('should return combined permission and feature check', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: ['finance:create'],
        features: { sepa: true, reports: true, bankImport: true },
        roles: ['TREASURER'],
      };

      const { result } = renderHook(() => useCanAccess('finance:create', 'sepa'));

      expect(result.current.hasPermission).toBe(true);
      expect(result.current.hasFeature).toBe(true);
      expect(result.current.canAccess).toBe(true);
    });

    it('should return false canAccess when permission missing', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: ['dashboard:read'],
        features: { sepa: true, reports: true, bankImport: true },
        roles: ['MEMBER'],
      };

      const { result } = renderHook(() => useCanAccess('finance:create', 'sepa'));

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.hasFeature).toBe(true);
      expect(result.current.canAccess).toBe(false);
    });

    it('should return false canAccess when feature disabled', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: ['finance:create'],
        features: { sepa: false, reports: true, bankImport: true },
        roles: ['TREASURER'],
      };

      const { result } = renderHook(() => useCanAccess('finance:create', 'sepa'));

      expect(result.current.hasPermission).toBe(true);
      expect(result.current.hasFeature).toBe(false);
      expect(result.current.canAccess).toBe(false);
    });

    it('should work without feature requirement', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions: ['dashboard:read'],
        features: defaultFeatures,
        roles: ['MEMBER'],
      };

      const { result } = renderHook(() => useCanAccess('dashboard:read'));

      expect(result.current.hasPermission).toBe(true);
      expect(result.current.hasFeature).toBe(true);
      expect(result.current.canAccess).toBe(true);
    });
  });

  describe('usePermissions', () => {
    it('should return empty array when no active club', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current).toEqual([]);
    });

    it('should return all permissions from TanStack Query', () => {
      const permissions = ['member:read', 'member:create', 'finance:read'];

      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = {
        permissions,
        features: defaultFeatures,
        roles: ['TREASURER'],
      };

      const { result } = renderHook(() => usePermissions());
      expect(result.current).toEqual(permissions);
    });

    it('should return empty array when no permissions data', () => {
      useClubStore.setState({ activeClubSlug: 'test-club' });
      mockPermissionsData = null;

      const { result } = renderHook(() => usePermissions());
      expect(result.current).toEqual([]);
    });
  });
});
