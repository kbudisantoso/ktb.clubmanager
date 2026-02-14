import { useQueryStates, parseAsString, parseAsArrayOf, parseAsStringLiteral } from 'nuqs';

/**
 * Member status values matching the shared MemberStatus type.
 * Defined as a const array for nuqs parseAsStringLiteral.
 */
export const MEMBER_STATUSES = [
  'ACTIVE',
  'PROBATION',
  'DORMANT',
  'SUSPENDED',
  'PENDING',
  'LEFT',
] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

/**
 * Centralized member list filter state managed via URL search params.
 *
 * All filter state is synced to the URL, enabling:
 * - Back/forward button navigation through filter states
 * - Shareable filtered views via URL
 * - State persistence across page refreshes
 *
 * @example
 * const [filters, setFilters] = useMemberFilters();
 *
 * // Read filter values
 * filters.search   // string (default: '')
 * filters.status   // MemberStatus[] (default: [])
 * filters.household // string (default: '')
 * filters.member   // string (default: '', replaces useMemberPanelUrl)
 * filters.period   // string (default: '', membership period year filter)
 *
 * // Update filters
 * setFilters({ search: 'Smith' });
 * setFilters({ status: ['ACTIVE', 'PENDING'] });
 * setFilters({ member: null }); // clear a single filter
 */
export function useMemberFilters() {
  return useQueryStates(
    {
      search: parseAsString.withDefault(''),
      status: parseAsArrayOf(parseAsStringLiteral(MEMBER_STATUSES)).withDefault([]),
      household: parseAsString.withDefault(''),
      member: parseAsString.withDefault(''),
      period: parseAsString.withDefault(''),
    },
    {
      shallow: true,
      history: 'replace',
      clearOnDefault: true,
    }
  );
}

export type MemberFilters = ReturnType<typeof useMemberFilters>[0];
export type SetMemberFilters = ReturnType<typeof useMemberFilters>[1];
