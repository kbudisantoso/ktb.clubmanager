'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { MIN_GRACE_PERIOD_FLOOR } from '@ktb/shared';
import { useClubSettings } from '@/hooks/use-club-settings';
import { useActiveClub } from '@/lib/club-store';
import { useClubPermissions } from '@/lib/club-permissions';
import { ClubSettingsForm } from '@/components/settings/club-settings-form';
import { ClubDeletionDialog } from '@/components/club/club-deletion-dialog';
import { ClubReactivationCard } from '@/components/club/club-reactivation-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Client component for club settings page content.
 * Fetches club settings and renders the always-editable form.
 * Includes a danger zone section at the bottom for club deletion/reactivation.
 */
export function SettingsContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data: club, isLoading, error } = useClubSettings(slug);
  const activeClub = useActiveClub();
  const { isOwner } = useClubPermissions();
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Einstellungen konnten nicht geladen werden.
      </div>
    );
  }

  const isDeactivated = !!activeClub?.deactivatedAt;

  return (
    <div className="space-y-8">
      <ClubSettingsForm club={club} slug={slug} />

      {/* Danger Zone — only visible to OWNER */}
      {isOwner && (
        <>
          {isDeactivated && activeClub?.scheduledDeletionAt ? (
            <ClubReactivationCard
              slug={slug}
              scheduledDeletionAt={activeClub.scheduledDeletionAt}
            />
          ) : (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle>Verein löschen</CardTitle>
                <CardDescription>
                  Den Verein und alle zugehörigen Daten endgültig löschen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => setDeletionDialogOpen(true)}>
                  Verein löschen
                </Button>
              </CardContent>
            </Card>
          )}

          <ClubDeletionDialog
            open={deletionDialogOpen}
            onOpenChange={setDeletionDialogOpen}
            clubName={club.name}
            slug={slug}
            minGracePeriodDays={MIN_GRACE_PERIOD_FLOOR}
          />
        </>
      )}
    </div>
  );
}
