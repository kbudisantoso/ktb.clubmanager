'use client';

import { useMemo } from 'react';
import { ArrowRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberStatusBadge } from './member-status-badge';
import type { StatusHistoryEntry } from '@/hooks/use-members';

// ============================================================================
// Constants
// ============================================================================

/** German labels for left categories */
const LEFT_CATEGORY_LABELS: Record<string, string> = {
  VOLUNTARY: 'Freiwilliger Austritt',
  EXCLUSION: 'Ausschluss',
  DEATH: 'Tod',
  OTHER: 'Sonstiges',
};

// ============================================================================
// Types
// ============================================================================

interface MemberStatusTimelineProps {
  /** Status history entries to display */
  entries: StatusHistoryEntry[] | undefined;
  /** Whether the data is loading */
  isLoading: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Vertical timeline showing chronological status transitions.
 * Most recent first. Shows status badges, reason, and dates.
 */
export function MemberStatusTimeline({ entries, isLoading }: MemberStatusTimelineProps) {
  // Sort entries by effectiveDate descending (most recent first)
  const sortedEntries = useMemo(() => {
    if (!entries?.length) return [];
    return [...entries].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  }, [entries]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Statusverlauf</h3>
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
  if (sortedEntries.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Statusverlauf</h3>
        <p className="text-sm text-muted-foreground/50 py-4 text-center">
          Keine Statusaenderungen vorhanden
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Statusverlauf</h3>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-border" />

        {/* Entries */}
        <div className="space-y-4">
          {sortedEntries.map((entry) => (
            <div key={entry.id} className="relative flex gap-3">
              {/* Timeline dot */}
              <div className="relative z-10 flex items-start pt-1">
                <Circle
                  className={cn(
                    'h-6 w-6 shrink-0',
                    'fill-muted-foreground/30 text-muted-foreground/30'
                  )}
                />
              </div>

              {/* Entry card */}
              <div className="flex-1 rounded-md border border-border bg-muted/20 p-3 text-sm">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format an ISO date string to German DD.MM.YYYY format.
 */
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('T')[0].split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

/**
 * Format an ISO datetime string to German DD.MM.YYYY HH:mm format.
 */
function formatDateTime(isoDate: string): string {
  const datePart = formatDate(isoDate);
  const timePart = isoDate.split('T')[1];
  if (!timePart) return datePart;
  const [hours, minutes] = timePart.split(':');
  if (!hours || !minutes) return datePart;
  return `${datePart} ${hours}:${minutes}`;
}

export type { MemberStatusTimelineProps };
