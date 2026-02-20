'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { useHasPermission } from '@/lib/permission-hooks';
import { useClubPermissions } from '@/lib/club-permissions';
import { AccessDenied } from '@/components/access-denied';
import { UserManagementTable } from '@/components/club/user-management-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Loader2 } from 'lucide-react';

interface ClubUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string;
  roles: string[];
  joinedAt: string;
  isExternal: boolean;
}

export function UsersSettingsClient() {
  const params = useParams<{ slug: string }>();
  const { data: session } = useSession();
  const { roles: currentUserRoles } = useClubPermissions();
  const hasPermission = useHasPermission('users:read');
  const [users, setUsers] = useState<ClubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!params.slug) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/clubs/${params.slug}/users`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Keine Berechtigung');
        }
        throw new Error('Fehler beim Laden der Benutzer');
      }
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    if (hasPermission) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [fetchUsers, hasPermission]);

  // Show access denied if no permission
  if (!hasPermission) {
    return (
      <AccessDenied
        feature="die Benutzerverwaltung"
        backHref={`/clubs/${params.slug}/dashboard`}
        backLabel="Zurück zum Verein"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchUsers} variant="outline" className="mt-4">
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Benutzer</CardTitle>
              <CardDescription>
                {users.length} Benutzer haben Zugang zu diesem Verein
              </CardDescription>
            </div>
            <Button disabled title="Kommt bald">
              <UserPlus className="h-4 w-4 mr-2" />
              Benutzer einladen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <UserManagementTable
            users={users}
            currentUserId={session?.user?.id ?? ''}
            currentUserRoles={currentUserRoles}
            clubSlug={params.slug}
            onRefresh={fetchUsers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
