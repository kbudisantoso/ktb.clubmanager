'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeleteMember } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';
import { MemberStatusBadge } from './member-status-badge';
import type { MemberDetail } from '@/hooks/use-member-detail';

// ============================================================================
// Constants
// ============================================================================

/** Deletion reason options with German labels */
const DELETION_REASONS = [
  { value: 'AUSTRITT', label: 'Ordentlicher Austritt' },
  { value: 'AUSSCHLUSS', label: 'Vereinsausschluss' },
  { value: 'DATENSCHUTZ', label: 'DSGVO-Loeschantrag' },
  { value: 'SONSTIGES', label: 'Sonstiges' },
] as const;

// ============================================================================
// Types
// ============================================================================

interface MemberDeleteDialogProps {
  /** The member to delete */
  member: MemberDetail;
  /** Club slug */
  slug: string;
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Called after successful deletion */
  onDeleted?: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * AlertDialog for member deletion with soft/hard delete options.
 * Enforces status=LEFT requirement before allowing deletion.
 * Requires a deletion reason to be selected.
 */
export function MemberDeleteDialog({
  member,
  slug,
  open,
  onOpenChange,
  onDeleted,
}: MemberDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMember = useDeleteMember(slug);
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const isLeft = member.status === 'LEFT';
  const displayName =
    member.personType === 'LEGAL_ENTITY' && member.organizationName
      ? member.organizationName
      : `${member.lastName}, ${member.firstName}`;

  const handleDelete = async () => {
    if (!reason) return;
    setError(null);

    try {
      await deleteMember.mutateAsync({ id: member.id, reason });
      toast({ title: 'Mitglied archiviert' });
      onOpenChange(false);
      setReason('');
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    }
  };

  const handleClose = () => {
    setReason('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mitglied loeschen</AlertDialogTitle>
          <AlertDialogDescription>
            {displayName} ({member.memberNumber})
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Member info */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <MemberStatusBadge status={member.status} />
          </div>

          {!isLeft ? (
            /* Not deletable - status != LEFT */
            <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 p-3">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Mitglied kann nur nach Austritt geloescht werden. Bitte aendere zuerst den Status
                auf &quot;Ausgetreten&quot;.
              </p>
            </div>
          ) : (
            <>
              {/* Soft delete explanation */}
              <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium">Mitglied archivieren</p>
                  <p>
                    Das Mitglied wird archiviert und aus den Listen ausgeblendet. Die Daten bleiben
                    erhalten und koennen wiederhergestellt werden.
                  </p>
                </div>
              </div>

              {/* Deletion reason */}
              <div className="space-y-1.5">
                <Label>
                  Grund <span className="text-destructive">*</span>
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Grund auswaehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DELETION_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Error display */}
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/25 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Abbrechen</AlertDialogCancel>
          {isLeft && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!reason || deleteMember.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archivieren
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
