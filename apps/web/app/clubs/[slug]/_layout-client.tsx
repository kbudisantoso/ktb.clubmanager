'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useClubStore } from '@/lib/club-store';
import { useMyClubsQuery, useSyncClubsToStore } from '@/hooks/use-clubs';
import { useClubPermissionsQuery } from '@/hooks/use-club-permissions';
import { ClubDeactivationBanner } from '@/components/club/club-deactivation-banner';
import { cn } from '@/lib/utils';

/**
 * Client component for club layout effects.
 * Handles setting active club, syncing club data to Zustand, and pre-fetching permissions.
 * Shows deactivation banner and destructive border when club is deactivated.
 * Access control is handled server-side by checkClubAccess in page components.
 */
export function ClubLayoutClient({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const { data } = useMyClubsQuery();
  const { clubs = [] } = data ?? {};
  const { setActiveClub } = useClubStore();

  const slug = params.slug as string;
  const activeClub = clubs.find((c) => c.slug === slug);
  const isDeactivated = !!activeClub?.deactivatedAt;

  // Keep Zustand store in sync with API data (name, logo, avatarColor changes)
  useSyncClubsToStore();

  // Pre-fetch permissions via TanStack Query (auto-cached, no localStorage)
  useClubPermissionsQuery(slug);

  useEffect(() => {
    if (activeClub) {
      setActiveClub(slug);
    }
  }, [activeClub, slug, setActiveClub]);

  return (
    <div className={cn(isDeactivated && 'border-t-2 border-destructive')}>
      {isDeactivated && activeClub.deactivatedAt && activeClub.scheduledDeletionAt && (
        <ClubDeactivationBanner
          slug={slug}
          deactivatedAt={activeClub.deactivatedAt}
          scheduledDeletionAt={activeClub.scheduledDeletionAt}
        />
      )}
      {children}
    </div>
  );
}
