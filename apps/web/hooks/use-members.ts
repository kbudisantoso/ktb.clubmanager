import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { MemberListItem } from '@/components/members/member-list-table';

// ============================================================================
// Query Key Factory
// ============================================================================

export interface MemberInfiniteFilters {
  search?: string;
  status?: string[];
  household?: string;
  periodYear?: number;
}

export const memberKeys = {
  all: (slug: string) => ['members', slug] as const,
  list: (slug: string, params?: Record<string, unknown>) =>
    [...memberKeys.all(slug), 'list', params] as const,
  infinite: (slug: string, filters?: MemberInfiniteFilters) =>
    [...memberKeys.all(slug), 'infinite', filters] as const,
  detail: (slug: string, id: string) => [...memberKeys.all(slug), 'detail', id] as const,
  statusHistory: (slug: string, memberId: string) =>
    [...memberKeys.all(slug), 'status-history', memberId] as const,
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
  version: number;
}

interface ChangeStatusInput {
  id: string;
  newStatus: string;
  reason: string;
  effectiveDate?: string;
  leftCategory?: string;
  membershipTypeId?: string;
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
 * Supports search, multi-status, household, and period year filtering.
 */
export function useMembersInfinite(slug: string, filters?: MemberInfiniteFilters) {
  return useInfiniteQuery<PaginatedMembersResponse>({
    queryKey: memberKeys.infinite(slug, filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (pageParam) params.set('cursor', pageParam as string);
      if (filters?.status && filters.status.length > 0) {
        params.set('status', filters.status.join(','));
      }
      if (filters?.household) params.set('householdFilter', filters.household);
      if (filters?.periodYear) params.set('periodYear', String(filters.periodYear));
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

/**
 * Status history entry from the status-history endpoint.
 */
export interface StatusHistoryEntry {
  id: string;
  memberId: string;
  clubId: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
  leftCategory: string | null;
  effectiveDate: string;
  actorId: string;
  createdAt: string;
}

/**
 * Fetch status transition history for a single member.
 * Returns chronological list of all status changes.
 */
export function useMemberStatusHistory(slug: string, memberId: string | undefined) {
  return useQuery<StatusHistoryEntry[]>({
    queryKey: memberKeys.statusHistory(slug, memberId ?? ''),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${memberId}/status-history`);
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Statushistorie');
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
        throw new Error(error.message || 'Fehler beim Löschen des Mitglieds');
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
    mutationFn: async ({
      id,
      newStatus,
      reason,
      effectiveDate,
      leftCategory,
      membershipTypeId,
    }: ChangeStatusInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${id}/change-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus,
          reason,
          ...(effectiveDate && { effectiveDate }),
          ...(leftCategory && { leftCategory }),
          ...(membershipTypeId && { membershipTypeId }),
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Ändern des Status');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(slug, variables.id),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
      // Invalidate periods (may have been created/closed during transition)
      queryClient.invalidateQueries({
        queryKey: ['membershipPeriods', slug, variables.id],
      });
      // Invalidate status history (new transition was created)
      queryClient.invalidateQueries({
        queryKey: memberKeys.statusHistory(slug, variables.id),
      });
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
        throw new Error(error.message || 'Fehler beim Ändern des Status');
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
 * Record a cancellation for a member.
 * Sets cancellationDate, cancellationReceivedAt, and reason.
 */
export function useSetCancellation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      cancellationDate: string;
      cancellationReceivedAt: string;
      reason: string;
    }) => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${input.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellationDate: input.cancellationDate,
          cancellationReceivedAt: input.cancellationReceivedAt,
          reason: input.reason,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Erfassen der Kuendigung');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(slug, variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: memberKeys.statusHistory(slug, variables.id),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
    retry: 1,
  });
}

/**
 * Revoke an existing cancellation for a member.
 * Clears cancellationDate and cancellationReceivedAt.
 */
export function useRevokeCancellation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; reason?: string }) => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${input.id}/revoke-cancellation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: input.reason ?? '' }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Widerrufen der Kuendigung');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(slug, variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: memberKeys.statusHistory(slug, variables.id),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
    },
    retry: 1,
  });
}

/**
 * Update a status history entry (reason, effectiveDate, leftCategory).
 * PATCH /api/clubs/:slug/members/:memberId/status-history/:transitionId
 */
export function useUpdateStatusHistory(slug: string, memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transitionId,
      ...data
    }: {
      transitionId: string;
      reason?: string;
      effectiveDate?: string;
      leftCategory?: string;
    }) => {
      const res = await apiFetch(
        `/api/clubs/${slug}/members/${memberId}/status-history/${transitionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Aktualisieren des Eintrags');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.statusHistory(slug, memberId),
      });
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(slug, memberId),
      });
    },
    retry: 1,
  });
}

/**
 * Delete a status history entry (soft-delete).
 * DELETE /api/clubs/:slug/members/:memberId/status-history/:transitionId
 */
export function useDeleteStatusHistory(slug: string, memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transitionId: string) => {
      const res = await apiFetch(
        `/api/clubs/${slug}/members/${memberId}/status-history/${transitionId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Loeschen des Eintrags');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.statusHistory(slug, memberId),
      });
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(slug, memberId),
      });
    },
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
