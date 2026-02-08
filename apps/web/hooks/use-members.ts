import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { MemberListItem } from '@/components/members/member-list-table';

// ============================================================================
// Query Key Factory
// ============================================================================

export const memberKeys = {
  all: (slug: string) => ['members', slug] as const,
  list: (slug: string, params?: Record<string, unknown>) =>
    [...memberKeys.all(slug), 'list', params] as const,
  infinite: (slug: string, search?: string, status?: string) =>
    [...memberKeys.all(slug), 'infinite', search, status] as const,
  detail: (slug: string, id: string) => [...memberKeys.all(slug), 'detail', id] as const,
};

// ============================================================================
// Types
// ============================================================================

// MemberListItem imported from @/components/members/member-list-table (canonical location)
// This type includes nested relations (household, membershipPeriods) that differ
// from the flat MemberResponse schema in @ktb/shared.

interface PaginatedMembersResponse {
  items: MemberListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

// Input types kept local — shapes differ from @ktb/shared schemas:
// - CreateMemberInput uses loose string types (API does validation)
// - UpdateMemberInput/ChangeStatusInput include `id` (URL param, not in shared schemas)
// - BulkChangeStatusInput is API-specific (no shared schema equivalent)

interface CreateMemberInput {
  personType?: string;
  salutation?: string;
  title?: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  organizationName?: string;
  contactFirstName?: string;
  contactLastName?: string;
  department?: string;
  position?: string;
  vatId?: string;
  memberNumber?: string;
  street?: string;
  houseNumber?: string;
  addressExtra?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  notes?: string;
  status?: string;
  joinDate?: string;
  membershipType?: string;
}

interface UpdateMemberInput extends Partial<CreateMemberInput> {
  id: string;
}

interface ChangeStatusInput {
  id: string;
  newStatus: string;
  reason: string;
  effectiveDate?: string;
}

interface BulkChangeStatusInput {
  memberIds: string[];
  newStatus: string;
  reason?: string;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch paginated members with cursor-based infinite scroll.
 * Supports search and status filtering.
 */
export function useMembersInfinite(slug: string, search?: string, status?: string) {
  return useInfiniteQuery<PaginatedMembersResponse>({
    queryKey: memberKeys.infinite(slug, search, status),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (pageParam) params.set('cursor', pageParam as string);
      if (status) params.set('status', status);
      params.set('limit', '50');

      const res = await apiFetch(`/api/clubs/${slug}/members?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Mitglieder');
      }
      return res.json();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000, // 30 seconds
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new member.
 * Invalidates the member list on success.
 */
export function useCreateMember(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMemberInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Erstellen des Mitglieds');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
    onError: (error) => {
      throw error;
    },
    retry: 1,
  });
}

/**
 * Update an existing member.
 * Invalidates both detail and list queries on success.
 */
export function useUpdateMember(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateMemberInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Aktualisieren des Mitglieds');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(slug, variables.id),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
    onError: (error) => {
      throw error;
    },
    retry: 1,
  });
}

/**
 * Soft delete a member.
 * Requires member status to be LEFT.
 */
export function useDeleteMember(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${id}/soft`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Loeschen des Mitglieds');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
    onError: (error) => {
      throw error;
    },
  });
}

/**
 * Change a member's status with a reason.
 */
export function useChangeStatus(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newStatus, reason, effectiveDate }: ChangeStatusInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${id}/change-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus,
          reason,
          ...(effectiveDate && { effectiveDate }),
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Aendern des Status');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(slug, variables.id),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
    onError: (error) => {
      throw error;
    },
    retry: 1,
  });
}

/**
 * Bulk change status for multiple members.
 */
export function useBulkChangeStatus(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberIds, newStatus, reason }: BulkChangeStatusInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/members/bulk/change-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds, newStatus, reason }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Aendern des Status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
    onError: (error) => {
      throw error;
    },
    retry: 1,
  });
}

/**
 * Anonymize a member (DSGVO Art. 17).
 * Irreversible. Only for members with status LEFT.
 */
export function useAnonymizeMember(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${id}/anonymize`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler bei der Anonymisierung');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
    onError: (error) => {
      throw error;
    },
  });
}
