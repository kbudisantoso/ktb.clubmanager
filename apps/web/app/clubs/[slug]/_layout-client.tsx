'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useClubStore } from '@/lib/club-store';
import { useMyClubsQuery, useSyncClubsToStore } from '@/hooks/use-clubs';
import { useClubPermissionsQuery } from '@/hooks/use-club-permissions';
import { ClubDeactivationBanner } from '@/components/club/club-deactivation-banner';

/**
 * Client component for club layout effects.
 * Handles setting active club, syncing club data to Zustand, and pre-fetching permissions.
 * Provides deactivation banner via useClubDeactivationBanner for use inside SidebarInset.
 * Access control is handled server-side by checkClubAccess in page components.
 */
export function ClubLayoutClient({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const { data } = useMyClubsQuery();
  const { clubs = [] } = data ?? {};
  const { setActiveClub } = useClubStore();

  const slug = params.slug as string;
  const activeClub = clubs.find((c) => c.slug === slug);

  // Keep Zustand store in sync with API data (name, logo, avatarColor changes)
  useSyncClubsToStore();

  // Pre-fetch permissions via TanStack Query (auto-cached, no localStorage)
  useClubPermissionsQuery(slug);

  useEffect(() => {
    if (activeClub) {
      setActiveClub(slug);
    }
  }, [activeClub, slug, setActiveClub]);

  return <>{children}</>;
}

/**
 * Hook that returns the deactivation banner element if the current club is deactivated.
 * Used inside SidebarInset so the banner renders within the content area (not behind the sidebar).
 */
export function useClubDeactivationBanner(): React.ReactNode {
  const params = useParams();
  const { data } = useMyClubsQuery();
  const { clubs = [] } = data ?? {};

  const slug = params.slug as string;
  const activeClub = clubs.find((c) => c.slug === slug);
  const isDeactivated = !!activeClub?.deactivatedAt;

  if (!isDeactivated || !activeClub.deactivatedAt || !activeClub.scheduledDeletionAt) {
    return null;
  }

  return (
    <ClubDeactivationBanner
      slug={slug}
      deactivatedAt={activeClub.deactivatedAt}
      scheduledDeletionAt={activeClub.scheduledDeletionAt}
    />
  );
}
