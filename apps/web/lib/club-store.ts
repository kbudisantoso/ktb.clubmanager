'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';

/**
 * Tier feature flags for the club.
 */
export interface TierFeatures {
  sepa: boolean;
  reports: boolean;
  bankImport: boolean;
}

/**
 * Club data stored in the client-side context.
 * Only non-sensitive display data is persisted to localStorage.
 * Permissions, roles, and features are fetched via TanStack Query (see use-club-permissions.ts).
 * Roles are populated in-memory by useMyClubsQuery() but stripped from localStorage (SEC-031).
 */
export interface ClubContext {
  id: string;
  name: string;
  slug: string;
  /** User's roles in this club — in-memory only, NOT persisted to localStorage (SEC-031) */
  roles?: string[];
  shortCode?: string;
  avatarColor?: string;
  logoUrl?: string;
}

interface ClubState {
  /**
   * Currently active club slug (used for URL routing)
   */
  activeClubSlug: string | null;

  /**
   * Cached club data for quick access (avoid API calls on every render)
   */
  clubs: ClubContext[];

  /**
   * Last fetched timestamp
   */
  lastFetched: number | null;

  // Actions
  setActiveClub: (slug: string) => void;
  clearActiveClub: () => void;
  setClubs: (clubs: ClubContext[]) => void;
  clearClubs: () => void;
}

/**
 * Zustand store for club context with localStorage persistence.
 */
export const useClubStore = create<ClubState>()(
  persist(
    (set) => ({
      activeClubSlug: null,
      clubs: [],
      lastFetched: null,

      setActiveClub: (slug) => set({ activeClubSlug: slug }),
      clearActiveClub: () => set({ activeClubSlug: null }),
      setClubs: (clubs) => set({ clubs, lastFetched: Date.now() }),
      clearClubs: () => set({ clubs: [], lastFetched: null, activeClubSlug: null }),
    }),
    {
      name: 'club-context',
      storage: createJSONStorage(() => localStorage),
      // SEC-031: Only persist non-sensitive UI state
      // Permissions, roles, and features are fetched via TanStack Query (not persisted)
      partialize: (state) => ({
        activeClubSlug: state.activeClubSlug,
        // Strip roles from persistence — re-fetched via API on mount
        clubs: state.clubs.map(({ roles: _roles, ...rest }) => rest),
        lastFetched: state.lastFetched,
      }),
    }
  )
);

/**
 * Hydration-safe hook for getting active club.
 * Returns null during SSR and before hydration completes.
 */
export function useActiveClub(): ClubContext | null {
  const [hydrated, setHydrated] = useState(false);
  const activeClubSlug = useClubStore((state) => state.activeClubSlug);
  const clubs = useClubStore((state) => state.clubs);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated || !activeClubSlug) {
    return null;
  }

  return clubs.find((c) => c.slug === activeClubSlug) || null;
}

/**
 * Hook for getting all clubs the user belongs to.
 * Hydration-safe.
 */
export function useMyClubs(): ClubContext[] {
  const [hydrated, setHydrated] = useState(false);
  const clubs = useClubStore((state) => state.clubs);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated ? clubs : [];
}

/**
 * Hook for checking if clubs need refresh.
 * Returns true if no clubs or data is older than 5 minutes.
 */
export function useNeedsClubRefresh(): boolean {
  const lastFetched = useClubStore((state) => state.lastFetched);
  const clubs = useClubStore((state) => state.clubs);

  if (clubs.length === 0 || lastFetched === null) {
    return true;
  }

  const FIVE_MINUTES = 5 * 60 * 1000;
  return Date.now() - lastFetched > FIVE_MINUTES;
}
