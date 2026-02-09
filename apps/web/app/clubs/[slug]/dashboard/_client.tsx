'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCanManageSettings } from '@/lib/club-permissions';
import { apiFetch } from '@/lib/api';
import { Users, BookOpen, Copy, Check } from 'lucide-react';
import { AccessRequestsCard } from '@/components/club/access-requests-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface ClubDetails {
  id: string;
  name: string;
  slug: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  inviteCode?: string;
  tier?: { name: string };
  userCount: number;
  memberCount: number;
}

export function ClubDashboardClient() {
  const params = useParams();
  const canManageSettings = useCanManageSettings();
  const [club, setClub] = useState<ClubDetails | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const slug = params.slug as string;

  useEffect(() => {
    fetchClubDetails();
  }, [slug]);

  async function fetchClubDetails() {
    const res = await apiFetch(`/api/clubs/${slug}`);
    if (res.ok) {
      setClub(await res.json());
    }
  }

  async function copyInviteCode() {
    if (club?.inviteCode) {
      await navigator.clipboard.writeText(club.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  async function copyInviteLink() {
    if (club?.inviteCode && typeof window !== 'undefined') {
      const link = `${window.location.origin}/join/${encodeURIComponent(club.inviteCode)}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  if (!club) {
    return <div className="p-8">Laden...</div>;
  }

  const quickActions = [
    { href: `/clubs/${slug}/members`, label: 'Mitglieder', icon: Users },
    { href: `/clubs/${slug}/accounting`, label: 'Buchhaltung', icon: BookOpen },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{club.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={club.visibility === 'PUBLIC' ? 'default' : 'secondary'}>
              {club.visibility === 'PUBLIC' ? 'Öffentlich' : 'Privat'}
            </Badge>
            {club.tier && <Badge variant="outline">{club.tier.name}</Badge>}
          </div>
          {club.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl">{club.description}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <action.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Übersicht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Benutzer</span>
              <span className="font-medium">{club.userCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mitglieder</span>
              <span className="font-medium">{club.memberCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Invite Code (for private clubs with admin access) */}
        {club.inviteCode && canManageSettings && (
          <Card>
            <CardHeader>
              <CardTitle>Einladungscode</CardTitle>
              <CardDescription>Teile diesen Code, um neue Mitglieder einzuladen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded-lg text-lg font-mono tracking-wider text-center">
                  {club.inviteCode}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyInviteCode}
                  title="Code kopieren"
                >
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-sm text-muted-foreground flex-1 truncate">
                  Einladungslink:{' '}
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/join/${encodeURIComponent(club.inviteCode)}`
                    : `/join/${encodeURIComponent(club.inviteCode)}`}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyInviteLink}
                  className="shrink-0 h-7 px-2"
                >
                  {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Access Requests (for admins only, auto-hides when empty) */}
        {canManageSettings && <AccessRequestsCard slug={slug} />}
      </div>
    </div>
  );
}
