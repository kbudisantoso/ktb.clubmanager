import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { FeeChargeResponse, FeeChargeQuery } from '@ktb/shared';

// ============================================================================
// Query Key Factory
// ============================================================================

export const feeChargeKeys = {
  all: (slug: string) => ['feeCharges', slug] as const,
  list: (slug: string, filters?: FeeChargeFilters) =>
    [...feeChargeKeys.all(slug), 'list', filters] as const,
  member: (slug: string, memberId: string) =>
    [...feeChargeKeys.all(slug), 'member', memberId] as const,
};

// ============================================================================
// Types
// ============================================================================

export type FeeChargeFilters = Omit<FeeChargeQuery, 'page' | 'limit'> & {
  page?: number;
  limit?: number;
};

export interface FeeChargeListResponse {
  data: FeeChargeResponse[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch fee charges for a club with optional filters.
 */
export function useFeeCharges(slug: string, filters?: FeeChargeFilters) {
  const { toast } = useToast();

  return useQuery<FeeChargeListResponse>({
    queryKey: feeChargeKeys.list(slug, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.memberId) params.set('memberId', filters.memberId);
      if (filters?.periodStart) params.set('periodStart', filters.periodStart);
      if (filters?.periodEnd) params.set('periodEnd', filters.periodEnd);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const query = params.toString();
      const url = `/api/clubs/${slug}/fees/charges${query ? `?${query}` : ''}`;
      const res = await apiFetch(url);

      if (!res.ok) {
        toast({
          title: 'Fehler beim Laden der Beitragsdaten. Bitte versuche es erneut.',
          variant: 'destructive',
        });
        throw new Error('Fehler beim Laden der Beitragsdaten');
      }

      return res.json();
    },
    staleTime: 30_000,
    enabled: !!slug,
  });
}

/**
 * Fetch fee charges for a specific member.
 */
export function useMemberFeeCharges(slug: string, memberId: string) {
  const { toast } = useToast();

  return useQuery<FeeChargeResponse[]>({
    queryKey: feeChargeKeys.member(slug, memberId),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/charges/member/${memberId}`);

      if (!res.ok) {
        toast({
          title: 'Fehler beim Laden der Beitragsdaten. Bitte versuche es erneut.',
          variant: 'destructive',
        });
        throw new Error('Fehler beim Laden der Beitragsdaten');
      }

      const json = await res.json();
      return json.data as FeeChargeResponse[];
    },
    staleTime: 30_000,
    enabled: !!slug && !!memberId,
  });
}
