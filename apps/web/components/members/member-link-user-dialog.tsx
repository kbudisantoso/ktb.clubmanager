'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Search, UserCheck, UserX, Link2Off } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLinkableUsers, useLinkMember } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';
import type { MemberDetail } from '@/hooks/use-member-detail';
import type { LinkableUser } from '@/hooks/use-members';

// ============================================================================
// Types
// ============================================================================

interface MemberLinkUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberDetail;
}

// ============================================================================
// Match Scoring
// ============================================================================

function computeMatchScore(
  user: LinkableUser,
  memberEmail: string | null,
  memberFirstName: string,
  memberLastName: string
): number {
  // Exact email match
  if (memberEmail && user.email.toLowerCase() === memberEmail.toLowerCase()) {
    return 100;
  }

  // Name matching against user.name
  const userName = (user.name ?? '').toLowerCase();
  const first = memberFirstName.toLowerCase();
  const last = memberLastName.toLowerCase();
  const fullName = `${first} ${last}`;
  const fullNameReversed = `${last} ${first}`;
  const lastCommaFirst = `${last}, ${first}`;

  if (userName === fullName || userName === fullNameReversed || userName === lastCommaFirst) {
    return 50;
  }

  if (userName.includes(first) || userName.includes(last)) {
    return 25;
  }

  return 0;
}

// ============================================================================
// Component
// ============================================================================

export function MemberLinkUserDialog({ open, onOpenChange, member }: MemberLinkUserDialogProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();

  const { data, isLoading } = useLinkableUsers(slug, open ? member.id : undefined);
  const linkMember = useLinkMember(slug, member.id);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isLinked = !!member.userId;

  // Score and sort users
  const scoredUsers = useMemo(() => {
    if (!data) return [];
    return data.users
      .map((user) => ({
        ...user,
        matchScore: computeMatchScore(
          user,
          data.member.email,
          data.member.firstName,
          data.member.lastName
        ),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [data]);

  // Filter by search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return scoredUsers;
    const q = search.toLowerCase();
    return scoredUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [scoredUsers, search]);

  // Auto-select best match on open
  useEffect(() => {
    if (!open) {
      setSelectedUserId(null);
      setSearch('');
      return;
    }
    if (scoredUsers.length > 0 && scoredUsers[0].matchScore >= 100) {
      setSelectedUserId(scoredUsers[0].userId);
    }
  }, [open, scoredUsers]);

  const handleLink = useCallback(async () => {
    if (!selectedUserId) return;
    try {
      await linkMember.mutateAsync(selectedUserId);
      toast({ title: 'Benutzerkonto verknüpft' });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Verknüpfung fehlgeschlagen',
        variant: 'destructive',
      });
    }
  }, [selectedUserId, linkMember, toast, onOpenChange]);

  const handleUnlink = useCallback(async () => {
    try {
      await linkMember.mutateAsync(null);
      toast({ title: 'Verknüpfung aufgehoben' });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Aufheben fehlgeschlagen',
        variant: 'destructive',
      });
    }
  }, [linkMember, toast, onOpenChange]);

  // Find currently linked user info
  const linkedUser = useMemo(() => {
    if (!isLinked || !data) return null;
    // The linked user may not be in the linkable list (they're already linked)
    // But the API includes currentLink, so we can check all club users
    return data.users.find((u) => u.userId === member.userId) ?? null;
  }, [isLinked, data, member.userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isLinked ? 'Benutzerkonto bearbeiten' : 'Benutzerkonto verknüpfen'}
          </DialogTitle>
          <DialogDescription>
            {isLinked
              ? 'Aktuelle Verknüpfung bearbeiten oder aufheben.'
              : 'Verknüpfe dieses Mitglied mit einem App-Benutzerkonto.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Currently linked user */}
          {isLinked && (
            <div className="flex items-center gap-3 rounded-md border border-success/25 bg-success/5 p-3">
              <UserCheck className="h-4 w-4 text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{linkedUser?.name ?? 'Verknüpfter Benutzer'}</p>
                {linkedUser?.email && (
                  <p className="text-xs text-muted-foreground truncate">{linkedUser.email}</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUnlink}
                disabled={linkMember.isPending}
              >
                {linkMember.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link2Off className="h-3.5 w-3.5" />
                )}
                Aufheben
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Benutzer suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6 text-muted-foreground">
              <UserX className="h-8 w-8" />
              <p className="text-sm">
                {search ? 'Keine Benutzer gefunden' : 'Keine verfügbaren Benutzer'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filteredUsers.map((user) => (
                <button
                  key={user.userId}
                  type="button"
                  className={`w-full flex items-center gap-3 rounded-md border p-2.5 text-left transition-colors ${
                    selectedUserId === user.userId
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedUserId(user.userId)}
                >
                  <Avatar className="h-8 w-8">
                    {user.image && <AvatarImage src={user.image} />}
                    <AvatarFallback className="text-xs">
                      {(user.name ?? '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {user.matchScore >= 100 && (
                    <span className="text-xs text-success font-medium shrink-0">E-Mail Match</span>
                  )}
                  {user.matchScore >= 25 && user.matchScore < 100 && (
                    <span className="text-xs text-muted-foreground shrink-0">Name ähnlich</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleLink}
            disabled={!selectedUserId || linkMember.isPending}
          >
            {linkMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verknüpfen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
