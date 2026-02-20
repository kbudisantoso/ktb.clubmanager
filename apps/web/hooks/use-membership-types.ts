import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  MembershipTypeResponse,
  CreateMembershipType,
  UpdateMembershipType,
} from '@ktb/shared';

// ============================================================================
// Query Key Factory
// ============================================================================

export const membershipTypeKeys = {
  all: (slug: string) => ['membershipTypes', slug] as const,
  list: (slug: string) => [...membershipTypeKeys.all(slug), 'list'] as const,
  detail: (slug: string, id: string) => [...membershipTypeKeys.all(slug), 'detail', id] as const,
};

// ============================================================================
// Types - imported from @ktb/shared, re-exported for convenience
// ============================================================================

/** Membership type entity from the API */
export type MembershipType = MembershipTypeResponse;

/** Input for creating a membership type */
export type CreateMembershipTypeInput = CreateMembershipType;

/** Input for updating a membership type */
export type UpdateMembershipTypeInput = UpdateMembershipType;

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all membership types for a club.
 */
export function useMembershipTypes(slug: string) {
  return useQuery<MembershipType[]>({
    queryKey: membershipTypeKeys.list(slug),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/membership-types`);
      if (!res.ok) {
        if (res.status === 403) {
          return [];
        }
        throw new Error('Fehler beim Laden der Mitgliedsarten');
      }
      return res.json();
    },
    staleTime: 60_000, // 1 minute - rarely changes
    enabled: !!slug,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new membership type.
 */
export function useCreateMembershipType(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMembershipTypeInput): Promise<MembershipType> => {
      const res = await apiFetch(`/api/clubs/${slug}/membership-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Erstellen der Mitgliedsart');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: membershipTypeKeys.all(slug),
      });
    },
    onError: (error) => {
      throw error;
    },
    retry: 1,
  });
}

/**
 * Update an existing membership type.
 */
export function useUpdateMembershipType(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateMembershipTypeInput;
    }): Promise<MembershipType> => {
      const res = await apiFetch(`/api/clubs/${slug}/membership-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Aktualisieren der Mitgliedsart');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: membershipTypeKeys.all(slug),
      });
    },
    onError: (error) => {
      throw error;
    },
    retry: 1,
  });
}

/**
 * Delete a membership type.
 */
export function useDeleteMembershipType(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/clubs/${slug}/membership-types/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Loeschen der Mitgliedsart');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: membershipTypeKeys.all(slug),
      });
    },
    onError: (error) => {
      throw error;
    },
  });
}
