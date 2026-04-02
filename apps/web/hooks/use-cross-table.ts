import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { CrossTableEntryResponse, UpsertCrossTableEntry } from '@ktb/shared';

// ============================================================================
// Query Key Factory
// ============================================================================

export const crossTableKeys = {
  all: (slug: string) => ['crossTable', slug] as const,
  list: (slug: string) => [...crossTableKeys.all(slug), 'list'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all cross-table entries for a club.
 */
export function useCrossTable(slug: string) {
  return useQuery<CrossTableEntryResponse[]>({
    queryKey: crossTableKeys.list(slug),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/types/cross-table`);
      if (!res.ok) {
        throw new Error('Beitragstabelle konnte nicht geladen werden');
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
 * Upsert a cross-table entry (create or update an amount cell).
 */
export function useUpsertCrossTableEntry(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpsertCrossTableEntry): Promise<CrossTableEntryResponse> => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/types/cross-table`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Betrag konnte nicht gespeichert werden');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: crossTableKeys.all(slug),
      });
      toast({ title: 'Betrag gespeichert' });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'Betrag konnte nicht gespeichert werden',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a cross-table entry.
 */
export function useDeleteCrossTableEntry(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/types/cross-table/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Eintrag konnte nicht gel\u00f6scht werden');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: crossTableKeys.all(slug),
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'Eintrag konnte nicht gel\u00f6scht werden',
        variant: 'destructive',
      });
    },
  });
}
