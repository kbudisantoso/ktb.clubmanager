'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ShieldAlert } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccountDeletionCheck, useDeleteAccount } from '@/hooks/use-security';

// ============================================================================
// Main component
// ============================================================================

export function DangerZoneCard() {
  const deletionCheck = useAccountDeletionCheck();
  const deleteAccount = useDeleteAccount();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const confirmationMatch = confirmInput === 'LOESCHEN';
  const isBlocked = deletionCheck.data && !deletionCheck.data.canDelete;
  const blockedClubs = deletionCheck.data?.blockedClubs ?? [];

  const handleDeleteClick = async () => {
    // Fetch deletion check first
    const result = await deletionCheck.refetch();
    if (result.data) {
      setDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmationMatch) return;
    await deleteAccount.mutateAsync();
    // On success, the hook redirects to /login
  };

  const handleClose = () => {
    setDialogOpen(false);
    setConfirmInput('');
  };

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Konto loeschen</CardTitle>
          <CardDescription>Dein Benutzerkonto unwiderruflich loeschen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dein Benutzerkonto wird anonymisiert und alle persoenlichen Daten werden geloescht.
            Deine Mitgliedschaften in Vereinen bleiben als anonyme Eintraege erhalten.
          </p>
          <Button
            variant="destructive"
            onClick={handleDeleteClick}
            disabled={deletionCheck.isFetching}
          >
            {deletionCheck.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Konto loeschen
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              {isBlocked ? 'Konto kann nicht geloescht werden' : 'Konto wirklich loeschen?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBlocked
                ? 'Du bist der einzige Verantwortliche folgender Vereine. Bitte uebertrage zuerst die Verantwortlichkeit.'
                : 'Diese Aktion kann nicht rueckgaengig gemacht werden. Alle deine persoenlichen Daten werden unwiderruflich anonymisiert.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isBlocked ? (
            <div className="space-y-2">
              {blockedClubs.map((club) => (
                <div key={club.id} className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium">{club.name}</span>
                  <Button variant="link" size="sm" asChild>
                    <Link href={`/clubs/${club.slug}/settings/users`}>Benutzer verwalten</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="delete-confirm">
                  Gib <code className="font-mono font-bold">LOESCHEN</code> ein, um die Loeschung zu
                  bestaetigen:
                </Label>
                <Input
                  id="delete-confirm"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="LOESCHEN"
                  className="font-mono"
                  autoFocus
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>
              {isBlocked ? 'Schliessen' : 'Abbrechen'}
            </AlertDialogCancel>
            {!isBlocked && (
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={!confirmationMatch || deleteAccount.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Konto loeschen
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
