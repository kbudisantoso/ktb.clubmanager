'use client';

import { useCallback, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useFeeTypes } from '@/hooks/use-fee-types';
import { useCrossTable, useUpsertCrossTableEntry } from '@/hooks/use-cross-table';
import { useMembershipTypes } from '@/hooks/use-membership-types';
import { useToast } from '@/hooks/use-toast';
import type { CrossTableEntryResponse, FeeTypeResponse } from '@ktb/shared';
import type { MembershipType } from '@/hooks/use-membership-types';

interface CrossTableMatrixProps {
  slug: string;
}

/**
 * Editable matrix table for MembershipType x FeeType = amount.
 * Rows: MembershipTypes, Columns: Active FeeTypes, Cells: editable amounts.
 */
export function CrossTableMatrix({ slug }: CrossTableMatrixProps) {
  const { data: feeTypes, isLoading: feeTypesLoading } = useFeeTypes(slug);
  const { data: crossTableEntries, isLoading: crossTableLoading } = useCrossTable(slug);
  const { data: membershipTypes, isLoading: membershipTypesLoading } = useMembershipTypes(slug);

  const isLoading = feeTypesLoading || crossTableLoading || membershipTypesLoading;

  const activeFeeTypes = (feeTypes ?? []).filter((ft) => ft.isActive);
  const mtList = membershipTypes ?? [];
  const entries = crossTableEntries ?? [];

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-80 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state: no FeeTypes
  if (activeFeeTypes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Beitragstabelle</CardTitle>
          <CardDescription>Betr\u00e4ge pro Mitgliedsart und Beitragsart</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">
              Beitragstabelle nicht verf\u00fcgbar
            </h3>
            <p className="text-muted-foreground max-w-md">
              Erstelle zuerst Beitragsarten (siehe oben), um die Beitragstabelle zu
              bef\u00fcllen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state: no MembershipTypes
  if (mtList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Beitragstabelle</CardTitle>
          <CardDescription>Betr\u00e4ge pro Mitgliedsart und Beitragsart</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Keine Mitgliedsarten vorhanden</h3>
            <p className="text-muted-foreground max-w-md">
              Erstelle zuerst Mitgliedsarten in den Vereinseinstellungen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Beitragstabelle</CardTitle>
        <CardDescription>Betr\u00e4ge pro Mitgliedsart und Beitragsart</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Mitgliedsart</TableHead>
                {activeFeeTypes.map((ft) => (
                  <TableHead key={ft.id} scope="col" className="text-right min-w-[120px]">
                    {ft.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mtList.map((mt) => (
                <TableRow key={mt.id}>
                  <TableCell className="font-medium" scope="row">
                    {mt.name}
                  </TableCell>
                  {activeFeeTypes.map((ft) => {
                    const entry = entries.find(
                      (e) => e.membershipTypeId === mt.id && e.feeTypeId === ft.id
                    );
                    return (
                      <MatrixCell
                        key={`${mt.id}-${ft.id}`}
                        slug={slug}
                        membershipType={mt}
                        feeType={ft}
                        entry={entry}
                      />
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Leere Zellen bedeuten, dass die Kombination nicht verf\u00fcgbar ist. Trage einen
          Betrag ein, um die Zuordnung zu aktivieren.
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MatrixCell — inline editable amount cell
// ============================================================================

interface MatrixCellProps {
  slug: string;
  membershipType: MembershipType;
  feeType: FeeTypeResponse;
  entry: CrossTableEntryResponse | undefined;
}

function MatrixCell({ slug, membershipType, feeType, entry }: MatrixCellProps) {
  const upsertMutation = useUpsertCrossTableEntry(slug);
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format amount for display (German decimal format)
  const displayValue = entry ? formatGermanDecimal(entry.amount) : '';

  const startEditing = useCallback(() => {
    setLocalValue(entry ? formatGermanDecimal(entry.amount) : '');
    setIsEditing(true);
    // Focus input on next tick
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [entry]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setLocalValue('');
  }, []);

  const saveValue = useCallback(async () => {
    const trimmed = localValue.trim();

    // Empty value means remove the entry — just cancel
    if (!trimmed) {
      cancelEditing();
      return;
    }

    // Normalize: replace comma with dot for validation
    const normalized = trimmed.replace(',', '.');
    const num = parseFloat(normalized);

    if (isNaN(num) || num < 0) {
      toast({
        title: 'Fehler',
        description: 'Bitte gib einen g\u00fcltigen Betrag ein (z.B. 65,00).',
        variant: 'destructive',
      });
      return;
    }

    // Check if the value actually changed
    if (entry && parseFloat(entry.amount) === num) {
      cancelEditing();
      return;
    }

    setIsSaving(true);
    try {
      await upsertMutation.mutateAsync({
        membershipTypeId: membershipType.id,
        feeTypeId: feeType.id,
        amount: normalized,
      });
      setIsEditing(false);
    } catch {
      // Error toast is handled by the mutation hook
    } finally {
      setIsSaving(false);
    }
  }, [localValue, entry, membershipType.id, feeType.id, upsertMutation, cancelEditing, toast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveValue();
      } else if (e.key === 'Escape') {
        cancelEditing();
      }
    },
    [saveValue, cancelEditing]
  );

  const ariaLabel = `${membershipType.name} ${feeType.name} Betrag`;

  if (isEditing) {
    return (
      <TableCell className="text-right p-1">
        <Input
          ref={inputRef}
          className={`w-[100px] text-right text-sm tabular-nums ml-auto ${isSaving ? 'opacity-50' : ''} ${upsertMutation.isError ? 'border-destructive' : ''}`}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={saveValue}
          onKeyDown={handleKeyDown}
          aria-label={ariaLabel}
          inputMode="decimal"
          disabled={isSaving}
        />
      </TableCell>
    );
  }

  if (!entry) {
    return (
      <TableCell
        className="text-center text-muted-foreground cursor-pointer hover:bg-muted/50"
        onClick={startEditing}
        aria-label={ariaLabel}
      >
        <span className="text-sm">&mdash;</span>
      </TableCell>
    );
  }

  return (
    <TableCell
      className={`text-right tabular-nums text-sm cursor-pointer hover:bg-muted/50 ${isSaving ? 'opacity-50' : ''}`}
      onClick={startEditing}
      aria-label={ariaLabel}
    >
      {displayValue} EUR
    </TableCell>
  );
}

// ============================================================================
// Helper
// ============================================================================

/**
 * Format a decimal string to German locale (dot -> comma).
 */
function formatGermanDecimal(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toFixed(2).replace('.', ',');
}
