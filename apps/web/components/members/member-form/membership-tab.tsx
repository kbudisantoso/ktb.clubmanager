'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MemberStatusBadge } from '@/components/members/member-status-badge';
import { MemberTimeline } from '@/components/members/member-timeline';
import { MembershipPeriodDialog } from '@/components/members/membership-period-dialog';
import type { TimelinePeriod } from '@/components/members/member-timeline';
import type { DialogMode } from '@/components/members/membership-period-dialog';
import { useMemberPeriods } from '@/hooks/use-membership-periods';
import type { MemberDetail } from '@/hooks/use-member-detail';

// ============================================================================
// Types
// ============================================================================

interface MembershipTabProps {
  /** Full member data */
  member: MemberDetail;
  /** Club slug for API calls */
  slug: string;
  /** Called when "Status ändern" is clicked */
  onChangeStatus?: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Mitgliedschaft tab: Shows current member status, cancellation info, and
 * membership periods timeline with full CRUD.
 *
 * Status changes and period CRUD go through their own dialogs (not inline edit).
 */
export function MembershipTab({ member, slug, onChangeStatus }: MembershipTabProps) {
  const hasCancellation = !!member.cancellationDate;

  // Fetch periods via hook (includes real-time updates)
  const { data: periods } = useMemberPeriods(slug, member.id);
  const displayPeriods = periods ?? member.membershipPeriods ?? [];

  // Period dialog state
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [periodDialogMode, setPeriodDialogMode] = useState<DialogMode>('create');
  const [selectedPeriod, setSelectedPeriod] = useState<TimelinePeriod | null>(null);

  const handleCreatePeriod = useCallback(() => {
    setSelectedPeriod(null);
    setPeriodDialogMode('create');
    setPeriodDialogOpen(true);
  }, []);

  const handleEditPeriod = useCallback((period: TimelinePeriod) => {
    setSelectedPeriod(period);
    setPeriodDialogMode('edit');
    setPeriodDialogOpen(true);
  }, []);

  const handleClosePeriod = useCallback((period: TimelinePeriod) => {
    setSelectedPeriod(period);
    setPeriodDialogMode('close');
    setPeriodDialogOpen(true);
  }, []);

  return (
    <>
      <div className="space-y-6">
        {/* Current status */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Aktueller Status</h3>
          <div className="flex items-center gap-3">
            <MemberStatusBadge status={member.status} />
            {onChangeStatus && member.status !== 'LEFT' && (
              <Button type="button" variant="outline" size="sm" onClick={onChangeStatus}>
                Status ändern
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

        {/* Membership timeline */}
        <MemberTimeline
          periods={displayPeriods}
          onCreatePeriod={handleCreatePeriod}
          onEditPeriod={handleEditPeriod}
          onClosePeriod={handleClosePeriod}
        />

        {/* Info about editing */}
        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Statusänderungen und Mitgliedschaftszeiträume werden über die jeweiligen Dialoge
            verwaltet.
          </p>
        </div>
      </div>

      {/* Period CRUD dialog */}
      <MembershipPeriodDialog
        open={periodDialogOpen}
        onOpenChange={setPeriodDialogOpen}
        slug={slug}
        memberId={member.id}
        mode={periodDialogMode}
        period={selectedPeriod}
        existingPeriods={displayPeriods}
      />
    </>
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
