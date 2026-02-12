import { checkClubAccess } from '@/lib/check-club-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface InvitesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClubInvitesSettingsPage({ params }: InvitesPageProps) {
  const { slug } = await params;
  await checkClubAccess(slug);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Einladungen</CardTitle>
          <CardDescription>Einladungscodes und Beitrittsanfragen verwalten</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Einladungsverwaltung wird in einer späteren Phase implementiert.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
