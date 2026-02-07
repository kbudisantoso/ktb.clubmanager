import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { memberKeys } from './use-members';

// ============================================================================
// Query Key Factory
// ============================================================================

export const householdKeys = {
  all: (slug: string) => ['households', slug] as const,
  list: (slug: string) => [...householdKeys.all(slug), 'list'] as const,
  detail: (slug: string, id: string) =>
    [...householdKeys.all(slug), 'detail', id] as const,
};

// ============================================================================
// Types
// ============================================================================

interface HouseholdMember {
  id: string;
  firstName: string;
  lastName: string;
  householdRole: string | null;
  memberNumber: string;
}

interface Household {
  id: string;
  clubId: string;
  name: string;
  primaryContactId: string | null;
  members: HouseholdMember[];
  createdAt: string;
  updatedAt: string;
}

interface CreateHouseholdInput {
  name: string;
  primaryContactId?: string;
  memberIds?: string[];
}

interface UpdateHouseholdInput {
  name?: string;
  primaryContactId?: string;
}

interface AddHouseholdMemberInput {
  householdId: string;
  memberId: string;
  role: string;
}

interface RemoveHouseholdMemberInput {
  householdId: string;
  memberId: string;
}

interface SyncAddressesInput {
  householdId: string;
  memberIds: string[];
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all households for a club with member counts.
 */
export function useHouseholds(slug: string) {
  return useQuery<Household[]>({
    queryKey: householdKeys.list(slug),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/households`);
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Haushalte');
      }
      return res.json();
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Fetch a single household with its members.
 */
export function useHousehold(slug: string, id: string | undefined) {
  return useQuery<Household>({
    queryKey: householdKeys.detail(slug, id ?? ''),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/households/${id}`);
      if (!res.ok) {
        throw new Error('Fehler beim Laden des Haushalts');
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new household.
 * Invalidates both household and member lists (members get householdId).
 */
export function useCreateHousehold(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateHouseholdInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/households`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message || 'Fehler beim Erstellen des Haushalts'
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: householdKeys.all(slug),
      });
      // Also invalidate members since they get householdId assigned
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
  });
}

/**
 * Update an existing household.
 */
export function useUpdateHousehold(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateHouseholdInput;
    }) => {
      const res = await apiFetch(`/api/clubs/${slug}/households/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message || 'Fehler beim Aktualisieren des Haushalts'
        );
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: householdKeys.detail(slug, variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: householdKeys.list(slug),
      });
    },
  });
}

/**
 * Add a member to a household.
 */
export function useAddHouseholdMember(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      householdId,
      memberId,
      role,
    }: AddHouseholdMemberInput) => {
      const res = await apiFetch(
        `/api/clubs/${slug}/households/${householdId}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, role }),
        }
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message || 'Fehler beim Hinzufuegen des Mitglieds zum Haushalt'
        );
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: householdKeys.detail(slug, variables.householdId),
      });
      queryClient.invalidateQueries({
        queryKey: householdKeys.list(slug),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
  });
}

/**
 * Remove a member from a household.
 */
export function useRemoveHouseholdMember(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      householdId,
      memberId,
    }: RemoveHouseholdMemberInput) => {
      const res = await apiFetch(
        `/api/clubs/${slug}/households/${householdId}/members/${memberId}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message || 'Fehler beim Entfernen des Mitglieds aus dem Haushalt'
        );
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: householdKeys.detail(slug, variables.householdId),
      });
      queryClient.invalidateQueries({
        queryKey: householdKeys.list(slug),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
  });
}

/**
 * Sync HEAD member's address to selected household members.
 */
export function useSyncAddresses(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ householdId, memberIds }: SyncAddressesInput) => {
      const res = await apiFetch(
        `/api/clubs/${slug}/households/${householdId}/sync-addresses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberIds }),
        }
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message || 'Fehler beim Synchronisieren der Adressen'
        );
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: householdKeys.detail(slug, variables.householdId),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
  });
}

/**
 * Dissolve a household, removing all members from it.
 */
export function useDissolveHousehold(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (householdId: string) => {
      const res = await apiFetch(
        `/api/clubs/${slug}/households/${householdId}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message || 'Fehler beim Aufloesen des Haushalts'
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: householdKeys.all(slug),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
  });
}

export type { Household, HouseholdMember, CreateHouseholdInput };
