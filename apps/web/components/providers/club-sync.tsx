'use client';

import { useSyncClubsToStore } from '@/hooks/use-clubs';

/**
 * Component that syncs clubs from API to Zustand store.
 * Add this to layouts that need club context.
 */
export function ClubSync() {
  useSyncClubsToStore();
  return null;
}
