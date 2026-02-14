'use client';

import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useClubSettings } from '@/hooks/use-club-settings';
import { ClubSettingsForm } from '@/components/settings/club-settings-form';

/**
 * Client component for club settings page content.
 * Fetches club settings and renders the always-editable form.
 */
export function SettingsContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data: club, isLoading, error } = useClubSettings(slug);

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

  return <ClubSettingsForm club={club} slug={slug} />;
}
