'use client';

import { useCallback, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
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
import { MemberDetailHeader } from './member-detail-header';
import { MemberForm } from './member-form/member-form';
import { MemberDeleteDialog } from './member-delete-dialog';
import { MemberAnonymizeDialog } from './member-anonymize-dialog';

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
  const { data: member, isLoading, isError } = useMember(slug, memberId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anonymizeDialogOpen, setAnonymizeDialogOpen] = useState(false);

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
