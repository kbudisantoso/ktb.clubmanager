'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useClubStore } from '@/lib/club-store';
import { useMyClubsQuery } from '@/hooks/use-clubs';
import { useClubPermissionsQuery } from '@/hooks/use-club-permissions';

/**
 * Client component for club layout effects.
 * Handles setting active club and pre-fetching permissions via TanStack Query.
 * Access control is handled server-side by checkClubAccess in page components.
 */
export function ClubLayoutClient({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const { data } = useMyClubsQuery();
  const { clubs = [] } = data ?? {};
  const { setActiveClub } = useClubStore();

  const slug = params.slug as string;

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
