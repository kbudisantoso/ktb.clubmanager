import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { FeeTypeResponse, CreateFeeType, UpdateFeeType } from '@ktb/shared';

// ============================================================================
// Query Key Factory
// ============================================================================

export const feeTypeKeys = {
  all: (slug: string) => ['feeTypes', slug] as const,
  list: (slug: string) => [...feeTypeKeys.all(slug), 'list'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all fee types for a club.
 */
export function useFeeTypes(slug: string) {
  return useQuery<FeeTypeResponse[]>({
    queryKey: feeTypeKeys.list(slug),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/types`);
      if (!res.ok) {
        throw new Error('Beitragsarten konnten nicht geladen werden');
      }
      return res.json();
    },
    staleTime: 60_000,
    enabled: !!slug,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new fee type.
 */
export function useCreateFeeType(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateFeeType): Promise<FeeTypeResponse> => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message ||
            'Beitragsart konnte nicht erstellt werden. Bitte pr\u00fcfe deine Eingaben.'
        );
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: feeTypeKeys.list(slug),
      });
      toast({ title: `Beitragsart "${data.name}" erstellt` });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error
            ? error.message
            : 'Beitragsart konnte nicht erstellt werden. Bitte pr\u00fcfe deine Eingaben.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update an existing fee type.
 */
export function useUpdateFeeType(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFeeType;
    }): Promise<FeeTypeResponse> => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Aktualisieren der Beitragsart');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: feeTypeKeys.list(slug),
      });
      toast({ title: `Beitragsart "${data.name}" aktualisiert` });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Beitragsart',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a fee type (soft delete).
 */
export function useDeleteFeeType(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/types/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim L\u00f6schen der Beitragsart');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: feeTypeKeys.list(slug),
      });
      toast({ title: 'Beitragsart gel\u00f6scht' });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'Fehler beim L\u00f6schen der Beitragsart',
        variant: 'destructive',
      });
    },
  });
}
