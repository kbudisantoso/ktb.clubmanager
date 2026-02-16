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
  /** The new period created during this transition */
  linkedPeriod?: TimelinePeriod;
  /** The period that was closed during this transition (for old→new display) */
  previousPeriod?: TimelinePeriod;
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

  // Merge and sort all entries by date descending.
  // When a status transition created a new period (same effectiveDate = joinDate),
  // the period is linked to the transition and not shown separately.
  const mergedEntries = useMemo(() => {
    const entries: UnifiedEntry[] = [];

    // Link each transition to its corresponding new + previous period
    const linkedPeriodIds = new Set<string>();
    const transitionPeriods = new Map<string, TimelinePeriod>();
    const closedPeriods = new Map<string, TimelinePeriod>();

    if (statusHistory) {
      for (const entry of statusHistory) {
        const linked = periods.find((p) => p.joinDate === entry.effectiveDate);
        if (linked) {
          transitionPeriods.set(entry.id, linked);
          linkedPeriodIds.add(linked.id);
        }
        // Find the period that was closed at this transition's date
        const previous = periods.find(
          (p) => p.leaveDate === entry.effectiveDate && p.id !== linked?.id
        );
        if (previous) {
          closedPeriods.set(entry.id, previous);
        }
      }
    }

    for (const period of periods) {
      // Skip periods that are linked to a transition
      if (linkedPeriodIds.has(period.id)) continue;

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
          linkedPeriod: transitionPeriods.get(entry.id),
          previousPeriod: closedPeriods.get(entry.id),
        });
      }
    }

    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [periods, statusHistory]);

  const activePeriod = periods.find((p) => !p.leaveDate);
  const hasActivePeriod = !!activePeriod;
  const showNoPeriodBanner = memberStatus === 'ACTIVE' && !hasActivePeriod;

  // Virtual "today" card: shown when the newest entry is not from today
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const showTodayCard = mergedEntries.length > 0 && mergedEntries[0].date !== today;

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
        <h3 className="text-sm font-medium text-muted-foreground">Verlauf</h3>
        <p className="text-sm text-muted-foreground/50 py-4 text-center">
          Keine Eintraege vorhanden
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <h3 className="text-sm font-medium text-muted-foreground">Verlauf</h3>

      {/* R3: Active member without period banner (informational only) */}
      {showNoPeriodBanner && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Dieses Mitglied ist aktiv, hat aber noch keine Mitgliedschaft zugewiesen.
          </p>
        </div>
      )}

      {/* Timeline */}
      {mergedEntries.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-2.75 top-3 bottom-3 w-0.5 bg-border" />

          <div className="space-y-0">
            {/* Virtual "today" card — current state summary */}
            {showTodayCard && (
              <>
                <TodayCard
                  memberStatus={memberStatus}
                  typeName={activePeriod ? getTypeName(activePeriod.membershipTypeId) : null}
                />
                <DurationSeparator duration={calculateDuration(mergedEntries[0].date, null)} />
              </>
            )}

            {/* Actual entries with duration separators between them */}
            {mergedEntries.map((entry, i) => (
              <div key={entry.id}>
                {entry.type === 'period' && entry.period ? (
                  <PeriodEntry
                    period={entry.period}
                    isCurrent={!showTodayCard && i === 0}
                    getTypeName={getTypeName}
                    onEdit={onEditPeriod}
                    onClose={onClosePeriod}
                  />
                ) : entry.type === 'status' && entry.statusEntry ? (
                  <StatusEntry
                    entry={entry.statusEntry}
                    isCurrent={!showTodayCard && i === 0}
                    linkedPeriod={entry.linkedPeriod}
                    previousPeriod={entry.previousPeriod}
                    getTypeName={getTypeName}
                    onEdit={onEditStatusEntry}
                    onDelete={onDeleteStatusEntry}
                  />
                ) : null}

                {/* Duration separator between this and the next (older) entry */}
                {i < mergedEntries.length - 1 && (
                  <DurationSeparator
                    duration={calculateDuration(mergedEntries[i + 1].date, entry.date)}
                  />
                )}
              </div>
            ))}
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
  isCurrent: boolean;
  getTypeName: (typeId: string | null | undefined) => string;
  onEdit?: (period: TimelinePeriod) => void;
  onClose?: (period: TimelinePeriod) => void;
}

function PeriodEntry({ period, isCurrent, getTypeName, onEdit, onClose }: PeriodEntryProps) {
  const isActive = !period.leaveDate;

  return (
    <div className="relative flex gap-3">
      {/* Timeline dot — opaque bg covers the line */}
      <div className="relative z-10 flex items-start pt-1">
        <div className="rounded-full bg-background">
          <Circle
            className={cn(
              'h-6 w-6 shrink-0',
              isCurrent
                ? 'fill-primary text-primary'
                : 'fill-muted-foreground/30 text-muted-foreground/30'
            )}
          />
        </div>
      </div>

      {/* Period card */}
      <div
        className={cn(
          'flex-1 rounded-md border p-3 text-sm',
          isCurrent ? 'border-primary/25 bg-primary/5' : 'border-border bg-muted/20'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Date — start date only, end date is implicit from next entry */}
            <p className="text-xs text-muted-foreground mb-1.5">
              {period.joinDate ? formatDate(period.joinDate) : 'Unbekannt'}
            </p>

            {/* Type badge + active indicator */}
            <div className="flex items-center gap-2 mb-1.5">
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

            {/* Notes */}
            {period.notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{period.notes}</p>
            )}

            {/* Recorded timestamp */}
            {period.createdAt && (
              <p className="text-xs text-muted-foreground/60 mt-1.5">
                Erfasst: {formatDateTime(period.createdAt)}
              </p>
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
  isCurrent: boolean;
  /** The new period created during this transition */
  linkedPeriod?: TimelinePeriod;
  /** The period that was closed during this transition */
  previousPeriod?: TimelinePeriod;
  getTypeName: (typeId: string | null | undefined) => string;
  onEdit?: (entry: StatusHistoryEntry) => void;
  onDelete?: (entry: StatusHistoryEntry) => void;
}

function StatusEntry({
  entry,
  isCurrent,
  linkedPeriod,
  previousPeriod,
  getTypeName,
  onEdit,
  onDelete,
}: StatusEntryProps) {
  const isSelfTransition = entry.fromStatus === entry.toStatus;
  const hasTypeChange =
    previousPeriod &&
    linkedPeriod &&
    previousPeriod.membershipTypeId !== linkedPeriod.membershipTypeId;
  const typeBadgeClass =
    'inline-flex items-center rounded-md border bg-muted px-2 py-0.5 text-xs font-medium text-foreground border-border';

  return (
    <div className="relative flex gap-3">
      {/* Timeline dot — opaque bg covers the line */}
      <div className="relative z-10 flex items-start pt-1">
        <div className="rounded-full bg-background">
          <Circle
            className={cn(
              'h-6 w-6 shrink-0',
              isCurrent
                ? 'fill-primary text-primary'
                : 'fill-muted-foreground/30 text-muted-foreground/30'
            )}
          />
        </div>
      </div>

      {/* Status card */}
      <div
        className={cn(
          'flex-1 rounded-md border p-3 text-sm',
          isCurrent ? 'border-primary/25 bg-primary/5' : 'border-border bg-muted/20'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Date */}
            <p className="text-xs text-muted-foreground mb-1.5">
              {formatDate(entry.effectiveDate)}
            </p>

            {/* Change visualization — consistent arrow pattern */}
            <div className="space-y-1.5 mb-1.5">
              {/* Status change row (skip for self-transitions) */}
              {!isSelfTransition && (
                <div className="flex items-center gap-2 flex-wrap">
                  <MemberStatusBadge status={entry.fromStatus} />
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <MemberStatusBadge status={entry.toStatus} />
                </div>
              )}

              {/* Type change row: old → new (shown when types differ) */}
              {hasTypeChange && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={typeBadgeClass}>
                    {getTypeName(previousPeriod?.membershipTypeId)}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className={typeBadgeClass}>
                    {getTypeName(linkedPeriod?.membershipTypeId)}
                  </span>
                </div>
              )}

              {/* Type badge only (no change, just assigned) */}
              {!hasTypeChange && linkedPeriod && !isSelfTransition && (
                <div className="flex items-center gap-2">
                  <span className={typeBadgeClass}>
                    {getTypeName(linkedPeriod.membershipTypeId)}
                  </span>
                </div>
              )}
            </div>

            {/* Reason */}
            <p className="text-sm text-foreground">{entry.reason}</p>

            {/* Left category label if present */}
            {entry.leftCategory && (
              <p className="text-xs text-muted-foreground mt-1">
                {LEFT_CATEGORY_LABELS[entry.leftCategory] ?? entry.leftCategory}
              </p>
            )}

            {/* Recorded timestamp */}
            <p className="text-xs text-muted-foreground/60 mt-1.5">
              Erfasst: {formatDateTime(entry.createdAt)}
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

// ----------------------------------------------------------------------------
// Today card — virtual "current state" summary at top of timeline
// ----------------------------------------------------------------------------

interface TodayCardProps {
  memberStatus: string;
  typeName: string | null;
}

function TodayCard({ memberStatus, typeName }: TodayCardProps) {
  return (
    <div className="relative flex gap-3">
      <div className="relative z-10 flex items-start pt-1">
        <div className="rounded-full bg-background">
          <Circle className="h-6 w-6 shrink-0 fill-primary text-primary" />
        </div>
      </div>
      <div className="flex-1 rounded-md border border-primary/25 bg-primary/5 p-3 text-sm">
        <p className="text-xs text-muted-foreground mb-1.5">Heute</p>
        <div className="flex items-center gap-2 flex-wrap">
          <MemberStatusBadge status={memberStatus} />
          {typeName && (
            <span className="inline-flex items-center rounded-md border bg-muted px-2 py-0.5 text-xs font-medium text-foreground border-border">
              {typeName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Duration separator — small label between timeline entries
// ----------------------------------------------------------------------------

interface DurationSeparatorProps {
  duration: string | null;
}

function DurationSeparator({ duration }: DurationSeparatorProps) {
  if (!duration) return null;

  return (
    <div className="relative py-1.5">
      <span className="relative z-10 text-[10px] text-muted-foreground/60 bg-background px-0.5 whitespace-nowrap">
        {duration}
      </span>
    </div>
  );
}
