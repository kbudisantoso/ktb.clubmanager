import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { feeChargeKeys } from '@/hooks/use-fee-charges';
import type { BillingRunPreview, BillingRunPreviewResponse, BillingRunConfirm } from '@ktb/shared';

// ============================================================================
// Types
// ============================================================================

export interface BillingRunConfirmResponse {
  chargesCreated: number;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Preview a billing run (no side effects).
 * Returns member counts, totals, exemptions, and breakdown.
 */
export function useBillingRunPreview(slug: string) {
  const { toast } = useToast();

  return useMutation<BillingRunPreviewResponse, Error, BillingRunPreview>({
    mutationFn: async (data) => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/charges/billing-run/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message ||
            'Die Beitragserhebung konnte nicht durchgefuehrt werden. Bitte versuche es erneut.'
        );
      }

      return res.json();
    },
    onError: () => {
      toast({
        title: 'Die Beitragserhebung konnte nicht durchgefuehrt werden. Bitte versuche es erneut.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Confirm a billing run (creates FeeCharge records).
 * On success, invalidates fee charge queries and shows success toast.
 */
export function useBillingRunConfirm(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<BillingRunConfirmResponse, Error, BillingRunConfirm>({
    mutationFn: async (data) => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/charges/billing-run/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message ||
            'Die Beitragserhebung konnte nicht durchgefuehrt werden. Bitte versuche es erneut.'
        );
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: feeChargeKeys.all(slug),
      });
      toast({
        title: `Erhebung abgeschlossen -- ${data.chargesCreated} Forderungen erstellt`,
      });
    },
    onError: () => {
      toast({
        title: 'Die Beitragserhebung konnte nicht durchgefuehrt werden. Bitte versuche es erneut.',
        variant: 'destructive',
      });
    },
  });
}
