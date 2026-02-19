'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  { value: 'DATENSCHUTZ', label: 'DSGVO-Löschantrag' },
  { value: 'SONSTIGES', label: 'Sonstiges' },
] as const;

const CONFIRM_WORD = 'LÖSCHEN';

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
 * AlertDialog for member deletion (soft delete / archive).
 * Requires a deletion reason and typing "LÖSCHEN" to confirm.
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
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const displayName =
    member.personType === 'LEGAL_ENTITY' && member.organizationName
      ? member.organizationName
      : `${member.lastName}, ${member.firstName}`;

  const isConfirmed = confirmation === CONFIRM_WORD;
  const canDelete = reason && isConfirmed;

  const handleDelete = async () => {
    if (!canDelete) return;
    setError(null);

    try {
      await deleteMember.mutateAsync({ id: member.id, reason });
      toast({ title: 'Mitglied archiviert' });
      onOpenChange(false);
      resetState();
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    }
  };

  const resetState = () => {
    setReason('');
    setConfirmation('');
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mitglied löschen</AlertDialogTitle>
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

          {/* Soft delete explanation */}
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">Mitglied archivieren</p>
              <p>
                Das Mitglied wird archiviert und aus den Listen ausgeblendet. Die Daten bleiben
                erhalten und können wiederhergestellt werden.
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
                <SelectValue placeholder="Grund auswählen..." />
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

          {/* Type to confirm */}
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">
              Gib <span className="font-mono font-bold">{CONFIRM_WORD}</span> ein, um zu bestätigen
            </Label>
            <Input
              id="delete-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/25 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Abbrechen</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || deleteMember.isPending}
          >
            {deleteMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Endgültig löschen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
