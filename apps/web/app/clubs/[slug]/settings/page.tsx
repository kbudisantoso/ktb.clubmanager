'use client';

import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ClubSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Vereinseinstellungen</h1>

      <Card>
        <CardHeader>
          <CardTitle>Allgemein</CardTitle>
          <CardDescription>
            Grundlegende Einstellungen für deinen Verein
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Vereinseinstellungen werden in Phase 9 (Roles & Permissions) vollständig
            implementiert.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
