import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { feeChargeKeys } from '@/hooks/use-fee-charges';
import type { PaymentResponse, RecordPayment } from '@ktb/shared';

// ============================================================================
// Query Key Factory
// ============================================================================

export const paymentKeys = {
  all: (slug: string) => ['payments', slug] as const,
  forCharge: (slug: string, chargeId: string) =>
    [...paymentKeys.all(slug), 'charge', chargeId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch payments for a specific fee charge.
 */
export function usePaymentsForCharge(slug: string, chargeId: string) {
  return useQuery<PaymentResponse[]>({
    queryKey: paymentKeys.forCharge(slug, chargeId),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/payments/charge/${chargeId}`);

      if (!res.ok) {
        throw new Error('Fehler beim Laden der Zahlungsdaten');
      }

      return res.json();
    },
    staleTime: 30_000,
    enabled: !!slug && !!chargeId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Record a manual payment against a fee charge.
 * On success, invalidates both payment and fee charge queries.
 */
export function useRecordPayment(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<PaymentResponse, Error, RecordPayment>({
    mutationFn: async (data) => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message ||
            'Zahlung konnte nicht erfasst werden. Bitte versuche es erneut.'
        );
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: paymentKeys.all(slug),
      });
      queryClient.invalidateQueries({
        queryKey: feeChargeKeys.all(slug),
      });
      toast({
        title: 'Zahlung erfasst',
      });
    },
    onError: () => {
      toast({
        title: 'Zahlung konnte nicht erfasst werden. Bitte versuche es erneut.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a payment (soft delete).
 * On success, invalidates both payment and fee charge queries.
 */
export function useDeletePayment(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, string>({
    mutationFn: async (paymentId) => {
      const res = await apiFetch(`/api/clubs/${slug}/fees/payments/${paymentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Zahlung konnte nicht geloescht werden');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: paymentKeys.all(slug),
      });
      queryClient.invalidateQueries({
        queryKey: feeChargeKeys.all(slug),
      });
      toast({
        title: 'Zahlung geloescht',
      });
    },
    onError: () => {
      toast({
        title: 'Zahlung konnte nicht geloescht werden. Bitte versuche es erneut.',
        variant: 'destructive',
      });
    },
  });
}
