'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { MemberStatus, NamedTransition } from '@ktb/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MemberStatusBadge } from '@/components/members/member-status-badge';
import { MemberStatusActions } from '@/components/members/member-status-actions';
import { StatusTransitionDialog } from '@/components/members/status-transition-dialog';
import { MemberUnifiedTimeline } from '@/components/members/member-unified-timeline';
import type { TimelinePeriod } from '@/components/members/member-unified-timeline';
import { MembershipPeriodDialog } from '@/components/members/membership-period-dialog';
import type { DialogMode } from '@/components/members/membership-period-dialog';
import { useMemberPeriods } from '@/hooks/use-membership-periods';
import { useMembershipTypes } from '@/hooks/use-membership-types';
import { useMemberStatusHistory, useChangeStatus } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format-date';
import type { MemberDetail } from '@/hooks/use-member-detail';

// ============================================================================
// Types
// ============================================================================

interface MembershipTabProps {
  /** Full member data */
  member: MemberDetail;
  /** Club slug for API calls */
  slug: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Mitgliedschaft tab: Shows inline status summary, cancellation info,
 * and a unified timeline merging membership periods + status transitions.
 *
 * Includes R2 workflow: after creating a period for a PENDING member,
 * prompts to activate the member.
 */
export function MembershipTab({ member, slug }: MembershipTabProps) {
  const params = useParams<{ slug: string }>();
  const clubSlug = params.slug;
  const { toast } = useToast();
  const hasCancellation = !!member.cancellationDate;

  // Fetch periods via hook (includes real-time updates)
  const { data: periods } = useMemberPeriods(slug, member.id);
  const displayPeriods = periods ?? member.membershipPeriods ?? [];

  // Fetch membership types for label resolution
  const { data: membershipTypes } = useMembershipTypes(clubSlug);

  // Fetch status history for the timeline
  const { data: statusHistory, isLoading: statusHistoryLoading } = useMemberStatusHistory(
    slug,
    member.id
  );

  // Change status mutation (for R2 activation workflow)
  const changeStatus = useChangeStatus(slug);

  // Period dialog state
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [periodDialogMode, setPeriodDialogMode] = useState<DialogMode>('create');
  const [selectedPeriod, setSelectedPeriod] = useState<TimelinePeriod | null>(null);

  // R2: Activation prompt state
  const [activationPromptOpen, setActivationPromptOpen] = useState(false);

  // Status transition dialog state (Variante C)
  const [transitionDialogOpen, setTransitionDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<MemberStatus | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<NamedTransition | null>(null);

  // Derive active membership type name for the top section
  const activeTypeName = useMemo(() => {
    const activePeriod = displayPeriods.find((p) => !p.leaveDate);
    if (!activePeriod?.membershipTypeId || !membershipTypes) return null;
    const type = membershipTypes.find((t) => t.id === activePeriod.membershipTypeId);
    return type?.name ?? null;
  }, [displayPeriods, membershipTypes]);

  // Derive entry date from active period
  const activeJoinDate = useMemo(() => {
    const activePeriod = displayPeriods.find((p) => !p.leaveDate);
    return activePeriod?.joinDate ?? null;
  }, [displayPeriods]);

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

  // R2: After period dialog succeeds, check if we should prompt activation
  const handlePeriodSuccess = useCallback(
    (mode: DialogMode) => {
      if (mode === 'create' && member.status === 'PENDING') {
        setActivationPromptOpen(true);
      }
    },
    [member.status]
  );

  // R2: Handle activation confirm
  const handleActivateMember = useCallback(async () => {
    try {
      await changeStatus.mutateAsync({
        id: member.id,
        newStatus: 'ACTIVE',
        reason: 'Mitgliedschaft zugewiesen',
      });
      toast({ title: 'Status auf Aktiv gesetzt' });
    } catch {
      toast({
        title: 'Fehler beim Aktivieren',
        description: 'Der Status konnte nicht geaendert werden.',
        variant: 'destructive',
      });
    }
    setActivationPromptOpen(false);
  }, [changeStatus, member.id, toast]);

  // Handle transition selection from MemberStatusActions
  const handleTransition = useCallback(
    (targetStatus: MemberStatus, namedTransition: NamedTransition) => {
      setSelectedTarget(targetStatus);
      setSelectedTransition(namedTransition);
      setTransitionDialogOpen(true);
    },
    []
  );

  return (
    <>
      <div className="space-y-6">
        {/* R4: Inline status summary */}
        <div className="flex items-center gap-3 flex-wrap">
          <MemberStatusBadge status={member.status} />
          {activeTypeName && (
            <span className="text-sm text-muted-foreground">{activeTypeName}</span>
          )}
          {activeJoinDate && (
            <span className="text-sm text-muted-foreground">seit {formatDate(activeJoinDate)}</span>
          )}
          <MemberStatusActions member={member} onTransition={handleTransition} />
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

        {/* R1: Unified timeline */}
        <MemberUnifiedTimeline
          periods={displayPeriods}
          statusHistory={statusHistory}
          statusHistoryLoading={statusHistoryLoading}
          membershipTypes={membershipTypes}
          memberStatus={member.status}
          onCreatePeriod={handleCreatePeriod}
          onEditPeriod={handleEditPeriod}
          onClosePeriod={handleClosePeriod}
        />
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
        onSuccess={handlePeriodSuccess}
      />

      {/* R2: Activation prompt */}
      <AlertDialog open={activationPromptOpen} onOpenChange={setActivationPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitglied aktivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Mitgliedschaft wurde zugewiesen. Soll der Status auf &quot;Aktiv&quot; gesetzt
              werden?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nein, Status beibehalten</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivateMember} disabled={changeStatus.isPending}>
              {changeStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ja, aktivieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status transition dialog (Variante C) */}
      {selectedTarget && selectedTransition && (
        <StatusTransitionDialog
          member={member}
          targetStatus={selectedTarget}
          namedTransition={selectedTransition}
          open={transitionDialogOpen}
          onOpenChange={setTransitionDialogOpen}
        />
      )}
    </>
  );
}
