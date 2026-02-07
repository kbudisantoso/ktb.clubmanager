'use client';

import { useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClubAvatar } from '@/components/club-switcher/club-avatar';
import { RejectionNotice } from '@/components/club/rejection-notice';
import { useClubStore, type ClubContext } from '@/lib/club-store';
import { useToast } from '@/hooks/use-toast';
import { useMyClubsQuery, useMyAccessRequestsQuery, useLeaveClubMutation } from '@/hooks/use-clubs';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Verantwortlicher',
  ADMIN: 'Administrator',
  TREASURER: 'Kassenwart',
  SECRETARY: 'Schriftführer',
  MEMBER: 'Mitglied',
};

/** Format roles array to display string */
function formatRoles(roles: string[]): string {
  return roles.map(r => ROLE_LABELS[r] || r).join(', ');
}

export default function MyClubsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { activeClubSlug, setActiveClub, clearActiveClub } = useClubStore();

  const { data, isLoading: clubsLoading } = useMyClubsQuery();
  const { clubs = [], canCreateClub = false } = data ?? {};
  const { data: requests = [], isLoading: requestsLoading } = useMyAccessRequestsQuery();
  const leaveClub = useLeaveClubMutation();

  const [inviteCode, setInviteCode] = useState('');
  const [leaveConfirmClub, setLeaveConfirmClub] = useState<ClubContext | null>(null);
  const [leaveConfirmInput, setLeaveConfirmInput] = useState('');

  const isLoading = clubsLoading || requestsLoading;
  const isLeaveConfirmValid = leaveConfirmInput.toUpperCase() === 'VERLASSEN';

  function handleLeaveClub(club: ClubContext) {
    if (club.roles.includes('OWNER')) {
      toast({
        title: 'Nicht möglich',
        description:
          'Als Verantwortlicher kannst du den Verein nicht verlassen. Übertrage zuerst die Verantwortung.',
        variant: 'destructive',
      });
      return;
    }

    // Open confirmation dialog
    setLeaveConfirmClub(club);
  }

  function handleConfirmLeave() {
    if (!leaveConfirmClub || !isLeaveConfirmValid) return;

    const club = leaveConfirmClub;
    setLeaveConfirmClub(null);
    setLeaveConfirmInput('');

    leaveClub.mutate(club.slug, {
      onSuccess: () => {
        toast({
          title: 'Verein verlassen',
          description: `Du hast "${club.name}" verlassen.`,
        });
        // If this was the active club, clear it
        if (club.slug === activeClubSlug) {
          clearActiveClub();
        }
      },
      onError: (error) => {
        toast({
          title: 'Fehler',
          description: error.message || 'Verein konnte nicht verlassen werden.',
          variant: 'destructive',
        });
      },
    });
  }

  function handleCancelRequest(requestId: string) {
    // Note: This would use a mutation - for now showing the flow
    console.log('Cancel request:', requestId);
    toast({ title: 'Anfrage zurückgezogen' });
  }

  function handleInviteCodeChange(value: string) {
    // Remove non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Auto-insert hyphen after 4th character
    if (cleaned.length <= 4) {
      setInviteCode(cleaned);
    } else {
      setInviteCode(`${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`);
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
  // Unseen rejections should be shown prominently
  const unseenRejections = requests.filter(
    (r) => r.status === 'REJECTED' && !r.seenAt
  );
  // Processed requests exclude unseen rejections (they get their own section)
  const processedRequests = requests
    .filter((r) => r.status !== 'PENDING' && !(r.status === 'REJECTED' && !r.seenAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Unseen Rejections - shown prominently at top */}
      {unseenRejections.length > 0 && (
        <div className="space-y-3">
          {unseenRejections.map((request) => (
            <RejectionNotice key={request.id} request={request} />
          ))}
        </div>
      )}

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
            {canCreateClub && (
              <Button asChild size="sm">
                <Link href="/clubs/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Verein erstellen
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ClubListSkeleton />
          ) : clubs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Du bist noch keinem Verein zugeordnet.
            </div>
          ) : (
            <div className="divide-y border rounded-lg">
              {clubs.map((club) => (
                <div
                  key={club.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Avatar */}
                  <ClubAvatar
                    name={club.name}
                    avatarInitials={club.avatarInitials}
                    avatarColor={club.avatarColor}
                    size="md"
                  />

                  {/* Name + Role (clickable) */}
                  <button
                    onClick={() => handleSwitchToClub(club)}
                    className="flex-1 min-w-0 text-left hover:text-primary transition-colors"
                  >
                    <div className="font-medium truncate">{club.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatRoles(club.roles)}
                      {club.slug === activeClubSlug && (
                        <Badge variant="outline" className="text-xs ml-2">
                          Aktiv
                        </Badge>
                      )}
                    </div>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSwitchToClub(club)}
                      title="Zum Verein"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleLeaveClub(club)}
                      disabled={club.roles.includes('OWNER')}
                      title={club.roles.includes('OWNER') ? 'Verantwortliche können nicht austreten' : 'Verein verlassen'}
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
              onChange={(e) => handleInviteCodeChange(e.target.value)}
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

      {/* Leave Club Confirmation Dialog */}
      <Dialog
        open={!!leaveConfirmClub}
        onOpenChange={(open) => {
          if (!open) {
            setLeaveConfirmClub(null);
            setLeaveConfirmInput('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verein verlassen</DialogTitle>
            <DialogDescription>
              Möchtest du &quot;{leaveConfirmClub?.name}&quot; wirklich verlassen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="leave-confirm" className="text-sm font-medium">
              Gib <span className="font-mono font-semibold">VERLASSEN</span> ein, um zu bestätigen:
            </label>
            <Input
              id="leave-confirm"
              value={leaveConfirmInput}
              onChange={(e) => setLeaveConfirmInput(e.target.value)}
              placeholder="VERLASSEN"
              className="mt-2"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLeaveConfirmClub(null);
                setLeaveConfirmInput('');
              }}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmLeave}
              disabled={!isLeaveConfirmValid}
            >
              Verein verlassen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Skeleton for club list
 */
function ClubListSkeleton() {
  return (
    <div className="divide-y border rounded-lg" data-testid="club-list-skeleton">
      <div className="flex items-center gap-3 p-3">
        <Skeleton className="h-10 w-10 rounded-md shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
