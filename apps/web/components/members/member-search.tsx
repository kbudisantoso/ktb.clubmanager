'use client';

import { DataTableSearch } from '@/components/shared/data-table-search';

interface MemberSearchProps {
  /** Current search value */
  value: string;
  /** Called when the search value changes */
  onChange: (value: string) => void;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Member-specific search input.
 * Thin wrapper around DataTableSearch with German member placeholder.
 */
export function MemberSearch({ value, onChange, className }: MemberSearchProps) {
  return (
    <DataTableSearch
      value={value}
      onChange={onChange}
      placeholder="Name oder Mitgliedsnummer suchen..."
      className={className}
    />
  );
}
