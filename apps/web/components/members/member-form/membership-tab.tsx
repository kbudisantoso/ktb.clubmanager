'use client';

import { useMemo } from 'react';
import { AlertTriangle, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MemberStatusBadge } from '@/components/members/member-status-badge';
import type { MemberDetail } from '@/hooks/use-member-detail';

// ============================================================================
// Constants
// ============================================================================

/** German labels for membership type */
const MEMBERSHIP_TYPE_LABELS: Record<string, string> = {
  ORDENTLICH: 'Ordentlich',
  PASSIV: 'Passiv',
  EHREN: 'Ehren',
  FOERDER: 'Foerder',
  JUGEND: 'Jugend',
};

// ============================================================================
// Types
// ============================================================================

interface MembershipTabProps {
  /** Full member data */
  member: MemberDetail;
  /** Club slug for API calls */
  slug: string;
  /** Called when "Status aendern" is clicked */
  onChangeStatus?: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Mitgliedschaft tab: Shows current member status, cancellation info, and
 * membership periods timeline.
 *
 * Status changes and period CRUD go through their own dialogs (not inline edit).
 * Edit mode shows an info message directing to the dialogs.
 */
export function MembershipTab({ member, slug: _slug, onChangeStatus }: MembershipTabProps) {
  const hasCancellation = !!member.cancellationDate;

  // Sort periods by joinDate descending (most recent first)
  const sortedPeriods = useMemo(() => {
    if (!member.membershipPeriods?.length) return [];
    return [...member.membershipPeriods].sort((a, b) => {
      const dateA = a.joinDate ?? '';
      const dateB = b.joinDate ?? '';
      return dateB.localeCompare(dateA);
    });
  }, [member.membershipPeriods]);

  return (
    <div className="space-y-6">
      {/* Current status */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Aktueller Status</h3>
        <div className="flex items-center gap-3">
          <MemberStatusBadge status={member.status} />
          {onChangeStatus && member.status !== 'LEFT' && (
            <Button type="button" variant="outline" size="sm" onClick={onChangeStatus}>
              Status aendern
            </Button>
          )}
        </div>

        {/* Status change info */}
        {member.statusChangedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Letzte Aenderung: {formatDate(member.statusChangedAt)}
            {member.statusChangeReason && ` - ${member.statusChangeReason}`}
          </p>
        )}
      </div>

      {/* Cancellation notice */}
      {hasCancellation && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400">
              Kuendigung zum {formatDate(member.cancellationDate!)}
            </p>
            {member.cancellationReceivedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Eingegangen am {formatDate(member.cancellationReceivedAt)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="border-t" />

      {/* Membership periods */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Mitgliedschaftszeitraeume</h3>
          <Button type="button" variant="outline" size="sm" disabled>
            Neue Mitgliedschaft
          </Button>
        </div>

        {sortedPeriods.length === 0 ? (
          <p className="text-sm text-muted-foreground/50">
            Keine Mitgliedschaftszeitraeume vorhanden
          </p>
        ) : (
          <div className="space-y-2">
            {sortedPeriods.map((period) => (
              <div
                key={period.id}
                className="flex items-center gap-3 rounded-md border p-3 text-sm"
              >
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {MEMBERSHIP_TYPE_LABELS[period.membershipType] ?? period.membershipType}
                    </span>
                    {!period.leaveDate && (
                      <span className="text-xs bg-success/15 text-success rounded px-1.5 py-0.5">
                        Aktiv
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {period.joinDate ? formatDate(period.joinDate) : 'Unbekannt'}
                    {' - '}
                    {period.leaveDate ? formatDate(period.leaveDate) : 'heute'}
                  </p>
                  {period.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{period.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info about editing */}
      <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Statusaenderungen und Mitgliedschaftszeitraeume werden ueber die jeweiligen Dialoge
          verwaltet.
        </p>
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
