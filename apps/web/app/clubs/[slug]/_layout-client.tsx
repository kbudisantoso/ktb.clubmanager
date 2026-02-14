'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useClubStore } from '@/lib/club-store';
import { useMyClubsQuery, useSyncClubsToStore } from '@/hooks/use-clubs';
import { useClubPermissionsQuery } from '@/hooks/use-club-permissions';

/**
 * Client component for club layout effects.
 * Handles setting active club, syncing club data to Zustand, and pre-fetching permissions.
 * Access control is handled server-side by checkClubAccess in page components.
 */
export function ClubLayoutClient({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const { data } = useMyClubsQuery();
  const { clubs = [] } = data ?? {};
  const { setActiveClub } = useClubStore();

  const slug = params.slug as string;

  // Keep Zustand store in sync with API data (name, logo, avatarColor changes)
  useSyncClubsToStore();

  // Pre-fetch permissions via TanStack Query (auto-cached, no localStorage)
  useClubPermissionsQuery(slug);

  useEffect(() => {
    const club = clubs.find((c) => c.slug === slug);
    if (club) {
      setActiveClub(slug);
    }
  }, [clubs, slug, setActiveClub]);

  return <>{children}</>;
}
