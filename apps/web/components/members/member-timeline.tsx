'use client';

import { useMemo } from 'react';
import { Circle, Edit, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MembershipType } from '@/hooks/use-membership-types';

// ============================================================================
// Types
// ============================================================================

interface TimelinePeriod {
  id: string;
  joinDate: string | null;
  leaveDate: string | null;
  membershipTypeId?: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface MemberTimelineProps {
  /** Membership periods to display */
  periods: TimelinePeriod[];
  /** Available membership types for label lookup */
  membershipTypes?: MembershipType[];
  /** Called when "Neue Mitgliedschaft" button is clicked */
  onCreatePeriod?: () => void;
  /** Called when a period's edit button is clicked */
  onEditPeriod?: (period: TimelinePeriod) => void;
  /** Called when a period's close button is clicked */
  onClosePeriod?: (period: TimelinePeriod) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Visual vertical timeline of membership periods.
 * Built with Tailwind CSS only (no Framer Motion per RESEARCH.md).
 *
 * Current (open) period highlighted with accent color.
 * Past periods in muted style.
 * Each card shows date range, type badge, duration, and notes.
 */
export function MemberTimeline({
  periods,
  membershipTypes,
  onCreatePeriod,
  onEditPeriod,
  onClosePeriod,
}: MemberTimelineProps) {
  /** Resolve a membershipTypeId to a display name */
  const getTypeName = (typeId: string | null | undefined): string => {
    if (!typeId || !membershipTypes) return 'Unbekannt';
    const found = membershipTypes.find((t) => t.id === typeId);
    return found?.name ?? 'Unbekannt';
  };

  // Sort periods by joinDate descending (most recent first)
  const sortedPeriods = useMemo(() => {
    if (!periods.length) return [];
    return [...periods].sort((a, b) => {
      const dateA = a.joinDate ?? '';
      const dateB = b.joinDate ?? '';
      return dateB.localeCompare(dateA);
    });
  }, [periods]);

  // Empty state
  if (sortedPeriods.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Mitgliedschaftszeiträume</h3>
          {onCreatePeriod && (
            <Button type="button" variant="outline" size="sm" onClick={onCreatePeriod}>
              Neue Mitgliedschaft
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground/50 py-4 text-center">
          Keine Mitgliedschaftszeiträume vorhanden
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Mitgliedschaftszeiträume</h3>
        {onCreatePeriod && (
          <Button type="button" variant="outline" size="sm" onClick={onCreatePeriod}>
            Neue Mitgliedschaft
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-border" />

        {/* Period entries */}
        <div className="space-y-4">
          {sortedPeriods.map((period) => {
            const isActive = !period.leaveDate;
            const duration = calculateDuration(period.joinDate, period.leaveDate);

            return (
              <div key={period.id} className="relative flex gap-3">
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
                    isActive
                      ? 'border-primary/25 bg-primary/5'
                      : 'border-border bg-muted/20 opacity-75'
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
                        {isActive && (
                          <span className="text-xs text-success font-medium">Aktiv</span>
                        )}
                      </div>

                      {/* Date range */}
                      <p className="text-sm text-foreground">
                        {period.joinDate ? formatDate(period.joinDate) : 'Unbekannt'}
                        {' - '}
                        {period.leaveDate ? formatDate(period.leaveDate) : 'heute'}
                      </p>

                      {/* Duration */}
                      {duration && (
                        <p className="text-xs text-muted-foreground mt-0.5">{duration}</p>
                      )}

                      {/* Notes */}
                      {period.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {period.notes}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {onEditPeriod && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEditPeriod(period)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                      )}
                      {isActive && onClosePeriod && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onClosePeriod(period)}
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
          })}
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
 * Calculate duration between two dates as "X Jahre, Y Monate".
 */
function calculateDuration(joinDate: string | null, leaveDate: string | null): string | null {
  if (!joinDate) return null;

  const start = new Date(joinDate + 'T00:00:00');
  const end = leaveDate ? new Date(leaveDate + 'T00:00:00') : new Date();

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'Jahr' : 'Jahre'}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'Monat' : 'Monate'}`);
  }

  if (parts.length === 0) {
    // Less than a month
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} ${days === 1 ? 'Tag' : 'Tage'}`;
  }

  return parts.join(', ');
}

export type { TimelinePeriod, MemberTimelineProps };
