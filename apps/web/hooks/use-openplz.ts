import { useQuery } from '@tanstack/react-query';

// ============================================================================
// Constants
// ============================================================================

const OPENPLZ_BASE = 'https://openplzapi.org/de';
const OPENPLZ_TIMEOUT = 3_000; // 3 seconds

// ============================================================================
// Types
// ============================================================================

export interface Locality {
  name: string;
  postalCode: string;
  municipality?: { name: string };
  federalState?: { name: string };
}

export interface Street {
  name: string;
  postalCode: string;
  locality: string;
  municipality?: { name: string };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch localities (cities) for a German postal code via OpenPLZ API.
 *
 * - Only queries when postalCode is a valid 5-digit PLZ
 * - 3-second timeout with graceful fallback (returns empty array)
 * - Cached for 24 hours (PLZ-to-city mappings are stable)
 * - Never blocks form submission - user can always type manually
 */
export function useOpenPlzLocalities(postalCode: string) {
  return useQuery<Locality[]>({
    queryKey: ['openplz', 'localities', postalCode],
    queryFn: async (): Promise<Locality[]> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OPENPLZ_TIMEOUT);

      try {
        const res = await fetch(`${OPENPLZ_BASE}/Localities?postalCode=${postalCode}`, {
          headers: { accept: 'text/json' },
          signal: controller.signal,
        });
        if (!res.ok) return [];
        return res.json();
      } catch {
        // Graceful fallback on error/timeout - never block the form
        return [];
      } finally {
        clearTimeout(timeout);
      }
    },
    enabled: /^\d{5}$/.test(postalCode), // Only valid 5-digit PLZ
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: false, // Don't retry external API failures
  });
}

/**
 * Fetch streets within a PLZ area for address autocomplete.
 *
 * - Only queries when postalCode, locality, and search (2+ chars) are provided
 * - Same timeout/fallback pattern as localities
 * - Cached for 24 hours
 */
export function useOpenPlzStreets(postalCode: string, locality: string, search: string) {
  return useQuery<Street[]>({
    queryKey: ['openplz', 'streets', postalCode, locality, search],
    queryFn: async (): Promise<Street[]> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OPENPLZ_TIMEOUT);

      try {
        const params = new URLSearchParams({
          postalCode,
          locality,
          name: search,
        });
        const res = await fetch(`${OPENPLZ_BASE}/Streets?${params}`, {
          headers: { accept: 'text/json' },
          signal: controller.signal,
        });
        if (!res.ok) return [];
        return res.json();
      } catch {
        // Graceful fallback on error/timeout
        return [];
      } finally {
        clearTimeout(timeout);
      }
    },
    enabled: /^\d{5}$/.test(postalCode) && locality.length > 0 && search.length >= 2,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: false,
  });
}
