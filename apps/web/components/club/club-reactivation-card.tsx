'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  getDaysRemaining,
  formatCountdown,
  useReactivateClub,
} from '@/hooks/use-club-deactivation';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Types
// ============================================================================

interface ClubReactivationCardProps {
  slug: string;
  scheduledDeletionAt: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Danger zone card for reactivating a deactivated club.
 * Shows scheduled deletion date with countdown and a button to cancel the deletion.
 * Displayed instead of the deletion card when a club is deactivated.
 */
export function ClubReactivationCard({ slug, scheduledDeletionAt }: ClubReactivationCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reactivateClub = useReactivateClub(slug);
  const { toast } = useToast();

  const daysRemaining = getDaysRemaining(scheduledDeletionAt);
  const countdown = daysRemaining !== null ? formatCountdown(daysRemaining) : null;

  const deletionDate = new Date(scheduledDeletionAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const handleReactivate = async () => {
    try {
      await reactivateClub.mutateAsync();
      toast({
        title: 'Verein reaktiviert',
        description: 'Die geplante Löschung wurde abgebrochen.',
      });
      setConfirmOpen(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'Verein konnte nicht reaktiviert werden.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Verein wird gelöscht
          </CardTitle>
          <CardDescription>
            Endgültige Löschung am {deletionDate}
            {countdown && <> &middot; {countdown}</>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Löschung abbrechen
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Löschung abbrechen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Verein wird reaktiviert und die geplante Löschung wird abgebrochen. Alle Daten
              bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zurück</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} disabled={reactivateClub.isPending}>
              {reactivateClub.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verein reaktivieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
