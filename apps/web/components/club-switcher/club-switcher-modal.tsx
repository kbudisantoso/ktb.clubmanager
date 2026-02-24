'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Check, Plus } from 'lucide-react';
import { useClubStore, useMyClubs } from '@/lib/club-store';
import { ClubAvatar } from './club-avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ClubSwitcherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCreateClub?: boolean;
}

/**
 * Modal dialog for switching between clubs.
 * Shows search field when user has 5+ clubs.
 */
export function ClubSwitcherModal({
  open,
  onOpenChange,
  canCreateClub = false,
}: ClubSwitcherModalProps) {
  const router = useRouter();
  const clubs = useMyClubs();
  const { activeClubSlug, setActiveClub } = useClubStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter clubs by search
  const filteredClubs = searchQuery
    ? clubs.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : clubs;

  // Show search when 5+ clubs
  const showSearch = clubs.length >= 5;

  function handleSelectClub(slug: string) {
    setActiveClub(slug);
    onOpenChange(false);
    router.push(`/clubs/${slug}/dashboard`);
  }

  function handleCreateClub() {
    onOpenChange(false);
    router.push('/clubs/new');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verein wechseln</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search field (for 5+ clubs) */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Verein suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          )}

          {/* Club list */}
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {filteredClubs.map((club) => {
              const isActive = club.slug === activeClubSlug;

              return (
                <button
                  key={club.id}
                  onClick={() => handleSelectClub(club.slug)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                  )}
                >
                  <ClubAvatar club={club} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{club.name}</div>
                  </div>
                  {club.deactivatedAt && (
                    <Badge variant="destructive" className="ml-auto shrink-0 text-xs">
                      Wird gelöscht
                    </Badge>
                  )}
                  {isActive && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}

            {filteredClubs.length === 0 && searchQuery && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Keine Vereine gefunden
              </div>
            )}
          </div>

          {/* Create new club */}
          {canCreateClub && (
            <>
              <div className="border-t" />
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleCreateClub}
              >
                <Plus className="h-4 w-4" />
                Neuen Verein erstellen
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
