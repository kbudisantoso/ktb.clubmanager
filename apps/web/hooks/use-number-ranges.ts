import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { NumberRangeResponse, CreateNumberRange, UpdateNumberRange } from '@ktb/shared';

// ============================================================================
// Query Key Factory
// ============================================================================

export const numberRangeKeys = {
  all: (slug: string) => ['numberRanges', slug] as const,
  list: (slug: string) => [...numberRangeKeys.all(slug), 'list'] as const,
  detail: (slug: string, id: string) => [...numberRangeKeys.all(slug), 'detail', id] as const,
  preview: (slug: string, id: string) => [...numberRangeKeys.all(slug), 'preview', id] as const,
};

// ============================================================================
// Types - imported from @ktb/shared, re-exported for backwards compatibility
// ============================================================================

/** Number range entity from the API (re-exported from @ktb/shared) */
export type NumberRange = NumberRangeResponse;

/** Input for creating a number range (re-exported from @ktb/shared) */
export type CreateNumberRangeInput = CreateNumberRange;

/** Input for updating a number range (re-exported from @ktb/shared) */
export type UpdateNumberRangeInput = UpdateNumberRange;

/** API-specific preview response (not in shared schemas) */
interface PreviewResponse {
  preview: string;
  currentValue: number;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all number ranges for a club.
 */
export function useNumberRanges(slug: string) {
  return useQuery<NumberRange[]>({
    queryKey: numberRangeKeys.list(slug),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/number-ranges`);
      if (!res.ok) {
        if (res.status === 403) {
          return [];
        }
        throw new Error('Fehler beim Laden der Nummernkreise');
      }
      return res.json();
    },
    staleTime: 60_000, // 1 minute - rarely changes
    enabled: !!slug,
  });
}

/**
 * Preview the next number for a range without generating it.
 */
export function usePreviewNumber(slug: string, rangeId: string) {
  return useQuery<PreviewResponse>({
    queryKey: numberRangeKeys.preview(slug, rangeId),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/number-ranges/${rangeId}/preview`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Vorschau');
      }
      return res.json();
    },
    enabled: !!rangeId,
    staleTime: 10_000, // 10 seconds - can change frequently
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new number range.
 */
export function useCreateNumberRange(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNumberRangeInput): Promise<NumberRange> => {
      const res = await apiFetch(`/api/clubs/${slug}/number-ranges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Erstellen des Nummernkreises');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: numberRangeKeys.all(slug),
      });
    },
  });
}

/**
 * Update an existing number range.
 */
export function useUpdateNumberRange(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateNumberRangeInput;
    }): Promise<NumberRange> => {
      const res = await apiFetch(`/api/clubs/${slug}/number-ranges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Aktualisieren des Nummernkreises');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: numberRangeKeys.all(slug),
      });
    },
  });
}

/**
 * Delete a number range.
 */
export function useDeleteNumberRange(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/clubs/${slug}/number-ranges/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Loeschen des Nummernkreises');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: numberRangeKeys.all(slug),
      });
    },
  });
}

export type { PreviewResponse };
