'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { TierFeatures } from '@/lib/club-store';

interface ClubPermissionsResponse {
  permissions: string[];
  features: TierFeatures;
  roles: string[];
}

export const permissionKeys = {
  all: (slug: string) => ['club-permissions', slug] as const,
};

/**
 * Fetch and cache club permissions via TanStack Query.
 * Replaces Zustand localStorage persistence for sensitive data.
 * staleTime: 5 minutes (permissions always fresh within 5 min).
 *
 * Server-side validation remains the authoritative check.
 * TanStack Query cache is for UI display only.
 */
export function useClubPermissionsQuery(clubSlug: string | null) {
  return useQuery<ClubPermissionsResponse>({
    queryKey: permissionKeys.all(clubSlug ?? ''),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${clubSlug}/my-permissions`);
      if (!res.ok) throw new Error('Failed to fetch permissions');
      return res.json();
    },
    enabled: !!clubSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for invalidating permissions cache.
 * Use after operations that modify permissions (role changes, etc.).
 */
export function useInvalidatePermissions() {
  const queryClient = useQueryClient();
  return (slug: string) => queryClient.invalidateQueries({ queryKey: permissionKeys.all(slug) });
}
