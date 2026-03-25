import { useQueryStates, parseAsString, parseAsArrayOf, parseAsStringLiteral } from 'nuqs';

/**
 * Club user status values for filtering.
 * Defined as a const array for nuqs parseAsStringLiteral.
 */
export const CLUB_USER_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED'] as const;
export type ClubUserStatus = (typeof CLUB_USER_STATUSES)[number];

/**
 * Club role values for filtering.
 * Defined as a const array for nuqs parseAsStringLiteral.
 */
export const CLUB_ROLES = ['OWNER', 'ADMIN', 'TREASURER', 'SECRETARY', 'MEMBER'] as const;
export type ClubRole = (typeof CLUB_ROLES)[number];

/**
 * Centralized club user filter state managed via URL search params.
 *
 * All filter state is synced to the URL, enabling:
 * - Back/forward button navigation through filter states
 * - Shareable filtered views via URL
 * - State persistence across page refreshes
 *
 * @example
 * const [filters, setFilters] = useUserFilters();
 *
 * // Read filter values
 * filters.search  // string (default: '')
 * filters.status  // ClubUserStatus[] (default: [])
 * filters.roles   // ClubRole[] (default: [])
 * filters.user    // string (default: '', selected user ID)
 *
 * // Update filters
 * setFilters({ search: 'Smith' });
 * setFilters({ status: ['ACTIVE', 'PENDING'] });
 * setFilters({ user: null }); // clear a single filter
 */
export function useUserFilters() {
  return useQueryStates(
    {
      search: parseAsString.withDefault(''),
      status: parseAsArrayOf(parseAsStringLiteral(CLUB_USER_STATUSES)).withDefault([]),
      roles: parseAsArrayOf(parseAsStringLiteral(CLUB_ROLES)).withDefault([]),
      user: parseAsString.withDefault(''),
    },
    {
      shallow: true,
      history: 'replace',
      clearOnDefault: true,
    }
  );
}

export type UserFilters = ReturnType<typeof useUserFilters>[0];
export type SetUserFilters = ReturnType<typeof useUserFilters>[1];
