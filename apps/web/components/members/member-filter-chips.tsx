'use client';

import { CalendarIcon, HomeIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/shared/filter-chip';
import type { MemberFilters, SetMemberFilters } from '@/hooks/use-member-filters';
import { STATUS_LABELS } from '@/lib/member-status-labels';

/** Labels for household meta-options */
const HOUSEHOLD_META_LABELS: Record<string, string> = {
  HAS: 'Mit Haushalt',
  NONE: 'Ohne Haushalt',
};

interface MemberFilterChipsProps {
  filters: MemberFilters;
  setFilters: SetMemberFilters;
  householdNames?: Map<string, string>;
}

/**
 * Active filter chip row with individual remove buttons and "clear all" link.
 * Returns null when no filters are active (zero vertical cost).
 */
export function MemberFilterChips({ filters, setFilters, householdNames }: MemberFilterChipsProps) {
  const hasSearch = filters.search !== '';
  const hasStatus = filters.status.length > 0;
  const hasHousehold = filters.household !== '';
  const hasPeriod = filters.period !== '';
  const hasAnyFilter = hasSearch || hasStatus || hasHousehold || hasPeriod;

  if (!hasAnyFilter) {
    return null;
  }

  function clearAll() {
    setFilters({
      search: '',
      status: [],
      household: '',
      period: '',
    });
  }

  /** Resolve household display label */
  function getHouseholdLabel(value: string): string {
    if (HOUSEHOLD_META_LABELS[value]) {
      return HOUSEHOLD_META_LABELS[value];
    }
    // Specific household IDs (comma-separated)
    const ids = value.split(',');
    const names = ids.map((id) => householdNames?.get(id) ?? id);
    return names.join(', ');
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasSearch && (
        <FilterChip
          label={`Suche: ${filters.search}`}
          onRemove={(e) => {
            e.stopPropagation();
            setFilters({ search: '' });
          }}
        />
      )}
      {hasStatus && (
        <FilterChip
          label={`Status: ${filters.status.map((s) => STATUS_LABELS[s]).join(', ')}`}
          onRemove={(e) => {
            e.stopPropagation();
            setFilters({ status: [] });
          }}
        />
      )}
      {hasHousehold && (
        <FilterChip
          icon={<HomeIcon className="size-3" />}
          label={getHouseholdLabel(filters.household)}
          onRemove={(e) => {
            e.stopPropagation();
            setFilters({ household: '' });
          }}
        />
      )}
      {hasPeriod && (
        <FilterChip
          icon={<CalendarIcon className="size-3" />}
          label={filters.period}
          onRemove={(e) => {
            e.stopPropagation();
            setFilters({ period: '' });
          }}
        />
      )}
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAll}>
        Alle Filter zurücksetzen
      </Button>
    </div>
  );
}
