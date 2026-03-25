'use client';

import { MultiSelectFilter } from '@/components/shared/multi-select-filter';
import { type MemberStatus, MEMBER_STATUSES } from '@/hooks/use-member-filters';
import { STATUS_LABELS } from '@/lib/member-status-labels';

const STATUS_OPTIONS = MEMBER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

interface MemberFilterStatusProps {
  selected: MemberStatus[];
  onSelectionChange: (statuses: MemberStatus[]) => void;
}

/**
 * Member status multi-select filter.
 * Thin wrapper around MultiSelectFilter with member-specific status options.
 */
export function MemberFilterStatus({ selected, onSelectionChange }: MemberFilterStatusProps) {
  return (
    <MultiSelectFilter
      label="Status"
      options={STATUS_OPTIONS}
      selected={selected}
      onSelectionChange={onSelectionChange as (selected: string[]) => void}
    />
  );
}
