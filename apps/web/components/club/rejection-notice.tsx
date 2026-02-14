'use client';

import { Info, X, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  useMarkRequestSeenMutation,
  type AccessRequest,
  type AccessRejectionReason,
} from '@/hooks/use-clubs';

interface RejectionNoticeProps {
  request: AccessRequest;
  onRetry?: () => void;
}

/**
 * User-friendly rejection reason messages.
 * Positive, appreciative wording from the platform's perspective.
 */
const REJECTION_MESSAGES: Record<AccessRejectionReason, { title: string; message: string }> = {
  BOARD_ONLY: {
    title: 'Zugang eingeschränkt',
    message:
      'Der Verein hat den Zugang derzeit auf Vorstandsmitglieder beschränkt. Falls du zum Vorstand gehörst, wende dich bitte direkt an den Verein.',
  },
  UNIDENTIFIED: {
    title: 'Zuordnung nicht möglich',
    message:
      'Der Verein konnte deine Anfrage leider keiner bekannten Person zuordnen. Vielleicht hilft es, wenn du dich direkt beim Verein meldest.',
  },
  WRONG_CLUB: {
    title: 'Anderer Verein gesucht?',
    message:
      'Der Verein vermutet, dass du nach einem anderen Verein gesucht hast. Vielleicht gibt es einen Verein mit ähnlichem Namen in deiner Nähe?',
  },
  CONTACT_DIRECTLY: {
    title: 'Direkter Kontakt gewünscht',
    message:
      'Der Verein würde gerne direkt mit dir in Kontakt treten. Bitte melde dich bei deinem Ansprechpartner im Verein.',
  },
  OTHER: {
    title: 'Anfrage nicht bestätigt',
    message: 'Der Verein konnte deine Anfrage leider nicht bestätigen.',
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function RejectionNotice({ request, onRetry }: RejectionNoticeProps) {
  const markSeenMutation = useMarkRequestSeenMutation();

  const reason = request.rejectionReason || 'OTHER';
  const reasonInfo = REJECTION_MESSAGES[reason];

  async function handleDismiss() {
    await markSeenMutation.mutateAsync(request.id);
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback
              className="text-sm"
              style={{
                backgroundColor: request.club.avatarColor || '#6366f1',
                color: '#fff',
              }}
            >
              {request.club.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              {reasonInfo.title}
            </CardTitle>
            <CardDescription className="mt-1">
              Anfrage bei <span className="font-medium">{request.club.name}</span> vom{' '}
              {formatDate(request.createdAt)}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            disabled={markSeenMutation.isPending}
            title="Hinweis schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">{reasonInfo.message}</p>
        {request.rejectionNote && (
          <p className="text-sm text-muted-foreground mb-3 italic border-l-2 border-amber-300 pl-3">
            Hinweis vom Verein: "{request.rejectionNote}"
          </p>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-900">
          <p className="text-xs text-muted-foreground">
            Du kannst jederzeit eine neue Anfrage stellen.
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Erneut anfragen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
