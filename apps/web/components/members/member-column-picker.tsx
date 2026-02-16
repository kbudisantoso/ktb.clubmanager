'use client';

import { SlidersHorizontal } from 'lucide-react';

import type { ColumnKey } from '@/hooks/use-column-visibility';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Labels for each toggleable column in display order */
const COLUMN_LABELS: { key: ColumnKey; label: string }[] = [
  { key: 'memberNumber', label: 'Nr.' },
  { key: 'status', label: 'Status' },
  { key: 'email', label: 'E-Mail' },
  { key: 'phone', label: 'Telefon' },
  { key: 'household', label: 'Haushalt' },
  { key: 'membershipType', label: 'Mitgliedschaft' },
  { key: 'joinDate', label: 'Eintritt' },
  { key: 'notes', label: 'Notizen' },
];

interface MemberColumnPickerProps {
  columns: Record<ColumnKey, boolean>;
  onToggle: (key: ColumnKey) => void;
  onReset: () => void;
  isDefault: boolean;
}

/**
 * Dropdown menu for toggling column visibility in the member list table.
 *
 * Shows 8 toggleable columns with checkboxes. Checkbox and Name columns
 * are always visible and not included in this picker.
 */
export function MemberColumnPicker({
  columns,
  onToggle,
  onReset,
  isDefault,
}: MemberColumnPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal />
          Spalten
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sichtbare Spalten</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {COLUMN_LABELS.map(({ key, label }) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={columns[key]}
            onCheckedChange={() => onToggle(key)}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isDefault} onSelect={onReset}>
          Zurücksetzen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
