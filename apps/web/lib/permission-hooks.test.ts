import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useHasPermission,
  useHasAnyPermission,
  useTierFeature,
  useCanAccess,
  usePermissions,
} from './permission-hooks';
import { useClubStore, type ClubContext, type TierFeatures } from './club-store';

/** Default tier features for test fixtures */
const defaultFeatures: TierFeatures = {
  sepa: true,
  reports: true,
  bankImport: true,
};

/** Helper to create ClubContext with default permissions/features */
function createTestClub(
  partial: Omit<ClubContext, 'permissions' | 'features'> &
    Partial<Pick<ClubContext, 'permissions' | 'features'>>
): ClubContext {
  return {
    ...partial,
    permissions: partial.permissions ?? [],
    features: partial.features ?? defaultFeatures,
  };
}

describe('permission-hooks', () => {
  beforeEach(() => {
    // Reset store before each test
    useClubStore.setState({
      activeClubSlug: null,
      clubs: [],
      lastFetched: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useHasPermission', () => {
    it('should return false when no active club', () => {
      const { result, rerender } = renderHook(() => useHasPermission('member:create'));

      // Trigger hydration
      rerender();

      expect(result.current).toBe(false);
    });

    it('should handle missing permissions array gracefully', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          {
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['TREASURER'],
            permissions: undefined as unknown as string[],
            features: defaultFeatures,
          },
        ],
      });

      const { result, rerender } = renderHook(() => useHasPermission('member:create'));

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('should return true when permission exists', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['TREASURER'],
            permissions: ['member:create', 'member:read'],
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useHasPermission('member:create'));

      // Trigger hydration
      rerender();

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should return false when permission missing', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['MEMBER'],
            permissions: ['member:read'],
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useHasPermission('member:create'));

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('should return false when active club not in clubs array', async () => {
      useClubStore.setState({
        activeClubSlug: 'nonexistent-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['OWNER'],
            permissions: ['member:create'],
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useHasPermission('member:create'));

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });

  describe('useHasAnyPermission', () => {
    it('should return false when no active club', () => {
      const { result, rerender } = renderHook(() =>
        useHasAnyPermission(['member:create', 'member:read'])
      );

      rerender();

      expect(result.current).toBe(false);
    });

    it('should return true when any permission matches', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['MEMBER'],
            permissions: ['member:read'],
          }),
        ],
      });

      const { result, rerender } = renderHook(() =>
        useHasAnyPermission(['member:read', 'member:create'])
      );

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should return false when no permissions match', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['MEMBER'],
            permissions: ['dashboard:read'],
          }),
        ],
      });

      const { result, rerender } = renderHook(() =>
        useHasAnyPermission(['member:create', 'finance:create'])
      );

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('should return false for empty permissions array', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['OWNER'],
            permissions: ['member:create'],
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useHasAnyPermission([]));

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });

  describe('useTierFeature', () => {
    it('should return true by default during hydration', () => {
      // Default to true to avoid flash of disabled state
      const { result } = renderHook(() => useTierFeature('sepa'));

      expect(result.current).toBe(true);
    });

    it('should return true when feature enabled', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: [],
            permissions: [],
            features: { sepa: true, reports: false, bankImport: true },
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useTierFeature('sepa'));

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should return false when feature disabled', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: [],
            permissions: [],
            features: { sepa: true, reports: false, bankImport: true },
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useTierFeature('reports'));

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('should return true when no active club', async () => {
      // Default behavior - allow if no club context
      const { result, rerender } = renderHook(() => useTierFeature('sepa'));

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should check bankImport feature', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: [],
            permissions: [],
            features: { sepa: false, reports: false, bankImport: false },
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useTierFeature('bankImport'));

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });

  describe('useCanAccess', () => {
    it('should return combined permission and feature check', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['TREASURER'],
            permissions: ['finance:create'],
            features: { sepa: true, reports: true, bankImport: true },
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useCanAccess('finance:create', 'sepa'));

      rerender();

      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
        expect(result.current.hasFeature).toBe(true);
        expect(result.current.canAccess).toBe(true);
      });
    });

    it('should return false canAccess when permission missing', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['MEMBER'],
            permissions: ['dashboard:read'],
            features: { sepa: true, reports: true, bankImport: true },
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useCanAccess('finance:create', 'sepa'));

      rerender();

      await waitFor(() => {
        expect(result.current.hasPermission).toBe(false);
        expect(result.current.hasFeature).toBe(true);
        expect(result.current.canAccess).toBe(false);
      });
    });

    it('should return false canAccess when feature disabled', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['TREASURER'],
            permissions: ['finance:create'],
            features: { sepa: false, reports: true, bankImport: true },
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useCanAccess('finance:create', 'sepa'));

      rerender();

      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
        expect(result.current.hasFeature).toBe(false);
        expect(result.current.canAccess).toBe(false);
      });
    });

    it('should work without feature requirement', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['MEMBER'],
            permissions: ['dashboard:read'],
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useCanAccess('dashboard:read'));

      rerender();

      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
        expect(result.current.hasFeature).toBe(true); // Always true when no feature
        expect(result.current.canAccess).toBe(true);
      });
    });
  });

  describe('usePermissions', () => {
    it('should return empty array when no active club', () => {
      const { result, rerender } = renderHook(() => usePermissions());

      rerender();

      expect(result.current).toEqual([]);
    });

    it('should return all permissions after hydration', async () => {
      const permissions = ['member:read', 'member:create', 'finance:read'];

      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['TREASURER'],
            permissions,
          }),
        ],
      });

      const { result, rerender } = renderHook(() => usePermissions());

      rerender();

      await waitFor(() => {
        expect(result.current).toEqual(permissions);
      });
    });

    it('should handle missing permissions array gracefully', async () => {
      useClubStore.setState({
        activeClubSlug: 'test-club',
        clubs: [
          {
            id: '1',
            name: 'Test Club',
            slug: 'test-club',
            roles: ['OWNER'],
            permissions: undefined as unknown as string[],
            features: defaultFeatures,
          },
        ],
      });

      const { result, rerender } = renderHook(() => usePermissions());

      rerender();

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });
  });

  describe('hydration safety', () => {
    it('should handle club switching after hydration', async () => {
      useClubStore.setState({
        activeClubSlug: 'club-1',
        clubs: [
          createTestClub({
            id: '1',
            name: 'Club One',
            slug: 'club-1',
            roles: ['MEMBER'],
            permissions: ['dashboard:read'],
          }),
          createTestClub({
            id: '2',
            name: 'Club Two',
            slug: 'club-2',
            roles: ['OWNER'],
            permissions: ['member:create', 'club:delete'],
          }),
        ],
      });

      const { result, rerender } = renderHook(() => useHasPermission('member:create'));

      rerender();

      // Initially on club-1 which doesn't have member:create
      await waitFor(() => {
        expect(result.current).toBe(false);
      });

      // Switch to club-2
      act(() => {
        useClubStore.setState({ activeClubSlug: 'club-2' });
      });

      rerender();

      // Now has member:create
      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });
});
