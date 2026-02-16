'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { MemberStatusBadge } from '@/components/members/member-status-badge';
import { MemberStatusActions } from '@/components/members/member-status-actions';
import { StatusTransitionDialog } from '@/components/members/status-transition-dialog';
import { CancellationDialog } from '@/components/members/cancellation-dialog';
import { StatusHistoryEditDialog } from '@/components/members/status-history-edit-dialog';
import { MemberAnonymizeDialog } from '@/components/members/member-anonymize-dialog';
import { MemberUnifiedTimeline } from '@/components/members/member-unified-timeline';
import type { TimelinePeriod } from '@/components/members/member-unified-timeline';
import { MembershipPeriodDialog } from '@/components/members/membership-period-dialog';
import type { DialogMode } from '@/components/members/membership-period-dialog';
import { useMemberPeriods } from '@/hooks/use-membership-periods';
import { useMembershipTypes } from '@/hooks/use-membership-types';
import { useMemberStatusHistory, useDeleteStatusHistory } from '@/hooks/use-members';
import type { StatusHistoryEntry } from '@/hooks/use-members';
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

  // Period dialog state
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [periodDialogMode, setPeriodDialogMode] = useState<DialogMode>('edit');
  const [selectedPeriod, setSelectedPeriod] = useState<TimelinePeriod | null>(null);

  // Status transition dialog state (Variante C)
  const [transitionDialogOpen, setTransitionDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<MemberStatus | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<NamedTransition | null>(null);

  // Cancellation dialog state
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);

  // Status history edit/delete state
  const [editingStatusEntry, setEditingStatusEntry] = useState<StatusHistoryEntry | null>(null);
  const [deletingStatusEntry, setDeletingStatusEntry] = useState<StatusHistoryEntry | null>(null);
  const deleteStatusHistory = useDeleteStatusHistory(slug, member.id);

  // Anonymization dialog state (DSGVO reminder)
  const [anonymizeDialogOpen, setAnonymizeDialogOpen] = useState(false);

  // Derive active membership type name for the top section
  const activeTypeName = useMemo(() => {
    const activePeriod = displayPeriods.find((p) => !p.leaveDate);
    if (!activePeriod?.membershipTypeId || !membershipTypes) return null;
    const type = membershipTypes.find((t) => t.id === activePeriod.membershipTypeId);
    return type?.name ?? null;
  }, [displayPeriods, membershipTypes]);

  // Derive "seit" date from the last status transition into current status
  const activeSinceDate = useMemo(() => {
    if (statusHistory?.length) {
      const entry = statusHistory.find(
        (t) => t.toStatus === member.status && t.fromStatus !== t.toStatus
      );
      if (entry) return entry.effectiveDate;
    }
    // Fallback for migrated data: active period joinDate
    const activePeriod = displayPeriods.find((p) => !p.leaveDate);
    return activePeriod?.joinDate ?? null;
  }, [statusHistory, member.status, displayPeriods]);

  // DSGVO anonymization reminder: show 30 days after exit for LEFT members
  const anonymizationReminder = useMemo(() => {
    if (member.status !== 'LEFT' || member.anonymizedAt) return null;

    // Find exit date from status history (most recent →LEFT transition)
    let exitDate: string | null = null;
    if (statusHistory?.length) {
      const leftEntry = [...statusHistory].reverse().find((t) => t.toStatus === 'LEFT');
      if (leftEntry) exitDate = leftEntry.effectiveDate;
    }
    // Fallback: cancellation date
    if (!exitDate) exitDate = member.cancellationDate;
    if (!exitDate) return null;

    const exit = new Date(exitDate);
    const threshold = new Date(exit);
    threshold.setDate(threshold.getDate() + 30);

    if (new Date() < threshold) return null;

    return exitDate;
  }, [member.status, member.anonymizedAt, member.cancellationDate, statusHistory]);

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

  // Handle transition selection from MemberStatusActions
  const handleTransition = useCallback(
    (targetStatus: MemberStatus, namedTransition: NamedTransition) => {
      setSelectedTarget(targetStatus);
      setSelectedTransition(namedTransition);
      setTransitionDialogOpen(true);
    },
    []
  );

  // Handle cancellation recording
  const handleRecordCancellation = useCallback(() => {
    setCancellationDialogOpen(true);
  }, []);

  // Handle status history edit
  const handleEditStatusEntry = useCallback((entry: StatusHistoryEntry) => {
    setEditingStatusEntry(entry);
  }, []);

  // Handle status history delete (shows confirmation)
  const handleDeleteStatusEntry = useCallback((entry: StatusHistoryEntry) => {
    setDeletingStatusEntry(entry);
  }, []);

  // Confirm delete
  const handleConfirmDeleteStatusEntry = useCallback(async () => {
    if (!deletingStatusEntry) return;
    try {
      await deleteStatusHistory.mutateAsync(deletingStatusEntry.id);
      toast({ title: 'Eintrag geloescht' });
    } catch {
      toast({
        title: 'Fehler beim Loeschen',
        description: 'Der Eintrag konnte nicht geloescht werden.',
        variant: 'destructive',
      });
    }
    setDeletingStatusEntry(null);
  }, [deletingStatusEntry, deleteStatusHistory, toast]);

  return (
    <>
      <div className="space-y-6">
        {/* R4: Inline status summary */}
        <div className="flex items-center gap-3 flex-wrap">
          <MemberStatusBadge status={member.status} />
          {activeTypeName && (
            <span className="text-sm text-muted-foreground">{activeTypeName}</span>
          )}
          {activeSinceDate && (
            <span className="text-sm text-muted-foreground">
              seit {formatDate(activeSinceDate)}
            </span>
          )}
          <div className="ml-auto">
            <MemberStatusActions
              member={member}
              onTransition={handleTransition}
              onRecordCancellation={handleRecordCancellation}
            />
          </div>
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

        {/* DSGVO anonymization reminder */}
        {anonymizationReminder && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 p-3">
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-destructive">
                Personenbezogene Daten muessen geloescht werden
              </p>
              <p className="text-muted-foreground mt-0.5">
                Dieses Mitglied ist seit {formatDate(anonymizationReminder)} ausgetreten.
                Personenbezogene Daten sollten gemaess DSGVO geloescht werden.
              </p>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mt-2"
                onClick={() => setAnonymizeDialogOpen(true)}
              >
                Daten loeschen
              </Button>
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
          onEditPeriod={handleEditPeriod}
          onClosePeriod={handleClosePeriod}
          onEditStatusEntry={handleEditStatusEntry}
          onDeleteStatusEntry={handleDeleteStatusEntry}
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
      />

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

      {/* Cancellation dialog */}
      <CancellationDialog
        member={member}
        open={cancellationDialogOpen}
        onOpenChange={setCancellationDialogOpen}
      />

      {/* Status history edit dialog */}
      {editingStatusEntry && (
        <StatusHistoryEditDialog
          entry={editingStatusEntry}
          open={!!editingStatusEntry}
          onOpenChange={(open) => {
            if (!open) setEditingStatusEntry(null);
          }}
          slug={slug}
          memberId={member.id}
        />
      )}

      {/* Anonymize dialog (DSGVO) */}
      <MemberAnonymizeDialog
        member={member}
        slug={slug}
        open={anonymizeDialogOpen}
        onOpenChange={setAnonymizeDialogOpen}
      />

      {/* Status history delete confirmation */}
      <AlertDialog
        open={!!deletingStatusEntry}
        onOpenChange={(open) => {
          if (!open) setDeletingStatusEntry(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Statuseintrag loeschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Eintrag wird unwiderruflich entfernt. Moechten Sie fortfahren?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteStatusEntry}
              disabled={deleteStatusHistory.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStatusHistory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Loeschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
