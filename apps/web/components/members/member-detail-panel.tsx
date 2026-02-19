'use client';

import { useCallback, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useMember } from '@/hooks/use-member-detail';
import { useRevokeCancellation } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format-date';
import { MemberDetailHeader } from './member-detail-header';
import { MemberForm } from './member-form/member-form';
import { MemberDeleteDialog } from './member-delete-dialog';
import { MemberAnonymizeDialog } from './member-anonymize-dialog';
import { MemberLinkUserDialog } from './member-link-user-dialog';
import { StatusTransitionDialog } from './status-transition-dialog';
import { CancellationDialog } from './cancellation-dialog';

// ============================================================================
// Types
// ============================================================================

interface MemberDetailPanelProps {
  /** The currently selected member ID */
  selectedMemberId: string | null;
  /** Called when the panel should close */
  onClose: () => void;
  /** Navigate to the previous member in the list */
  onNavigatePrev?: () => void;
  /** Navigate to the next member in the list */
  onNavigateNext?: () => void;
  /** Whether there is a previous member to navigate to */
  hasPrev?: boolean;
  /** Whether there is a next member to navigate to */
  hasNext?: boolean;
}

// ============================================================================
// Detail Content
// ============================================================================

interface DetailContentProps {
  memberId: string;
  onClose: () => void;
  /** Guarded close that checks for unsaved changes before closing */
  onGuardedClose: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** Ref to communicate form dirty state to the parent Sheet */
  formDirtyRef: React.MutableRefObject<boolean>;
}

function DetailContent({
  memberId,
  onClose,
  onGuardedClose,
  onNavigatePrev,
  onNavigateNext,
  hasPrev,
  hasNext,
  formDirtyRef,
}: DetailContentProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();
  const { data: member, isLoading, isError } = useMember(slug, memberId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anonymizeDialogOpen, setAnonymizeDialogOpen] = useState(false);
  const [linkUserDialogOpen, setLinkUserDialogOpen] = useState(false);

  // Status transition dialog state
  const [transitionDialogOpen, setTransitionDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<MemberStatus | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<NamedTransition | null>(null);

  // Cancellation dialog state
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);

  // Revoke cancellation state
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const revokeCancellation = useRevokeCancellation(slug);

  const handleTransition = useCallback(
    (targetStatus: MemberStatus, namedTransition: NamedTransition) => {
      setSelectedTarget(targetStatus);
      setSelectedTransition(namedTransition);
      setTransitionDialogOpen(true);
    },
    []
  );

  const handleRecordCancellation = useCallback(() => {
    setCancellationDialogOpen(true);
  }, []);

  const handleRevokeCancellation = useCallback(() => {
    setRevokeDialogOpen(true);
  }, []);

  const handleConfirmRevoke = useCallback(async () => {
    if (!member) return;
    try {
      await revokeCancellation.mutateAsync({ id: member.id });
      toast({ title: 'Kündigung widerrufen' });
    } catch {
      toast({
        title: 'Fehler',
        description: 'Die Kündigung konnte nicht widerrufen werden.',
        variant: 'destructive',
      });
    }
    setRevokeDialogOpen(false);
  }, [member, revokeCancellation, toast]);

  const handleDirtyChange = useCallback(
    (dirty: boolean) => {
      formDirtyRef.current = dirty;
    },
    [formDirtyRef]
  );

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !member) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6">
        <p className="text-sm">Mitglied nicht gefunden</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Schließen
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar: prev/next navigation + close */}
      <div className="flex items-center justify-between p-2 px-4 border-b">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!hasPrev}
            onClick={onNavigatePrev}
          >
            <ChevronUp className="h-4 w-4" />
            <span className="sr-only">Vorheriges Mitglied</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!hasNext}
            onClick={onNavigateNext}
          >
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">Nächstes Mitglied</span>
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onGuardedClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Schließen</span>
        </Button>
      </div>

      {/* Header */}
      <div className="p-4 border-b">
        <MemberDetailHeader
          member={member}
          onTransition={handleTransition}
          onRecordCancellation={handleRecordCancellation}
          onRevokeCancellation={handleRevokeCancellation}
          onLinkUser={() => setLinkUserDialogOpen(true)}
          onDelete={() => setDeleteDialogOpen(true)}
          onAnonymize={() => setAnonymizeDialogOpen(true)}
        />
      </div>

      {/* Form content — MemberForm manages its own scroll + fixed footer */}
      <MemberForm member={member} slug={slug} onDirtyChange={handleDirtyChange} />

      {/* Delete dialog */}
      <MemberDeleteDialog
        member={member}
        slug={slug}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={onClose}
      />

      {/* Anonymize dialog */}
      <MemberAnonymizeDialog
        member={member}
        slug={slug}
        open={anonymizeDialogOpen}
        onOpenChange={setAnonymizeDialogOpen}
      />

      {/* Link user dialog */}
      <MemberLinkUserDialog
        member={member}
        open={linkUserDialogOpen}
        onOpenChange={setLinkUserDialogOpen}
      />

      {/* Status transition dialog */}
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

      {/* Revoke cancellation confirmation */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kündigung widerrufen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Kündigung zum {member.cancellationDate ? formatDate(member.cancellationDate) : ''}{' '}
              wird aufgehoben. Das Mitglied bleibt im aktuellen Status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRevoke}
              disabled={revokeCancellation.isPending}
            >
              {revokeCancellation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Widerrufen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function DetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-7 w-7 rounded" />
        </div>
        <Skeleton className="h-7 w-7 rounded" />
      </div>
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Member detail Sheet that slides in from the right.
 * Used on both mobile and desktop for consistent UX.
 * Includes prev/next navigation arrows for browsing members without closing.
 */
export function MemberDetailPanel({
  selectedMemberId,
  onClose,
  onNavigatePrev,
  onNavigateNext,
  hasPrev,
  hasNext,
}: MemberDetailPanelProps) {
  const formDirtyRef = useRef(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  const guardedClose = useCallback(() => {
    if (formDirtyRef.current) {
      setDiscardDialogOpen(true);
    } else {
      onClose();
    }
  }, [onClose]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) guardedClose();
    },
    [guardedClose]
  );

  return (
    <>
      <Sheet open={!!selectedMemberId} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>Mitglied Details</SheetTitle>
          </SheetHeader>
          {selectedMemberId && (
            <DetailContent
              memberId={selectedMemberId}
              onClose={onClose}
              onGuardedClose={guardedClose}
              onNavigatePrev={onNavigatePrev}
              onNavigateNext={onNavigateNext}
              hasPrev={hasPrev}
              hasNext={hasNext}
              formDirtyRef={formDirtyRef}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Unsaved changes confirmation (for overlay click / Escape) */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ungespeicherte Änderungen</AlertDialogTitle>
            <AlertDialogDescription>
              Es gibt ungespeicherte Änderungen. Möchtest du sie verwerfen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Weiter bearbeiten</AlertDialogCancel>
            <AlertDialogAction onClick={onClose}>Verwerfen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
