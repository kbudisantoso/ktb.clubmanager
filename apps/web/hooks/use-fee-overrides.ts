import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Types
// ============================================================================

export type FeeOverrideType = 'EXEMPT' | 'CUSTOM_AMOUNT' | 'ADDITIONAL';

export interface FeeOverrideResponse {
  id: string;
  memberId: string;
  feeCategoryId: string | null;
  overrideType: FeeOverrideType;
  customAmount: string | null;
  reason: string | null;
  isBaseFee: boolean;
  feeCategory: {
    id: string;
    name: string;
    amount: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeeOverrideInput {
  memberId: string;
  feeCategoryId?: string;
  overrideType: FeeOverrideType;
  customAmount?: string;
  reason?: string;
  isBaseFee?: boolean;
}

// ============================================================================
// Query Key Factory
// ============================================================================

export const feeOverrideKeys = {
  all: (slug: string) => ['feeOverrides', slug] as const,
  member: (slug: string, memberId: string) =>
    [...feeOverrideKeys.all(slug), 'member', memberId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all fee overrides for a specific member.
 */
export function useFeeOverrides(slug: string, memberId: string) {
  return useQuery<FeeOverrideResponse[]>({
    queryKey: feeOverrideKeys.member(slug, memberId),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/overrides/member/${memberId}`);
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Beitragsanpassungen');
      }
      return res.json();
    },
    staleTime: 60_000,
    enabled: !!slug && !!memberId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new fee override for a member.
 */
export function useCreateFeeOverride(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateFeeOverrideInput): Promise<FeeOverrideResponse> => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message || 'Beitragsanpassung konnte nicht erstellt werden. Bitte pruefe deine Eingaben.'
        );
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: feeOverrideKeys.member(slug, variables.memberId),
      });
      toast({ title: 'Beitragsanpassung gespeichert' });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error
            ? error.message
            : 'Beitragsanpassung konnte nicht erstellt werden. Bitte pruefe deine Eingaben.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a fee override.
 */
export function useDeleteFeeOverride(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/overrides/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Entfernen der Beitragsanpassung');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: feeOverrideKeys.all(slug),
      });
      toast({ title: 'Beitragsanpassung entfernt' });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'Fehler beim Entfernen der Beitragsanpassung',
        variant: 'destructive',
      });
    },
  });
}
