'use client';

import { Search, Shield, UserCheck } from 'lucide-react';
import { FilterChip } from '@/components/shared/filter-chip';
import { ROLE_LABELS } from './user-role-badges';
import type { UserFilters, SetUserFilters } from '@/hooks/use-user-filters';

/** German labels for user statuses used in filter chips */
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktiv',
  PENDING: 'Eingeladen',
  SUSPENDED: 'Gesperrt',
};

interface UserFilterChipsProps {
  /** Current filter state */
  filters: UserFilters;
  /** Setter to update filters */
  setFilters: SetUserFilters;
}

/**
 * Displays active filter chips for the user list.
 * Shows chips for search term, status filters, and role filters
 * with remove buttons to clear individual filters.
 */
export function UserFilterChips({ filters, setFilters }: UserFilterChipsProps) {
  const hasFilters = filters.search || filters.status.length > 0 || filters.roles.length > 0;

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Search chip */}
      {filters.search && (
        <FilterChip
          icon={<Search className="size-3" />}
          label={filters.search}
          onRemove={(e) => {
            e.preventDefault();
            setFilters({ search: null });
          }}
        />
      )}

      {/* Status chips */}
      {filters.status.map((status) => (
        <FilterChip
          key={`status-${status}`}
          icon={<UserCheck className="size-3" />}
          label={STATUS_LABELS[status] ?? status}
          onRemove={(e) => {
            e.preventDefault();
            setFilters({ status: filters.status.filter((s) => s !== status) });
          }}
        />
      ))}

      {/* Role chips */}
      {filters.roles.map((role) => (
        <FilterChip
          key={`role-${role}`}
          icon={<Shield className="size-3" />}
          label={ROLE_LABELS[role] ?? role}
          onRemove={(e) => {
            e.preventDefault();
            setFilters({ roles: filters.roles.filter((r) => r !== role) });
          }}
        />
      ))}
    </div>
  );
}
