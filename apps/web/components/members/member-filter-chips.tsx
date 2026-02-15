'use client';

import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MemberFilters, SetMemberFilters, MemberStatus } from '@/hooks/use-member-filters';

/** German labels for member status values */
const STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: 'Aktiv',
  PROBATION: 'Probezeit',
  DORMANT: 'Ruhend',
  SUSPENDED: 'Gesperrt',
  PENDING: 'Mitgliedschaft beantragt',
  LEFT: 'Ausgetreten',
};

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
          label={`Haushalt: ${getHouseholdLabel(filters.household)}`}
          onRemove={(e) => {
            e.stopPropagation();
            setFilters({ household: '' });
          }}
        />
      )}
      {hasPeriod && (
        <FilterChip
          label={`Zeitraum: ${filters.period}`}
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

/** Individual filter chip with label and remove button */
function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: (e: React.MouseEvent) => void;
}) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      <span className="max-w-[200px] truncate">{label}</span>
      <button
        type="button"
        className="ring-offset-background focus:ring-ring hover:bg-muted-foreground/20 ml-0.5 rounded-full p-0.5 outline-none focus:ring-2 focus:ring-offset-1"
        onClick={onRemove}
        aria-label={`Filter entfernen: ${label}`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}
