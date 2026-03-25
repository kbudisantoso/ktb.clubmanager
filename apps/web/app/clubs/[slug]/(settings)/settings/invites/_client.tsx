'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Copy, Check, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useClubSettings,
  useRegenerateInviteCode,
  useClearInviteCode,
} from '@/hooks/use-club-settings';
import { useToast } from '@/hooks/use-toast';

export function InvitesContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data: club, isLoading } = useClubSettings(slug);
  const regenerate = useRegenerateInviteCode(slug);
  const clear = useClearInviteCode(slug);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inviteCode = club?.inviteCode || '';
  const hasCode = !!inviteCode;
  const isMutating = regenerate.isPending || clear.isPending;

  async function handleCopy() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyLink() {
    if (!inviteCode || typeof window === 'undefined') return;
    const link = `${window.location.origin}/join/${encodeURIComponent(inviteCode)}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleRegenerate() {
    try {
      await regenerate.mutateAsync();
      toast({ title: 'Einladungscode erneuert' });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    }
  }

  async function handleClear() {
    try {
      await clear.mutateAsync();
      toast({ title: 'Einladungscode entfernt' });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Einladungscode</CardTitle>
          <CardDescription>
            {hasCode
              ? 'Teile diesen Code oder den Einladungslink, um neue Mitglieder einzuladen.'
              : 'Erstelle einen Einladungscode, damit neue Mitglieder deinem Verein beitreten können.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Code input + actions */}
          <div className="flex items-center gap-2">
            <Input
              value={inviteCode}
              readOnly
              placeholder="Kein Einladungscode vorhanden"
              className="font-mono text-center tracking-wider max-w-[200px]"
            />
            {hasCode && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                title="Code kopieren"
                disabled={isMutating}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRegenerate}
              title={hasCode ? 'Code erneuern' : 'Code erstellen'}
              disabled={isMutating}
            >
              {regenerate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            {hasCode && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Code entfernen"
                    disabled={isMutating}
                  >
                    {clear.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Einladungscode entfernen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Der aktuelle Einladungscode wird ungültig. Bereits eingeladene Mitglieder sind
                      nicht betroffen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClear}>Entfernen</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Invite link */}
          {hasCode && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground truncate flex-1">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/join/${encodeURIComponent(inviteCode)}`
                  : `/join/${encodeURIComponent(inviteCode)}`}
              </p>
              <Button variant="ghost" size="sm" onClick={handleCopyLink}>
                {copiedLink ? (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Kopiert
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3" />
                    Link kopieren
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
