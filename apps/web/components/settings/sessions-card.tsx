'use client';

import { Loader2, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSessions,
  useRevokeSession,
  useRevokeAllOtherSessions,
  type SessionInfo,
} from '@/hooks/use-security';

// ============================================================================
// Helpers
// ============================================================================

function isMobileDevice(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /Mobile|Android|iPhone|iPad/i.test(userAgent);
}

function parseBrowserAndOs(userAgent: string | null): string {
  if (!userAgent) return 'Unbekanntes Geraet';

  let browser = 'Unbekannter Browser';
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edg')) browser = 'Edge';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';

  let os = '';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS') || userAgent.includes('Macintosh')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  return os ? `${browser} auf ${os}` : browser;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays === 1) return 'Gestern';
  return `vor ${diffDays} Tagen`;
}

// ============================================================================
// Session row
// ============================================================================

function SessionRow({
  session,
  onRevoke,
  isRevoking,
}: {
  session: SessionInfo;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}) {
  const isMobile = isMobileDevice(session.userAgent);
  const Icon = isMobile ? Smartphone : Monitor;
  const description = parseBrowserAndOs(session.userAgent);

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{description}</span>
            {session.isCurrent && <Badge variant="secondary">Aktuelle Sitzung</Badge>}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {session.ipAddress && <span>{session.ipAddress}</span>}
            <span>{formatRelativeTime(session.createdAt)}</span>
          </div>
        </div>
      </div>
      {!session.isCurrent && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRevoke(session.id)}
          disabled={isRevoking}
        >
          {isRevoking && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          Beenden
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function SessionsCard() {
  const { data: sessions, isLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeAll = useRevokeAllOtherSessions();

  const otherSessionCount = sessions?.filter((s) => !s.isCurrent).length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktive Sitzungen</CardTitle>
        <CardDescription>Geraete, auf denen du angemeldet bist</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" data-testid="sessions-skeleton">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="divide-y">
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onRevoke={(id) => revokeSession.mutate(id)}
                isRevoking={revokeSession.isPending && revokeSession.variables === session.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine aktiven Sitzungen gefunden</p>
        )}
      </CardContent>
      {otherSessionCount > 0 && (
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => revokeAll.mutate()}
            disabled={revokeAll.isPending}
          >
            {revokeAll.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Alle anderen Sitzungen beenden
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
