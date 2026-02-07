import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { memberKeys } from './use-members';

// ============================================================================
// Query Key Factory
// ============================================================================

export const periodKeys = {
  all: (slug: string, memberId: string) => ['membershipPeriods', slug, memberId] as const,
  list: (slug: string, memberId: string) => [...periodKeys.all(slug, memberId), 'list'] as const,
};

// ============================================================================
// Types
// ============================================================================

interface MembershipPeriod {
  id: string;
  memberId: string;
  joinDate: string | null;
  leaveDate: string | null;
  membershipType: string;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CreatePeriodInput {
  joinDate: string;
  membershipType: string;
  notes?: string;
}

interface UpdatePeriodInput {
  periodId: string;
  joinDate?: string;
  leaveDate?: string;
  membershipType?: string;
  notes?: string;
}

interface ClosePeriodInput {
  periodId: string;
  leaveDate: string;
}

// ============================================================================
// Query Hook
// ============================================================================

/**
 * Fetch membership periods for a specific member.
 * Only queries when memberId is provided.
 */
export function useMemberPeriods(slug: string, memberId: string | undefined) {
  return useQuery<MembershipPeriod[]>({
    queryKey: periodKeys.list(slug, memberId ?? ''),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${memberId}/periods`);
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Mitgliedschaftszeitraeume');
      }
      return res.json();
    },
    enabled: !!memberId,
    staleTime: 60_000, // 1 minute
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new membership period for a member.
 */
export function useCreatePeriod(slug: string, memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePeriodInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${memberId}/periods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Erstellen des Zeitraums');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: periodKeys.all(slug, memberId),
      });
      // Also refresh member detail (periods are included)
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(slug, memberId),
      });
    },
  });
}

/**
 * Update an existing membership period.
 */
export function useUpdatePeriod(slug: string, memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ periodId, ...data }: UpdatePeriodInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${memberId}/periods/${periodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Aktualisieren des Zeitraums');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: periodKeys.all(slug, memberId),
      });
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(slug, memberId),
      });
    },
  });
}

/**
 * Close a membership period by setting its leaveDate.
 */
export function useClosePeriod(slug: string, memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ periodId, leaveDate }: ClosePeriodInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${memberId}/periods/${periodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveDate }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Beenden des Zeitraums');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: periodKeys.all(slug, memberId),
      });
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(slug, memberId),
      });
      // Refresh member list too (active period display)
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
  });
}

export type { MembershipPeriod, CreatePeriodInput };
