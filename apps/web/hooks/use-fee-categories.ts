import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { FeeCategoryResponse, CreateFeeCategory, UpdateFeeCategory } from '@ktb/shared';

// ============================================================================
// Query Key Factory
// ============================================================================

export const feeCategoryKeys = {
  all: (slug: string) => ['feeCategories', slug] as const,
  list: (slug: string) => [...feeCategoryKeys.all(slug), 'list'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all fee categories for a club.
 */
export function useFeeCategories(slug: string) {
  return useQuery<FeeCategoryResponse[]>({
    queryKey: feeCategoryKeys.list(slug),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/categories`);
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Beitragsdaten. Bitte versuche es erneut.');
      }
      return res.json();
    },
    staleTime: 60_000, // 1 minute
    enabled: !!slug,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new fee category.
 */
export function useCreateFeeCategory(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateFeeCategory): Promise<FeeCategoryResponse> => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message ||
            'Beitragskategorie konnte nicht erstellt werden. Bitte pruefe deine Eingaben.'
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: feeCategoryKeys.list(slug),
      });
      toast({ title: 'Beitragskategorie erstellt' });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error
            ? error.message
            : 'Beitragskategorie konnte nicht erstellt werden. Bitte pruefe deine Eingaben.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update an existing fee category.
 */
export function useUpdateFeeCategory(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFeeCategory;
    }): Promise<FeeCategoryResponse> => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Aktualisieren der Beitragskategorie');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: feeCategoryKeys.list(slug),
      });
      toast({ title: 'Beitragskategorie aktualisiert' });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error
            ? error.message
            : 'Fehler beim Aktualisieren der Beitragskategorie',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a fee category (soft delete).
 */
export function useDeleteFeeCategory(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/categories/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Loeschen der Beitragskategorie');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: feeCategoryKeys.list(slug),
      });
      toast({ title: 'Beitragskategorie geloescht' });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'Fehler beim Loeschen der Beitragskategorie',
        variant: 'destructive',
      });
    },
  });
}
