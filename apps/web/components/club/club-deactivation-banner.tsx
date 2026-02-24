'use client';

import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { getDaysRemaining, formatCountdown } from '@/hooks/use-club-deactivation';
import { useClubExport } from '@/hooks/use-club-export';
import { Button } from '@/components/ui/button';

interface ClubDeactivationBannerProps {
  slug: string;
  deactivatedAt: string;
  scheduledDeletionAt: string;
}

/**
 * Persistent warning banner displayed when a club is deactivated.
 * Shows deactivation date, scheduled deletion date, and countdown.
 * Includes a button to export club data as YAML.
 */
export function ClubDeactivationBanner({
  slug,
  deactivatedAt,
  scheduledDeletionAt,
}: ClubDeactivationBannerProps) {
  const { exportClub, isExporting } = useClubExport(slug);
  const daysRemaining = getDaysRemaining(scheduledDeletionAt);
  const countdown = daysRemaining !== null ? formatCountdown(daysRemaining) : null;

  const deactivatedDate = new Date(deactivatedAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const deletionDate = new Date(scheduledDeletionAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="flex items-center justify-between gap-4 border-b border-destructive/25 bg-destructive/10 px-4 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className="size-4 shrink-0 text-destructive" />
        <div className="min-w-0">
          <span className="text-sm font-medium text-destructive">Verein wird gelöscht</span>
          <span className="ml-2 text-sm text-destructive/80 hidden sm:inline">
            Deaktiviert am {deactivatedDate} &middot; Löschung am {deletionDate}
            {countdown && <> &middot; {countdown}</>}
          </span>
          {countdown && (
            <span className="ml-2 text-sm text-destructive/80 sm:hidden">&middot; {countdown}</span>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={exportClub}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="mr-2 h-3.5 w-3.5" />
        )}
        Daten exportieren
      </Button>
    </div>
  );
}
