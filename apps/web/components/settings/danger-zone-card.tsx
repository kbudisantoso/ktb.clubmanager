'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
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
import { useSessionQuery } from '@/hooks/use-session';

// ============================================================================
// Main component
// ============================================================================

export function DangerZoneCard() {
  const { data: session } = useSessionQuery();
  const deletionCheck = useAccountDeletionCheck();
  const deleteAccount = useDeleteAccount();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const userEmail = session?.user.email ?? '';
  const confirmationMatch = confirmInput === userEmail;
  const hasError = deletionCheck.isError;
  const isChecking = deletionCheck.isFetching;
  const isBlocked = deletionCheck.data && !deletionCheck.data.canDelete;
  const canDelete = deletionCheck.data?.canDelete === true;
  const blockedClubs = deletionCheck.data?.blockedClubs ?? [];

  const handleDeleteClick = async () => {
    await deletionCheck.refetch();
    setDialogOpen(true);
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
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Deine persoenlichen Daten werden unwiderruflich geloescht.</p>
            <p>Deine Mitgliedschaften in Vereinen bleiben davon unberuehrt.</p>
            <p>
              Die Verknuepfung zwischen deinem Benutzerkonto und deinen Vereinsmitgliedschaften wird
              aufgehoben.
            </p>
          </div>
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
          {isChecking ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Pruefe Voraussetzungen...
                </AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleClose}>Abbrechen</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : hasError ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Pruefung fehlgeschlagen
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Die Voraussetzungen fuer die Kontoloeschung konnten nicht geprueft werden. Bitte
                  versuche es spaeter erneut.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleClose}>Schliessen</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : isBlocked ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Konto kann nicht geloescht werden
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Du bist der einzige Verantwortliche folgender Vereine. Bitte uebertrage zuerst die
                  Verantwortlichkeit.
                </AlertDialogDescription>
              </AlertDialogHeader>
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
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleClose}>Schliessen</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : canDelete ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Konto wirklich loeschen?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rueckgaengig gemacht werden. Deine persoenlichen Daten
                  werden unwiderruflich geloescht. Deine Vereinsmitgliedschaften bleiben davon
                  unberuehrt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="delete-confirm">
                    Gib deine E-Mail-Adresse{' '}
                    <code className="font-mono font-bold">{userEmail}</code> ein, um die Loeschung
                    zu bestaetigen:
                  </Label>
                  <Input
                    id="delete-confirm"
                    type="email"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={userEmail}
                    autoFocus
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleClose}>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  disabled={!confirmationMatch || deleteAccount.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Konto loeschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
