'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionQuery } from '@/hooks/use-session';
import { useClubStore } from '@/lib/club-store';
import {
  useMyClubsQuery,
  useMyAccessRequestsQuery,
  useCancelAccessRequestMutation,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '@/hooks/use-clubs';
import { RejectionNotice } from '@/components/club/rejection-notice';
import { PageHeader } from '@/components/layout/page-header';
import { Building2, Key, ArrowRight, Loader2, Clock, X, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InviteCodeInput } from '@/components/club/invite-code-input';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSessionQuery();
  const { data, isLoading: isLoadingClubs } = useMyClubsQuery();
  const { clubs = [], pendingInvitations = [], canCreateClub = false } = data ?? {};
  const { activeClubSlug, setActiveClub } = useClubStore();
  const { data: accessRequests = [], isLoading: isLoadingRequests } = useMyAccessRequestsQuery();
  const cancelRequest = useCancelAccessRequestMutation();
  const acceptInvitation = useAcceptInvitationMutation();
  const declineInvitation = useDeclineInvitationMutation();

  // Filter for pending requests only
  const pendingRequests = accessRequests.filter((r) => r.status === 'PENDING');
  // Unseen rejections should be shown prominently
  const unseenRejections = accessRequests.filter((r) => r.status === 'REJECTED' && !r.seenAt);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push('/login');
    }
  }, [session, sessionLoading, router]);

  // Auto-redirect to active club if set
  useEffect(() => {
    if (!isLoadingClubs && activeClubSlug && clubs.length > 0) {
      const club = clubs.find((c) => c.slug === activeClubSlug);
      if (club) {
        router.push(`/clubs/${club.slug}/dashboard`);
      }
    }
  }, [isLoadingClubs, activeClubSlug, clubs, router]);

  // Auto-select single club
  useEffect(() => {
    if (!isLoadingClubs && clubs.length === 1 && !activeClubSlug) {
      setActiveClub(clubs[0].slug);
      router.push(`/clubs/${clubs[0].slug}/dashboard`);
    }
  }, [isLoadingClubs, clubs, activeClubSlug, setActiveClub, router]);

  function handleCreateClub() {
    router.push('/clubs/new');
  }

  function handleCancelRequest(requestId: string) {
    cancelRequest.mutate(requestId);
  }

  if (sessionLoading || isLoadingClubs || isLoadingRequests) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No clubs empty state
  if (clubs.length === 0) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          {/* Unseen Rejections - shown prominently at top */}
          {unseenRejections.length > 0 && (
            <div className="mb-6 space-y-3">
              {unseenRejections.map((request) => (
                <RejectionNotice key={request.id} request={request} />
              ))}
            </div>
          )}

          <div className="text-center mb-8">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Willkommen bei ktb.clubmanager</h1>
            <p className="text-muted-foreground">
              Du bist noch keinem Verein zugeordnet.
              <br />
              {canCreateClub
                ? 'Erstelle einen neuen Verein, nimm eine Einladung an oder tritt mit einem Code bei.'
                : 'Nimm eine Einladung an oder tritt mit einem Einladungscode bei.'}
            </p>
          </div>

          <div className="space-y-6">
            {/* Pending club invitations */}
            {pendingInvitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Einladungen
                  </CardTitle>
                  <CardDescription>Du wurdest in folgende Vereine eingeladen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-sm">
                          {invitation.club.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{invitation.club.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Eingeladen am{' '}
                            {new Date(invitation.createdAt).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={declineInvitation.isPending || acceptInvitation.isPending}
                          onClick={() => declineInvitation.mutate(invitation.id)}
                        >
                          Ablehnen
                        </Button>
                        <Button
                          size="sm"
                          disabled={acceptInvitation.isPending || declineInvitation.isPending}
                          onClick={() => {
                            acceptInvitation.mutate(invitation.id, {
                              onSuccess: () => {
                                setActiveClub(invitation.club.slug);
                                router.push(`/clubs/${invitation.club.slug}/dashboard`);
                              },
                            });
                          }}
                        >
                          Annehmen
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Pending access requests */}
            {pendingRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    Offene Beitrittsanfragen
                  </CardTitle>
                  <CardDescription>
                    Diese Anfragen warten auf Genehmigung durch einen Administrator.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-sm">
                          {request.club.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{request.club.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Angefragt am {new Date(request.createdAt).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Ausstehend</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancelRequest(request.id)}
                          disabled={cancelRequest.isPending}
                          title="Anfrage zurückziehen"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Create club card - only show if allowed */}
            {canCreateClub && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Verein erstellen
                  </CardTitle>
                  <CardDescription>
                    Starte mit einem neuen Verein und lade Mitglieder ein.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleCreateClub} className="w-full gap-2">
                    Verein erstellen
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Join with code card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Einladungscode
                </CardTitle>
                <CardDescription>
                  Du hast einen Einladungscode erhalten? Gib ihn hier ein.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InviteCodeInput />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Multiple clubs - show selector (should rarely reach here due to auto-redirect)
  if (clubs.length > 1 && !activeClubSlug) {
    return (
      <div>
        <PageHeader
          title="Verein auswählen"
          description="Wähle den Verein aus, mit dem du arbeiten möchtest."
        />
        <div className="container mx-auto px-4 max-w-2xl space-y-4">
          {clubs.map((club) => (
            <Card
              key={club.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => {
                setActiveClub(club.slug);
                router.push(`/clubs/${club.slug}/dashboard`);
              }}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
                  {club.shortCode || club.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{club.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {(club.roles ?? []).map((r) => r.toLowerCase()).join(', ')}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Fallback loading state (during redirect)
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
