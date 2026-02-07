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
 */
export interface ClubContext {
  id: string;
  name: string;
  slug: string;
  /** User's roles in this club (multiple roles possible) */
  roles: string[];
  /** Permissions derived from roles (set after fetching /my-permissions) */
  permissions: string[];
  /** Tier features available to this club */
  features: TierFeatures;
  avatarUrl?: string;
  avatarInitials?: string;
  avatarColor?: string;
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
  /** Update permissions and features for a specific club */
  setClubPermissions: (slug: string, permissions: string[], features: TierFeatures) => void;
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
      setClubPermissions: (slug, permissions, features) =>
        set((state) => ({
          clubs: state.clubs.map((c) => (c.slug === slug ? { ...c, permissions, features } : c)),
        })),
    }),
    {
      name: 'club-context',
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        activeClubSlug: state.activeClubSlug,
        clubs: state.clubs,
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
