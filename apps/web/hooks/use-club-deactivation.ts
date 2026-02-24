import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { clubKeys } from './use-clubs';

/**
 * Calculate remaining days until scheduled deletion.
 * Returns null if no date is provided.
 */
export function getDaysRemaining(scheduledDeletionAt: string | null): number | null {
  if (!scheduledDeletionAt) return null;

  const now = new Date();
  const deletion = new Date(scheduledDeletionAt);
  const diffMs = deletion.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Format countdown text for display.
 * - 0 days: "Löschung heute"
 * - 1 day: "Noch 1 Tag"
 * - >1 days: "Noch X Tage"
 */
export function formatCountdown(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'Löschung heute';
  if (daysRemaining === 1) return 'Noch 1 Tag';
  return `Noch ${daysRemaining} Tage`;
}

/**
 * Hook for deactivating a club.
 * POST /api/clubs/:slug/deactivate with { gracePeriodDays, confirmationName }.
 * Invalidates club queries on success.
 */
export function useDeactivateClub(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      gracePeriodDays: number;
      confirmationName: string;
    }): Promise<{ message: string }> => {
      const res = await apiFetch(`/api/clubs/${slug}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Fehler beim Deaktivieren des Vereins');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });
}

/**
 * Hook for reactivating a deactivated club.
 * POST /api/clubs/:slug/reactivate.
 * Invalidates club queries on success.
 */
export function useReactivateClub(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ message: string }> => {
      const res = await apiFetch(`/api/clubs/${slug}/reactivate`, {
        method: 'POST',
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Fehler beim Reaktivieren des Vereins');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });
}
