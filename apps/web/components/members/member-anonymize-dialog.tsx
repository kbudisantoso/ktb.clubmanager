'use client';

import { useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnonymizeMember } from '@/hooks/use-members';
import { useHasPermission } from '@/lib/permission-hooks';
import { useToast } from '@/hooks/use-toast';
import type { MemberDetail } from '@/hooks/use-member-detail';

// ============================================================================
// Types
// ============================================================================

interface MemberAnonymizeDialogProps {
  /** The member to anonymize */
  member: MemberDetail;
  /** Club slug */
  slug: string;
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Called after successful anonymization */
  onAnonymized?: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Two-step confirmation dialog for DSGVO anonymization (Art. 17).
 *
 * Step 1: Warning about what will happen.
 * Step 2: Type member number to confirm (like GitHub repo delete pattern).
 *
 * Only available for:
 * - Members with status=LEFT
 * - Users with OWNER permission (member:delete maps to owner-level operations)
 */
export function MemberAnonymizeDialog({
  member,
  slug,
  open,
  onOpenChange,
  onAnonymized,
}: MemberAnonymizeDialogProps) {
  const { toast } = useToast();
  const anonymize = useAnonymizeMember(slug);
  const isOwner = useHasPermission('member:delete');

  const [step, setStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isLeft = member.status === 'LEFT';
  const displayName =
    member.personType === 'LEGAL_ENTITY' && member.organizationName
      ? member.organizationName
      : `${member.lastName}, ${member.firstName}`;
  const confirmationMatch = confirmInput === member.memberNumber;

  const handleProceedToStep2 = () => {
    setStep(2);
  };

  const handleAnonymize = async () => {
    if (!confirmationMatch) return;
    setError(null);

    try {
      await anonymize.mutateAsync(member.id);
      toast({ title: 'Mitglied anonymisiert' });
      handleClose();
      onAnonymized?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    }
  };

  const handleClose = () => {
    setStep(1);
    setConfirmInput('');
    setError(null);
    onOpenChange(false);
  };

  // Guard: must be LEFT and OWNER
  if (!isLeft || !isOwner) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anonymisierung nicht moeglich</AlertDialogTitle>
            <AlertDialogDescription>
              {!isLeft
                ? 'Mitglieder koennen nur nach Austritt anonymisiert werden.'
                : 'Nur Inhaber koennen Mitglieder anonymisieren.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>Schliessen</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            {step === 1 ? 'Mitglied anonymisieren?' : 'Anonymisierung bestaetigen'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {displayName} ({member.memberNumber})
          </AlertDialogDescription>
        </AlertDialogHeader>

        {step === 1 ? (
          /* Step 1: Warning */
          <div className="space-y-4">
            <div className="rounded-md bg-destructive/10 border border-destructive/25 p-4 space-y-3">
              <p className="text-sm font-medium text-destructive">
                Alle persoenlichen Daten (Name, Adresse, Kontakt, Notizen) werden unwiderruflich
                durch &quot;Anonymisiert&quot; ersetzt.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium">Folgende Daten bleiben erhalten:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>Mitgliedsnummer</li>
                  <li>Daten (Eintritt, Austritt)</li>
                  <li>Finanzbezuege</li>
                  <li>Status</li>
                </ul>
              </div>
              <p className="text-sm font-semibold text-destructive">
                Dieser Vorgang kann nicht rueckgaengig gemacht werden.
              </p>
            </div>
          </div>
        ) : (
          /* Step 2: Type member number to confirm */
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="anonymize-confirm">
                Gib die Mitgliedsnummer{' '}
                <code className="font-mono font-bold">{member.memberNumber}</code> ein, um die
                Anonymisierung zu bestaetigen:
              </Label>
              <Input
                id="anonymize-confirm"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={member.memberNumber}
                className="font-mono"
                autoFocus
              />
            </div>

            {/* Error display */}
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/25 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Abbrechen</AlertDialogCancel>
          {step === 1 ? (
            <AlertDialogAction
              onClick={handleProceedToStep2}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Weiter
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={handleAnonymize}
              disabled={!confirmationMatch || anonymize.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {anonymize.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Anonymisieren
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
