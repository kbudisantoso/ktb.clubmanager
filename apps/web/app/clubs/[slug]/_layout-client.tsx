'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useClubStore } from '@/lib/club-store';
import { fetchAndStorePermissions } from '@/lib/fetch-permissions';
import { useMyClubsQuery } from '@/hooks/use-clubs';

/**
 * Client component for club layout effects.
 * Handles setting active club and fetching permissions.
 * Access control is handled server-side by checkClubAccess in page components.
 */
export function ClubLayoutClient({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const { data } = useMyClubsQuery();
  const { clubs = [] } = data ?? {};
  const { setActiveClub } = useClubStore();

  const slug = params.slug as string;

  useEffect(() => {
    const club = clubs.find((c) => c.slug === slug);
    if (club) {
      setActiveClub(slug);

      // Fetch permissions if not already loaded for this club
      const hasPermissions = club.permissions && club.permissions.length > 0;
      if (!hasPermissions) {
        fetchAndStorePermissions(slug);
      }
    }
  }, [clubs, slug, setActiveClub]);

  return <>{children}</>;
}
