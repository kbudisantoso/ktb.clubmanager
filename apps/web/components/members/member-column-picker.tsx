'use client';

import { ColumnPicker } from '@/components/shared/column-picker';
import type { ColumnKey } from '@/hooks/use-column-visibility';

/** Labels for each member column */
const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: 'Name',
  memberNumber: 'Nr.',
  status: 'Status',
  email: 'E-Mail',
  phone: 'Telefon',
  household: 'Haushalt',
  membershipType: 'Mitgliedschaft',
  joinDate: 'Eintritt',
  notes: 'Notizen',
};

interface MemberColumnPickerProps {
  columns: Record<ColumnKey, boolean>;
  order: ColumnKey[];
  onToggle: (key: ColumnKey) => void;
  onReorder: (order: ColumnKey[]) => void;
  onReset: () => void;
  isDefault: boolean;
}

/**
 * Member-specific column picker.
 * Thin wrapper around ColumnPicker with member column labels.
 */
export function MemberColumnPicker({
  columns,
  order,
  onToggle,
  onReorder,
  onReset,
  isDefault,
}: MemberColumnPickerProps) {
  return (
    <ColumnPicker
      columns={columns}
      order={order}
      labels={COLUMN_LABELS}
      onToggle={onToggle}
      onReorder={onReorder}
      onReset={onReset}
      isDefault={isDefault}
    />
  );
}
