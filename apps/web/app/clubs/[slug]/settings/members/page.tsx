import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ClubMembersSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mitglieder verwalten</CardTitle>
          <CardDescription>
            Mitglieder hinzufügen, entfernen und deren Rollen anpassen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Mitgliederverwaltung wird in einer späteren Phase implementiert.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
