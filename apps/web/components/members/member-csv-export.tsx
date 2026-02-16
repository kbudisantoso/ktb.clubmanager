'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { STATUS_LABELS } from '@/lib/member-status-labels';
import type { MemberListItem } from './member-list-table';
import type { MembershipType } from '@/hooks/use-membership-types';

// ============================================================================
// Column Configuration
// ============================================================================

interface ExportColumn {
  key: string;
  label: string;
  /** German CSV header */
  csvHeader: string;
  /** Whether this column is included by default */
  defaultSelected: boolean;
  /** Extract value from a member, optionally using membership types for lookup */
  getValue: (member: MemberListItem, membershipTypes?: MembershipType[]) => string;
}

/**
 * Get the active membership period for a member.
 */
function getActivePeriod(
  periods: MemberListItem['membershipPeriods']
): MemberListItem['membershipPeriods'][number] | null {
  if (periods.length === 0) return null;
  const current = periods.find((p) => !p.leaveDate);
  if (current) return current;
  return [...periods].sort((a, b) => {
    const dateA = a.joinDate ?? '';
    const dateB = b.joinDate ?? '';
    return dateB.localeCompare(dateA);
  })[0];
}

/**
 * Format ISO date to DD.MM.YYYY.
 */
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

const EXPORT_COLUMNS: ExportColumn[] = [
  {
    key: 'name',
    label: 'Name',
    csvHeader: 'Name',
    defaultSelected: true,
    getValue: (m) => {
      if (m.personType === 'LEGAL_ENTITY' && m.organizationName) {
        return m.organizationName;
      }
      return `${m.lastName}, ${m.firstName}`;
    },
  },
  {
    key: 'memberNumber',
    label: 'Nr.',
    csvHeader: 'Mitglieds-Nr.',
    defaultSelected: true,
    getValue: (m) => m.memberNumber,
  },
  {
    key: 'status',
    label: 'Status',
    csvHeader: 'Status',
    defaultSelected: true,
    getValue: (m) => STATUS_LABELS[m.status as keyof typeof STATUS_LABELS] ?? m.status,
  },
  {
    key: 'email',
    label: 'E-Mail',
    csvHeader: 'E-Mail',
    defaultSelected: true,
    getValue: (m) => m.email ?? '',
  },
  {
    key: 'phone',
    label: 'Telefon',
    csvHeader: 'Telefon',
    defaultSelected: true,
    getValue: (m) => m.mobile || m.phone || '',
  },
  {
    key: 'membershipType',
    label: 'Beitragsart',
    csvHeader: 'Beitragsart',
    defaultSelected: true,
    getValue: (m, types) => {
      const period = getActivePeriod(m.membershipPeriods);
      if (!period?.membershipTypeId) return '';
      const found = types?.find((t) => t.id === period.membershipTypeId);
      return found?.name ?? '';
    },
  },
  {
    key: 'joinDate',
    label: 'Eintritt',
    csvHeader: 'Eintrittsdatum',
    defaultSelected: true,
    getValue: (m) => {
      const period = getActivePeriod(m.membershipPeriods);
      return period?.joinDate ? formatDate(period.joinDate) : '';
    },
  },
  {
    key: 'household',
    label: 'Haushalt',
    csvHeader: 'Haushalt',
    defaultSelected: false,
    getValue: (m) => m.household?.name ?? '',
  },
  {
    key: 'notes',
    label: 'Notizen',
    csvHeader: 'Notizen',
    defaultSelected: false,
    getValue: () => '',
  },
];

// ============================================================================
// CSV Generation
// ============================================================================

/**
 * Escape a CSV field value. Wraps in quotes if it contains commas, quotes, or newlines.
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate a CSV string from member data and selected columns.
 * Includes UTF-8 BOM for Excel compatibility.
 */
function generateCsv(
  members: MemberListItem[],
  selectedColumns: ExportColumn[],
  membershipTypes?: MembershipType[]
): string {
  // UTF-8 BOM
  const bom = '\uFEFF';

  // Header row
  const header = selectedColumns.map((col) => escapeCsvField(col.csvHeader)).join(';');

  // Data rows
  const rows = members.map((member) =>
    selectedColumns.map((col) => escapeCsvField(col.getValue(member, membershipTypes))).join(';')
  );

  return bom + [header, ...rows].join('\r\n');
}

/**
 * Trigger a CSV file download in the browser.
 */
function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Component
// ============================================================================

interface MemberCsvExportDialogProps {
  /** Members to export */
  members: MemberListItem[];
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Available membership types for label resolution */
  membershipTypes?: MembershipType[];
}

/**
 * Dialog for configuring and exporting selected members as CSV.
 * Allows choosing which columns to include in the export.
 */
export function MemberCsvExportDialog({
  members,
  open,
  onOpenChange,
  membershipTypes,
}: MemberCsvExportDialogProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(EXPORT_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.key))
  );

  const toggleColumn = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleExport = () => {
    const selectedColumns = EXPORT_COLUMNS.filter((c) => selectedKeys.has(c.key));
    if (selectedColumns.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const filename = `mitglieder-export-${today}.csv`;
    const csv = generateCsv(members, selectedColumns, membershipTypes);
    downloadCsv(csv, filename);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>CSV-Export</DialogTitle>
          <DialogDescription>
            Wähle die Spalten für den Export von {members.length}{' '}
            {members.length === 1 ? 'Mitglied' : 'Mitgliedern'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {EXPORT_COLUMNS.map((col) => (
            <div key={col.key} className="flex items-center gap-3">
              <Checkbox
                id={`export-col-${col.key}`}
                checked={selectedKeys.has(col.key)}
                onCheckedChange={() => toggleColumn(col.key)}
              />
              <Label htmlFor={`export-col-${col.key}`} className="cursor-pointer text-sm">
                {col.label}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleExport} disabled={selectedKeys.size === 0}>
            Exportieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
