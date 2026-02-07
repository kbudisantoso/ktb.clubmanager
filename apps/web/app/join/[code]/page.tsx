'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSessionQuery } from '@/hooks/use-session';
import { useClubStore } from '@/lib/club-store';
import { useJoinClubMutation } from '@/hooks/use-clubs';
import { Loader2, CheckCircle, XCircle, Building2, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

type JoinState = 'loading' | 'success' | 'error' | 'login-required';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSessionQuery();
  const { setActiveClub } = useClubStore();
  const joinClub = useJoinClubMutation();

  const [state, setState] = useState<JoinState>('loading');

  const code = params.code as string;

  useEffect(() => {
    if (sessionLoading) return;

    if (!session?.user) {
      setState('login-required');
      return;
    }

    // User is logged in - if we were waiting for login, reset to loading to trigger join
    if (state === 'login-required') {
      setState('loading');
      return;
    }

    // Only join once
    if (state === 'loading' && !joinClub.isPending && !joinClub.isSuccess && !joinClub.isError) {
      joinClub.mutate(code, {
        onSuccess: (data) => {
          setState('success');
          if (data.club?.slug) {
            setActiveClub(data.club.slug);
          }
        },
        onError: () => {
          setState('error');
        },
      });
    }
  }, [session, sessionLoading, code, state, joinClub, setActiveClub]);

  function handleGoToClub() {
    if (joinClub.data?.club?.slug) {
      router.push(`/clubs/${joinClub.data.club.slug}/dashboard`);
    } else {
      router.push('/dashboard');
    }
  }

  function handleLoginRedirect() {
    // Store the join URL to redirect back after login
    const callbackUrl = encodeURIComponent(`/join/${code}`);
    router.push(`/login?callbackUrl=${callbackUrl}`);
  }

  if (sessionLoading || (state === 'loading' && !joinClub.isError)) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Verarbeite Einladung...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'login-required') {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-2 text-primary" />
            <CardTitle>Einladung zu einem Verein</CardTitle>
            <CardDescription>
              Du hast eine Einladung erhalten. Melde dich an oder registriere dich, um dem Verein
              beizutreten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleLoginRedirect} className="w-full">
              Anmelden
            </Button>
            <Link href={`/register?callbackUrl=/join/${code}`}>
              <Button variant="outline" className="w-full">
                Registrieren
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'error' || joinClub.isError) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 mx-auto mb-2 text-destructive" />
            <CardTitle>Einladung fehlgeschlagen</CardTitle>
            <CardDescription>
              {joinClub.error?.message || 'Netzwerkfehler. Bitte versuche es erneut.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Zum Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'success' && joinClub.data) {
    const { status, message, club } = joinClub.data;

    // Already a member - can go directly to club
    if (status === 'already_member') {
      return (
        <div className="container mx-auto px-4 py-12 max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
              <CardTitle>Bereits Mitglied</CardTitle>
              <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {club && (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="font-medium">{club.name}</p>
                </div>
              )}
              <Button onClick={handleGoToClub} className="w-full">
                Zum Verein
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Request sent or already pending - needs admin approval
    if (status === 'request_sent' || status === 'pending') {
      const isNewRequest = status === 'request_sent';
      return (
        <div className="container mx-auto px-4 py-12 max-w-md">
          <Card>
            <CardHeader className="text-center">
              {isNewRequest ? (
                <Clock className="h-12 w-12 mx-auto mb-2 text-warning" />
              ) : (
                <Info className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              )}
              <CardTitle>{isNewRequest ? 'Anfrage gesendet' : 'Anfrage ausstehend'}</CardTitle>
              <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {club && (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="font-medium">{club.name}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground text-center">
                Du wirst benachrichtigt, sobald ein Administrator die Anfrage bearbeitet hat.
              </p>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="w-full"
              >
                Zum Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Fallback (should not happen)
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
            <CardTitle>Erfolgreich</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Zum Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
