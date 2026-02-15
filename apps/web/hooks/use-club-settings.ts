import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { clubKeys } from './use-clubs';
import type { UpdateClubSettings } from '@ktb/shared';

/**
 * Extended club detail response with all settings fields.
 */
export interface ClubSettingsResponse {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  // Stammdaten
  legalName?: string | null;
  shortCode?: string | null;
  foundedAt?: string | null;
  // Adresse & Kontakt
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  // Vereinsregister
  isRegistered: boolean;
  registryCourt?: string | null;
  registryNumber?: string | null;
  clubPurpose?: string | null;
  clubSpecialForm?: string | null;
  // Steuerdaten
  taxNumber?: string | null;
  vatId?: string | null;
  taxOffice?: string | null;
  isNonProfit: boolean;
  // Bankverbindung
  iban?: string | null;
  bic?: string | null;
  bankName?: string | null;
  accountHolder?: string | null;
  // Betriebseinstellungen
  fiscalYearStartMonth?: number | null;
  defaultMembershipTypeId?: string | null;
  probationPeriodDays?: number | null;
  // Logo
  logoFileId?: string | null;
  // Meta
  avatarColor?: string | null;
  inviteCode?: string | null;
  userCount: number;
  memberCount: number;
}

/** Query key factory for settings */
export const settingsKeys = {
  detail: (slug: string) => [...clubKeys.detail(slug), 'settings'] as const,
};

/**
 * Hook for fetching club settings (full club detail with all fields).
 * Uses the existing GET /api/clubs/:slug endpoint which now returns all settings fields.
 */
export function useClubSettings(slug: string) {
  return useQuery({
    queryKey: settingsKeys.detail(slug),
    queryFn: async (): Promise<ClubSettingsResponse> => {
      const res = await apiFetch(`/api/clubs/${slug}`);
      if (!res.ok) {
        throw new Error('Vereinseinstellungen konnten nicht geladen werden');
      }
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!slug,
  });
}

/**
 * Hook for updating club settings.
 * Sends only changed fields to PUT /api/clubs/:slug.
 */
export function useUpdateClubSettings(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<UpdateClubSettings>): Promise<ClubSettingsResponse> => {
      const res = await apiFetch(`/api/clubs/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Unbekannter Fehler' }));
        throw new Error(error.message || 'Fehler beim Speichern der Einstellungen');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate both settings detail and club detail queries
      queryClient.invalidateQueries({ queryKey: clubKeys.detail(slug) });
      queryClient.invalidateQueries({ queryKey: settingsKeys.detail(slug) });
      // Also invalidate my clubs list (name might have changed)
      queryClient.invalidateQueries({ queryKey: clubKeys.my() });
    },
  });
}
