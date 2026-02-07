'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionQuery } from '@/hooks/use-session';
import { useClubStore } from '@/lib/club-store';
import {
  useMyClubsQuery,
  useMyAccessRequestsQuery,
  useCancelAccessRequestMutation,
} from '@/hooks/use-clubs';
import { RejectionNotice } from '@/components/club/rejection-notice';
import { Building2, Key, ArrowRight, Loader2, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSessionQuery();
  const { data, isLoading: isLoadingClubs } = useMyClubsQuery();
  const { clubs = [], canCreateClub = false } = data ?? {};
  const { activeClubSlug, setActiveClub } = useClubStore();
  const { data: accessRequests = [], isLoading: isLoadingRequests } = useMyAccessRequestsQuery();
  const cancelRequest = useCancelAccessRequestMutation();

  const [codePart1, setCodePart1] = useState('');
  const [codePart2, setCodePart2] = useState('');
  const part1Ref = useRef<HTMLInputElement>(null);
  const part2Ref = useRef<HTMLInputElement>(null);

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

  function handleCodePart1Change(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const value = input.value;
    const cursorPos = input.selectionStart ?? value.length;

    // Clean the input (don't slice yet - we need full length to detect overflow)
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Calculate cursor position in cleaned string
    const beforeCursor = value.slice(0, cursorPos);
    const cleanedCursorPos = beforeCursor.replace(/[^a-zA-Z0-9]/g, '').length;

    // Block input if total is already 8 and user is trying to add characters
    const currentTotal = codePart1.length + codePart2.length;
    if (currentTotal === 8 && cleaned.length > codePart1.length) {
      // Calculate original cursor position (before the added characters)
      const charsAdded = cleaned.length - codePart1.length;
      const pos = Math.max(0, cleanedCursorPos - charsAdded);
      // Use queueMicrotask for immediate cursor restoration (faster than setTimeout)
      queueMicrotask(() => {
        input.setSelectionRange(pos, pos);
      });
      return;
    }

    // Calculate available space (max 8 chars total)
    const maxAllowedInField1 = 8 - codePart2.length;
    const cappedCleaned = cleaned.slice(0, maxAllowedInField1);

    // Detect if content shrunk (deletion or selection replacement)
    const contentShrunk = cappedCleaned.length < codePart1.length;

    if (contentShrunk && codePart2.length > 0) {
      // Pull characters from part 2 to fill the gap
      const combined = cappedCleaned + codePart2;
      setCodePart1(combined.slice(0, 4));
      setCodePart2(combined.slice(4));

      // Keep cursor at the position where change happened
      const newCursorPos = Math.min(cleanedCursorPos, combined.slice(0, 4).length);
      requestAnimationFrame(() => {
        input.setSelectionRange(newCursorPos, newCursorPos);
      });
    } else if (cappedCleaned.length > 4) {
      // Overflow - push excess characters to field 2
      const newPart1 = cappedCleaned.slice(0, 4);
      const overflow = cappedCleaned.slice(4);
      // Prepend overflow to field 2, cap at 4 chars total
      const newPart2 = (overflow + codePart2).slice(0, 4);

      setCodePart1(newPart1);
      setCodePart2(newPart2);

      // Handle cursor position - if cursor was beyond position 4, move to field 2
      requestAnimationFrame(() => {
        if (cleanedCursorPos <= 4) {
          input.setSelectionRange(cleanedCursorPos, cleanedCursorPos);
        } else {
          // Move focus to field 2 and position cursor after the overflow chars
          part2Ref.current?.focus();
          const field2Pos = cleanedCursorPos - 4;
          part2Ref.current?.setSelectionRange(field2Pos, field2Pos);
        }
      });
    } else {
      setCodePart1(cappedCleaned);

      // Only auto-advance if we reached 4 chars by typing at the end
      const isAddition = cappedCleaned.length > codePart1.length;
      // Detect "typed at end" by checking if new value starts with old value
      const wasTypedAtEnd = isAddition && cappedCleaned.startsWith(codePart1);

      if (cappedCleaned.length === 4 && wasTypedAtEnd) {
        // Use requestAnimationFrame to focus after React has re-rendered
        requestAnimationFrame(() => {
          part2Ref.current?.focus();
          part2Ref.current?.setSelectionRange(0, 0);
        });
      } else if (cleanedCursorPos < cappedCleaned.length) {
        // Restore cursor position if not at the end
        requestAnimationFrame(() => {
          input.setSelectionRange(cleanedCursorPos, cleanedCursorPos);
        });
      }
    }
  }

  function handleCodePart2Change(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const value = input.value;
    const cursorPos = input.selectionStart ?? value.length;

    // Clean the input
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Calculate cursor position in cleaned string
    const beforeCursor = value.slice(0, cursorPos);
    const cleanedCursorPos = beforeCursor.replace(/[^a-zA-Z0-9]/g, '').length;

    // Block input if total is already 8 and user is trying to add characters
    const currentTotal = codePart1.length + codePart2.length;
    if (currentTotal === 8 && cleaned.length > codePart2.length) {
      // Calculate original cursor position (before the added characters)
      const charsAdded = cleaned.length - codePart2.length;
      const pos = Math.max(0, cleanedCursorPos - charsAdded);
      // Use queueMicrotask for immediate cursor restoration (faster than setTimeout)
      queueMicrotask(() => {
        input.setSelectionRange(pos, pos);
      });
      return;
    }

    // If field 1 is not full, redirect input there first
    if (codePart1.length < 4) {
      const spaceInField1 = 4 - codePart1.length;
      const forField1 = cleaned.slice(0, spaceInField1);
      const forField2 = cleaned.slice(spaceInField1, spaceInField1 + 4);

      setCodePart1(codePart1 + forField1);
      setCodePart2(forField2);

      // Move focus to field 1 and position cursor
      requestAnimationFrame(() => {
        part1Ref.current?.focus();
        const newPos = codePart1.length + forField1.length;
        part1Ref.current?.setSelectionRange(newPos, newPos);
      });
    } else {
      // Field 1 is full, handle field 2 normally
      const maxAllowed = 4; // Field 2 can have max 4 chars
      const cappedCleaned = cleaned.slice(0, maxAllowed);

      const newCursorPos = Math.min(cleanedCursorPos, cappedCleaned.length);

      setCodePart2(cappedCleaned);

      // Restore cursor position if not at the end
      if (newCursorPos < cappedCleaned.length) {
        requestAnimationFrame(() => {
          input.setSelectionRange(newCursorPos, newCursorPos);
        });
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pastedText = e.clipboardData.getData('text');
    // Remove any non-alphanumeric characters (including hyphens) and uppercase
    const cleaned = pastedText.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // If pasted content is a full code (8 chars), split across both fields
    if (cleaned.length >= 8) {
      e.preventDefault();
      setCodePart1(cleaned.slice(0, 4));
      setCodePart2(cleaned.slice(4, 8));
      part2Ref.current?.focus();
    } else if (cleaned.length > 4) {
      // Partial paste that spans both fields
      e.preventDefault();
      setCodePart1(cleaned.slice(0, 4));
      setCodePart2(cleaned.slice(4));
      part2Ref.current?.focus();
    }
    // If 4 or less chars, let the normal onChange handle it
  }

  function handleJoinWithCode() {
    const fullCode = codePart1 + codePart2;
    if (fullCode.length === 8) {
      router.push(`/join/${codePart1}-${codePart2}`);
    }
  }

  function handlePart1KeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && codePart1.length + codePart2.length === 8) {
      handleJoinWithCode();
    }

    // Arrow right at end of field 1 (no selection) → move to start of field 2
    if (e.key === 'ArrowRight') {
      const input = e.target as HTMLInputElement;
      const selectionStart = input.selectionStart ?? 0;
      const selectionEnd = input.selectionEnd ?? 0;
      const hasSelection = selectionStart !== selectionEnd;

      if (selectionStart === codePart1.length && !hasSelection) {
        e.preventDefault();
        part2Ref.current?.focus();
        part2Ref.current?.setSelectionRange(0, 0);
      }
    }
  }

  function handlePart2Focus() {
    // If field 1 is not full, redirect focus to field 1
    if (codePart1.length < 4) {
      part1Ref.current?.focus();
      // Position cursor at the end of field 1
      requestAnimationFrame(() => {
        part1Ref.current?.setSelectionRange(codePart1.length, codePart1.length);
      });
    }
  }

  function handlePart2KeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && codePart1.length + codePart2.length === 8) {
      handleJoinWithCode();
    }

    const input = e.target as HTMLInputElement;
    const selectionStart = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? 0;
    const hasSelection = selectionStart !== selectionEnd;

    // Arrow left at start of field 2 (no selection) → move to end of field 1
    if (e.key === 'ArrowLeft' && selectionStart === 0 && !hasSelection) {
      e.preventDefault();
      part1Ref.current?.focus();
      const endPos = codePart1.length;
      part1Ref.current?.setSelectionRange(endPos, endPos);
    }

    // Backspace at the beginning of field 2 (no selection) → delete last char from field 1
    // If there's a selection, let the default behavior delete the selected text
    if (e.key === 'Backspace' && codePart1.length > 0 && selectionStart === 0 && !hasSelection) {
      e.preventDefault();

      // Delete last char from field 1 and rebalance
      const newPart1Content = codePart1.slice(0, -1);
      const combined = newPart1Content + codePart2;

      setCodePart1(combined.slice(0, 4));
      setCodePart2(combined.slice(4));

      // Move cursor to where we deleted (end of original field 1 content minus 1)
      requestAnimationFrame(() => {
        part1Ref.current?.focus();
        const newCursorPos = newPart1Content.length;
        part1Ref.current?.setSelectionRange(newCursorPos, newCursorPos);
      });
    }
  }

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
            {canCreateClub
              ? 'Du bist noch keinem Verein zugeordnet. Erstelle einen neuen Verein oder tritt einem bestehenden bei.'
              : 'Du bist noch keinem Verein zugeordnet. Tritt einem Verein bei, indem du einen Einladungscode eingibst.'}
          </p>
        </div>

        {/* Pending access requests */}
        {pendingRequests.length > 0 && (
          <Card className="mb-6">
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

        <div className={`grid gap-6 ${canCreateClub ? 'md:grid-cols-2' : 'max-w-md mx-auto'}`}>
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Input
                  ref={part1Ref}
                  placeholder="XXXX"
                  value={codePart1}
                  onChange={handleCodePart1Change}
                  onKeyDown={handlePart1KeyDown}
                  onPaste={handlePaste}
                  className="font-mono text-lg tracking-wider w-[9ch] px-[2.1ch] box-border"
                  autoComplete="off"
                />
                <span className="text-xl font-mono text-muted-foreground">-</span>
                <Input
                  ref={part2Ref}
                  placeholder="XXXX"
                  value={codePart2}
                  onChange={handleCodePart2Change}
                  onKeyDown={handlePart2KeyDown}
                  onFocus={handlePart2Focus}
                  onPaste={handlePaste}
                  className="font-mono text-lg tracking-wider w-[9ch] px-[2.1ch] box-border"
                  autoComplete="off"
                />
              </div>
              <Button
                onClick={handleJoinWithCode}
                variant="outline"
                className="w-full gap-2"
                disabled={codePart1.length + codePart2.length < 8}
              >
                Code einlösen
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Multiple clubs - show selector (should rarely reach here due to auto-redirect)
  if (clubs.length > 1 && !activeClubSlug) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Verein auswählen</h1>
          <p className="text-muted-foreground">
            Wähle den Verein aus, mit dem du arbeiten möchtest.
          </p>
        </div>

        <div className="space-y-4">
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
                  {club.avatarInitials || club.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{club.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {club.roles.map((r) => r.toLowerCase()).join(', ')}
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
