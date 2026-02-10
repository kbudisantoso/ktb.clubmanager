'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Settings2, Users, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type EmptyStateVariant = 'no-number-ranges' | 'no-members' | 'no-results';

interface MemberEmptyStateProps {
  /** Which empty state to display */
  variant: EmptyStateVariant;
  /** Called when "Erstes Mitglied anlegen" is clicked */
  onCreateMember?: () => void;
  /** Called when "Suche zuruecksetzen" is clicked */
  onClearSearch?: () => void;
}

const VARIANTS: Record<
  EmptyStateVariant,
  {
    icon: typeof Settings2;
    title: string;
    description: string;
  }
> = {
  'no-number-ranges': {
    icon: Settings2,
    title: 'Mitgliederverwaltung einrichten',
    description:
      'Bevor du Mitglieder anlegen kannst, richte zunaechst die Nummernkreise fuer die Mitgliedsnummern ein.',
  },
  'no-members': {
    icon: Users,
    title: 'Noch keine Mitglieder',
    description: 'Hier werden alle Mitglieder deines Vereins angezeigt und verwaltet.',
  },
  'no-results': {
    icon: SearchX,
    title: 'Keine Mitglieder gefunden',
    description: 'Deine Suche ergab keine Treffer.',
  },
};

/**
 * Contextual empty state for the member list.
 * Guides the user through the setup flow (number ranges -> first member -> search).
 */
export function MemberEmptyState({
  variant,
  onCreateMember,
  onClearSearch,
}: MemberEmptyStateProps) {
  const params = useParams<{ slug: string }>();
  const config = VARIANTS[variant];
  const Icon = config.icon;

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {variant === 'no-number-ranges' && (
            <Button asChild>
              <Link href={`/clubs/${params.slug}/settings/number-ranges`}>
                Nummernkreise einrichten
              </Link>
            </Button>
          )}

          {variant === 'no-members' && (
            <Button onClick={onCreateMember}>Erstes Mitglied anlegen</Button>
          )}

          {variant === 'no-results' && (
            <Button variant="outline" onClick={onClearSearch}>
              Suche zuruecksetzen
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
