'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Client component for club settings page content.
 * Separated from async server component for testability.
 */
export function SettingsContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Allgemein</CardTitle>
          <CardDescription>Grundlegende Einstellungen für deinen Verein</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Vereinseinstellungen werden in Phase 9 (Roles & Permissions) vollständig implementiert.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
