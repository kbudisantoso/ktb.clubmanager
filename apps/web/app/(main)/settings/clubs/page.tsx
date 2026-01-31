'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ClubAvatar } from '@/components/club-switcher/club-avatar';
import { useClubStore, type ClubContext } from '@/lib/club-store';
import { useToast } from '@/hooks/use-toast';

interface AccessRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  message?: string;
  createdAt: string;
  club: {
    id: string;
    name: string;
    slug: string;
    avatarInitials?: string;
    avatarColor?: string;
  };
  rejectionReason?: string;
  rejectionNote?: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Inhaber',
  ADMIN: 'Administrator',
  TREASURER: 'Kassenwart',
  VIEWER: 'Mitglied',
};

export default function MyClubsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { clubs, setClubs, activeClubSlug, setActiveClub } = useClubStore();

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchClubs(), fetchRequests()]).then(() => setIsLoading(false));
  }, []);

  async function fetchClubs() {
    const res = await fetch('/api/clubs/my', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setClubs(
        data.map((club: ClubContext & { avatarUrl?: string }) => ({
          id: club.id,
          name: club.name,
          slug: club.slug,
          role: club.role,
          avatarUrl: club.avatarUrl,
          avatarInitials: club.avatarInitials,
          avatarColor: club.avatarColor,
        }))
      );
    }
  }

  async function fetchRequests() {
    const res = await fetch('/api/clubs/my-requests', { credentials: 'include' });
    if (res.ok) {
      setRequests(await res.json());
    }
  }

  async function handleLeaveClub(club: ClubContext) {
    if (club.role === 'OWNER') {
      toast({
        title: 'Nicht möglich',
        description:
          'Als Inhaber kannst du den Verein nicht verlassen. Übertrage zuerst die Inhaberschaft.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Möchtest du "${club.name}" wirklich verlassen?`)) return;

    // Note: This would call a leave endpoint - for now showing the flow
    toast({
      title: 'Verein verlassen',
      description: `Du hast "${club.name}" verlassen.`,
    });
    fetchClubs();
  }

  async function handleCancelRequest(requestId: string) {
    const res = await fetch(`/api/clubs/requests/${requestId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (res.ok) {
      toast({ title: 'Anfrage zurückgezogen' });
      fetchRequests();
    }
  }

  function handleJoinWithCode() {
    if (inviteCode.trim()) {
      const normalized = inviteCode.replace(/[\s-]/g, '').toUpperCase();
      router.push(`/join/${normalized.slice(0, 4)}-${normalized.slice(4)}`);
    }
  }

  function handleSwitchToClub(club: ClubContext) {
    setActiveClub(club.slug);
    router.push(`/clubs/${club.slug}/dashboard`);
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const processedRequests = requests
    .filter((r) => r.status !== 'PENDING')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* My Clubs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Meine Vereine</CardTitle>
              <CardDescription>
                Vereine, bei denen du Mitglied bist
              </CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href="/clubs/new">
                <Plus className="h-4 w-4 mr-2" />
                Verein erstellen
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Laden...</div>
          ) : clubs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Du bist noch keinem Verein zugeordnet.
            </div>
          ) : (
            <div className="space-y-3">
              {clubs.map((club) => (
                <div
                  key={club.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <ClubAvatar
                    name={club.name}
                    avatarInitials={club.avatarInitials}
                    avatarColor={club.avatarColor}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{club.name}</div>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {ROLE_LABELS[club.role] || club.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {club.slug === activeClubSlug && <Badge>Aktiv</Badge>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSwitchToClub(club)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLeaveClub(club)}
                      disabled={club.role === 'OWNER'}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Join with code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Einladungscode eingeben
          </CardTitle>
          <CardDescription>
            Du hast einen Einladungscode erhalten? Gib ihn hier ein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="XXXX-XXXX"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="font-mono text-center tracking-wider max-w-[200px]"
              maxLength={9}
            />
            <Button
              onClick={handleJoinWithCode}
              disabled={inviteCode.replace(/[\s-]/g, '').length < 8}
            >
              Einlösen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Offene Anfragen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                >
                  <ClubAvatar
                    name={request.club.name}
                    avatarInitials={request.club.avatarInitials}
                    avatarColor={request.club.avatarColor}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{request.club.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Angefragt am{' '}
                      {new Date(request.createdAt).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelRequest(request.id)}
                  >
                    Zurückziehen
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Request History */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Letzte Anfragen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1">
                    <div className="font-medium">{request.club.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {request.status === 'APPROVED' && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Genehmigt
                        </span>
                      )}
                      {request.status === 'REJECTED' && (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          Abgelehnt
                        </span>
                      )}
                      {request.status === 'EXPIRED' && (
                        <span className="text-muted-foreground">Abgelaufen</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
