import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ClubInvitesSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Einladungen</CardTitle>
          <CardDescription>
            Einladungscodes und Beitrittsanfragen verwalten
          </CardDescription>
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
