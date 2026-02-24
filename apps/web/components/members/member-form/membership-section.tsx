'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
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

interface MembershipSectionProps {
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
export function MembershipSection({ member, slug }: MembershipSectionProps) {
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

  // Status history edit/delete state
  const [editingStatusEntry, setEditingStatusEntry] = useState<StatusHistoryEntry | null>(null);
  const [deletingStatusEntry, setDeletingStatusEntry] = useState<StatusHistoryEntry | null>(null);
  const deleteStatusHistory = useDeleteStatusHistory(slug, member.id);

  // Anonymization dialog state (DSGVO reminder)
  const [anonymizeDialogOpen, setAnonymizeDialogOpen] = useState(false);

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
      toast({ title: 'Eintrag gelöscht' });
    } catch {
      toast({
        title: 'Fehler beim Löschen',
        description: 'Der Eintrag konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    }
    setDeletingStatusEntry(null);
  }, [deletingStatusEntry, deleteStatusHistory, toast]);

  return (
    <>
      <div className="space-y-6">
        {/* Cancellation / exit notice */}
        {hasCancellation &&
          (() => {
            const isLeft = member.status === 'LEFT';
            const dateStr = member.cancellationDate!;
            const today = new Date().toISOString().slice(0, 10);
            const prep = dateStr <= today ? 'am' : 'zum';
            const label = isLeft
              ? `Austritt ${prep} ${formatDate(dateStr)}`
              : `Kündigung zum ${formatDate(dateStr)}`;
            return (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">{label}</p>
                  {member.cancellationReceivedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Eingegangen am {formatDate(member.cancellationReceivedAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

        {/* DSGVO anonymization reminder */}
        {anonymizationReminder && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 p-3">
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-destructive">
                Personenbezogene Daten müssen gelöscht werden
              </p>
              <p className="text-muted-foreground mt-0.5">
                Dieses Mitglied ist seit {formatDate(anonymizationReminder)} ausgetreten.
                Personenbezogene Daten sollten gemäß DSGVO gelöscht werden.
              </p>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mt-2"
                onClick={() => setAnonymizeDialogOpen(true)}
              >
                Daten löschen
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
          cancellationDate={member.cancellationDate}
          hasFormalCancellation={!!member.cancellationDate && !!member.cancellationReceivedAt}
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
            <AlertDialogTitle>Statuseintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Eintrag wird unwiderruflich entfernt. Möchtest du fortfahren?
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
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
