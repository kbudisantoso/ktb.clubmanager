import { checkClubAccess } from '@/lib/check-club-access';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface RolesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClubRolesSettingsPage({ params }: RolesPageProps) {
  const { slug } = await params;
  await checkClubAccess(slug);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rollen & Berechtigungen</CardTitle>
          <CardDescription>
            Rollen erstellen und Berechtigungen konfigurieren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Rollenverwaltung wird in Phase 9 (Roles & Permissions) implementiert.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
