'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GRACE_PERIOD_PRESETS, DEFAULT_GRACE_PERIOD } from '@ktb/shared';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeactivateClub } from '@/hooks/use-club-deactivation';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Types
// ============================================================================

interface ClubDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubName: string;
  slug: string;
  minGracePeriodDays: number;
}

type Step = 'warning' | 'confirm';

// ============================================================================
// Component
// ============================================================================

/**
 * Two-step deletion confirmation dialog for clubs.
 *
 * Step 1 (Warning): Explains consequences of deletion (deactivation, grace period, permanent deletion).
 * Step 2 (Confirm): Grace period selection + type club name to confirm.
 *
 * Uses useDeactivateClub mutation to initiate the deactivation process.
 */
export function ClubDeletionDialog({
  open,
  onOpenChange,
  clubName,
  slug,
  minGracePeriodDays,
}: ClubDeletionDialogProps) {
  const [step, setStep] = useState<Step>('warning');
  const [confirmInput, setConfirmInput] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(() => {
    const available = GRACE_PERIOD_PRESETS.filter((p) => p >= minGracePeriodDays);
    return available.includes(DEFAULT_GRACE_PERIOD as (typeof available)[number])
      ? DEFAULT_GRACE_PERIOD
      : (available[0] ?? DEFAULT_GRACE_PERIOD);
  });

  const deactivateClub = useDeactivateClub(slug);
  const { toast } = useToast();

  const availablePresets = GRACE_PERIOD_PRESETS.filter((p) => p >= minGracePeriodDays);
  const confirmationMatch = confirmInput === clubName;

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when dialog closes
      setStep('warning');
      setConfirmInput('');
      deactivateClub.reset();
    }
    onOpenChange(isOpen);
  };

  const handleConfirmDelete = async () => {
    if (!confirmationMatch) return;

    try {
      await deactivateClub.mutateAsync({
        gracePeriodDays,
        confirmationName: confirmInput,
      });
      toast({
        title: 'Verein wird deaktiviert',
        description: `Der Verein wird nach ${gracePeriodDays} Tagen endgültig gelöscht.`,
      });
      handleClose(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'Verein konnte nicht deaktiviert werden.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        {step === 'warning' ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Verein löschen</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Durch die Löschung wird der Verein <strong>sofort deaktiviert</strong>. Während
                    der Übergangsfrist haben Sie noch Zugriff auf Ihre Daten.
                  </p>
                  <p>
                    Nach Ablauf der Übergangsfrist werden <strong>alle Vereinsdaten</strong>{' '}
                    unwiderruflich gelöscht: Mitglieder, Buchungen, Dokumente und Einstellungen.
                  </p>
                  <p>
                    Die Löschung kann jederzeit während der Übergangsfrist rückgängig gemacht
                    werden.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => setStep('confirm')}>
                Weiter
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Löschung bestätigen</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="grace-period">Übergangsfrist</Label>
                <Select
                  value={String(gracePeriodDays)}
                  onValueChange={(value) => setGracePeriodDays(Number(value))}
                >
                  <SelectTrigger id="grace-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePresets.map((days) => (
                      <SelectItem key={days} value={String(days)}>
                        {days} Tage
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delete-club-confirm">
                  Geben Sie den Vereinsnamen ein:{' '}
                  <code className="font-mono font-bold">{clubName}</code>
                </Label>
                <Input
                  id="delete-club-confirm"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={clubName}
                  autoFocus
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={(e) => {
                  e.preventDefault();
                  setStep('warning');
                  setConfirmInput('');
                }}
              >
                Zurück
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={!confirmationMatch || deactivateClub.isPending}
              >
                {deactivateClub.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verein löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
