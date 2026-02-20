'use client';

import { useState, useMemo, useCallback } from 'react';
import { Loader2, Search, Users } from 'lucide-react';
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
import { apiFetch } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { memberKeys } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Types
// ============================================================================

interface MemberPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  userId: string;
  userName: string;
}

interface PickableMember {
  id: string;
  firstName: string;
  lastName: string;
  memberNumber: string;
  email: string | null;
  userImage: string | null;
  userId: string | null;
}

// ============================================================================
// Component
// ============================================================================

export function MemberPickerDialog({
  open,
  onOpenChange,
  slug,
  userId,
  userName,
}: MemberPickerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Fetch members that are unlinked (no userId set)
  const { data: members, isLoading } = useQuery<PickableMember[]>({
    queryKey: [...memberKeys.all(slug), 'pickable-members'],
    queryFn: async () => {
      // Fetch all members, we'll filter client-side for unlinked ones
      const res = await apiFetch(`/api/clubs/${slug}/members?limit=100`);
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Mitglieder');
      }
      const data = await res.json();
      // Filter to only unlinked members
      return (data.items ?? []).filter((m: PickableMember) => !m.userId);
    },
    enabled: open,
    staleTime: 15_000,
  });

  // Filter by search
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.memberNumber.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q))
    );
  }, [members, search]);

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setSelectedMemberId(null);
        setSearch('');
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  const handleLink = useCallback(async () => {
    if (!selectedMemberId) return;

    setIsLinking(true);
    try {
      const res = await apiFetch(`/api/clubs/${slug}/members/${selectedMemberId}/link-user`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Verknüpfung fehlgeschlagen');
      }

      toast({ title: 'Verknüpfung erstellt' });
      queryClient.invalidateQueries({ queryKey: memberKeys.all(slug) });
      handleOpenChange(false);
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Verknüpfung fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
    }
  }, [selectedMemberId, slug, userId, toast, queryClient, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mitglied verknüpfen mit {userName}</DialogTitle>
          <DialogDescription>
            Wähle ein bestehendes Mitglied, das mit dem Benutzerkonto verknüpft werden soll.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mitglied suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Member list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6 text-muted-foreground">
              <Users className="h-8 w-8" />
              <p className="text-sm">
                {search ? 'Keine Mitglieder gefunden' : 'Keine verfügbaren Mitglieder'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={`w-full flex items-center gap-3 rounded-md border p-2.5 text-left transition-colors ${
                    selectedMemberId === member.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedMemberId(member.id)}
                >
                  <Avatar className="h-8 w-8">
                    {member.userImage && <AvatarImage src={member.userImage} />}
                    <AvatarFallback className="text-xs">
                      {`${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.memberNumber}
                      {member.email && ` · ${member.email}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Abbrechen
          </Button>
          <Button type="button" onClick={handleLink} disabled={!selectedMemberId || isLinking}>
            {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verknüpfen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
