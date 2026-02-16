'use client';

import { useMemo } from 'react';
import { ArrowRight, AlertTriangle, Circle, Edit, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime, calculateDuration } from '@/lib/format-date';
import { LEFT_CATEGORY_LABELS } from '@/lib/member-status-labels';
import { MemberStatusBadge } from './member-status-badge';
import type { MembershipType } from '@/hooks/use-membership-types';
import type { StatusHistoryEntry } from '@/hooks/use-members';

// ============================================================================
// Types
// ============================================================================

export interface TimelinePeriod {
  id: string;
  joinDate: string | null;
  leaveDate: string | null;
  membershipTypeId?: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UnifiedEntry {
  id: string;
  type: 'period' | 'status';
  date: string;
  period?: TimelinePeriod;
  statusEntry?: StatusHistoryEntry;
}

interface MemberUnifiedTimelineProps {
  /** Membership periods */
  periods: TimelinePeriod[];
  /** Status history entries */
  statusHistory: StatusHistoryEntry[] | undefined;
  /** Whether status history is loading */
  statusHistoryLoading: boolean;
  /** Available membership types for label lookup */
  membershipTypes?: MembershipType[];
  /** Current member status (for R3 banner) */
  memberStatus: string;
  /** Called when "Neue Mitgliedschaft" button is clicked */
  onCreatePeriod?: () => void;
  /** Called when a period's edit button is clicked */
  onEditPeriod?: (period: TimelinePeriod) => void;
  /** Called when a period's close button is clicked */
  onClosePeriod?: (period: TimelinePeriod) => void;
  /** Called when a status entry's edit button is clicked */
  onEditStatusEntry?: (entry: StatusHistoryEntry) => void;
  /** Called when a status entry's delete button is clicked */
  onDeleteStatusEntry?: (entry: StatusHistoryEntry) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Unified chronological timeline merging membership periods and status transitions.
 * Replaces the previous separate MemberTimeline + MemberStatusTimeline components.
 *
 * - Period entries: type badge, date range, duration, notes, edit/close buttons
 * - Status entries: from→to status badges, reason, left category
 * - R3: Amber banner when ACTIVE member has no active period
 */
export function MemberUnifiedTimeline({
  periods,
  statusHistory,
  statusHistoryLoading,
  membershipTypes,
  memberStatus,
  onCreatePeriod,
  onEditPeriod,
  onClosePeriod,
  onEditStatusEntry,
  onDeleteStatusEntry,
}: MemberUnifiedTimelineProps) {
  /** Resolve a membershipTypeId to a display name */
  const getTypeName = (typeId: string | null | undefined): string => {
    if (!typeId || !membershipTypes) return 'Unbekannt';
    const found = membershipTypes.find((t) => t.id === typeId);
    return found?.name ?? 'Unbekannt';
  };

  // Merge and sort all entries by date descending
  const mergedEntries = useMemo(() => {
    const entries: UnifiedEntry[] = [];

    for (const period of periods) {
      entries.push({
        id: `period-${period.id}`,
        type: 'period',
        date: period.joinDate ?? period.createdAt ?? '',
        period,
      });
    }

    if (statusHistory) {
      for (const entry of statusHistory) {
        entries.push({
          id: `status-${entry.id}`,
          type: 'status',
          date: entry.effectiveDate,
          statusEntry: entry,
        });
      }
    }

    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [periods, statusHistory]);

  const hasActivePeriod = periods.some((p) => !p.leaveDate);
  const showNoPeriodBanner = memberStatus === 'ACTIVE' && !hasActivePeriod;

  // Loading state
  if (statusHistoryLoading && periods.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Verlauf</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (mergedEntries.length === 0 && !showNoPeriodBanner) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Verlauf</h3>
          {onCreatePeriod && (
            <Button type="button" variant="outline" size="sm" onClick={onCreatePeriod}>
              Neue Mitgliedschaft
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground/50 py-4 text-center">
          Keine Eintraege vorhanden
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Verlauf</h3>
        {onCreatePeriod && (
          <Button type="button" variant="outline" size="sm" onClick={onCreatePeriod}>
            Neue Mitgliedschaft
          </Button>
        )}
      </div>

      {/* R3: Active member without period banner */}
      {showNoPeriodBanner && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="text-amber-600 dark:text-amber-400">
              Dieses Mitglied ist aktiv, hat aber noch keine Mitgliedschaft zugewiesen.
            </p>
            {onCreatePeriod && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={onCreatePeriod}
              >
                Mitgliedschaft erstellen
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      {mergedEntries.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-border" />

          {/* Entries */}
          <div className="space-y-4">
            {mergedEntries.map((entry) =>
              entry.type === 'period' && entry.period ? (
                <PeriodEntry
                  key={entry.id}
                  period={entry.period}
                  getTypeName={getTypeName}
                  onEdit={onEditPeriod}
                  onClose={onClosePeriod}
                />
              ) : entry.type === 'status' && entry.statusEntry ? (
                <StatusEntry
                  key={entry.id}
                  entry={entry.statusEntry}
                  onEdit={onEditStatusEntry}
                  onDelete={onDeleteStatusEntry}
                />
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface PeriodEntryProps {
  period: TimelinePeriod;
  getTypeName: (typeId: string | null | undefined) => string;
  onEdit?: (period: TimelinePeriod) => void;
  onClose?: (period: TimelinePeriod) => void;
}

function PeriodEntry({ period, getTypeName, onEdit, onClose }: PeriodEntryProps) {
  const isActive = !period.leaveDate;
  const duration = calculateDuration(period.joinDate, period.leaveDate);

  return (
    <div className="relative flex gap-3">
      {/* Timeline dot */}
      <div className="relative z-10 flex items-start pt-1">
        <Circle
          className={cn(
            'h-6 w-6 shrink-0',
            isActive
              ? 'fill-primary text-primary'
              : 'fill-muted-foreground/30 text-muted-foreground/30'
          )}
        />
      </div>

      {/* Period card */}
      <div
        className={cn(
          'flex-1 rounded-md border p-3 text-sm',
          isActive ? 'border-primary/25 bg-primary/5' : 'border-border bg-muted/20 opacity-75'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Type badge + active indicator */}
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                  isActive
                    ? 'bg-success/15 text-success border-success/25'
                    : 'bg-muted text-muted-foreground border-border'
                )}
              >
                {getTypeName(period.membershipTypeId)}
              </span>
              {isActive && <span className="text-xs text-success font-medium">Aktiv</span>}
            </div>

            {/* Date range */}
            <p className="text-sm text-foreground">
              {period.joinDate ? formatDate(period.joinDate) : 'Unbekannt'}
              {' - '}
              {period.leaveDate ? formatDate(period.leaveDate) : 'heute'}
            </p>

            {/* Duration */}
            {duration && <p className="text-xs text-muted-foreground mt-0.5">{duration}</p>}

            {/* Notes */}
            {period.notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{period.notes}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(period)}
              >
                <Edit className="h-3.5 w-3.5" />
                <span className="sr-only">Bearbeiten</span>
              </Button>
            )}
            {isActive && onClose && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onClose(period)}
              >
                <XCircle className="h-3.5 w-3.5" />
                <span className="sr-only">Beenden</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatusEntryProps {
  entry: StatusHistoryEntry;
  onEdit?: (entry: StatusHistoryEntry) => void;
  onDelete?: (entry: StatusHistoryEntry) => void;
}

function StatusEntry({ entry, onEdit, onDelete }: StatusEntryProps) {
  return (
    <div className="relative flex gap-3">
      {/* Timeline dot */}
      <div className="relative z-10 flex items-start pt-1">
        <Circle className="h-6 w-6 shrink-0 fill-muted-foreground/30 text-muted-foreground/30" />
      </div>

      {/* Status card */}
      <div className="flex-1 rounded-md border border-border bg-muted/20 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Date */}
            <p className="text-xs text-muted-foreground mb-1.5">
              {formatDate(entry.effectiveDate)}
            </p>

            {/* Status transition: fromStatus -> toStatus */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <MemberStatusBadge status={entry.fromStatus} />
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <MemberStatusBadge status={entry.toStatus} />
            </div>

            {/* Reason */}
            <p className="text-sm text-foreground">{entry.reason}</p>

            {/* Left category label if present */}
            {entry.leftCategory && (
              <p className="text-xs text-muted-foreground mt-1">
                {LEFT_CATEGORY_LABELS[entry.leftCategory] ?? entry.leftCategory}
              </p>
            )}

            {/* CreatedAt timestamp */}
            <p className="text-xs text-muted-foreground/60 mt-1.5">
              Erstellt: {formatDateTime(entry.createdAt)}
            </p>
          </div>

          {/* Action buttons */}
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 shrink-0">
              {onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(entry)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span className="sr-only">Bearbeiten</span>
                </Button>
              )}
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(entry)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Loeschen</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
