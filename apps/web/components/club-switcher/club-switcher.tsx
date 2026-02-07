'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus, Search, Building2 } from 'lucide-react';
import { useClubStore, type ClubContext } from '@/lib/club-store';
import { useMyClubsQuery } from '@/hooks/use-clubs';
import { ClubAvatar } from './club-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Role display configuration (German labels)
 */
const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Verantwortlicher',
  ADMIN: 'Admin',
  TREASURER: 'Kassenwart',
  SECRETARY: 'Schriftführer',
  MEMBER: 'Mitglied',
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  TREASURER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SECRETARY: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  MEMBER: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

/**
 * Role priority for display (lower = higher priority)
 */
const ROLE_PRIORITY: Record<string, number> = {
  OWNER: 0,
  ADMIN: 1,
  TREASURER: 2,
  SECRETARY: 3,
  MEMBER: 4,
};

/**
 * Get the primary (highest priority) role from a list of roles
 */
function getPrimaryRole(roles: string[]): string {
  if (roles.length === 0) return 'MEMBER';
  return roles.reduce((primary, role) =>
    (ROLE_PRIORITY[role] ?? 99) < (ROLE_PRIORITY[primary] ?? 99) ? role : primary
  );
}

interface ClubSwitcherProps {
  className?: string;
}

/**
 * Club switcher dropdown for the header.
 * Shows current club and allows switching between clubs.
 */
export function ClubSwitcher({ className }: ClubSwitcherProps) {
  const router = useRouter();
  const { data, isLoading } = useMyClubsQuery();
  const { clubs = [], canCreateClub = false } = data ?? {};
  const { activeClubSlug, setActiveClub } = useClubStore();

  const [searchQuery, setSearchQuery] = useState('');

  // Get active club object
  const activeClub = clubs.find((c) => c.slug === activeClubSlug);

  // Filter clubs by search
  const filteredClubs = searchQuery
    ? clubs.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : clubs;

  // Show search when 5+ clubs
  const showSearch = clubs.length >= 5;

  function handleSelectClub(club: ClubContext) {
    setActiveClub(club.slug);
    router.push(`/clubs/${club.slug}/dashboard`);
  }

  function handleCreateClub() {
    router.push('/clubs/new');
  }

  // No clubs state
  if (clubs.length === 0 && !isLoading) {
    if (!canCreateClub) {
      return (
        <div className={cn('text-sm text-muted-foreground', className)}>Kein Verein zugeordnet</div>
      );
    }
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateClub}
        className={cn('gap-2', className)}
      >
        <Plus className="h-4 w-4" />
        Verein erstellen
      </Button>
    );
  }

  // Single club - don't show anything in header (name shown as page title)
  if (clubs.length === 1) {
    return null;
  }

  // Multiple clubs - show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2 min-w-[200px] justify-between', className)}
        >
          {activeClub ? (
            <div className="flex items-center gap-2">
              <ClubAvatar
                name={activeClub.name}
                avatarUrl={activeClub.avatarUrl}
                avatarInitials={activeClub.avatarInitials}
                avatarColor={activeClub.avatarColor}
                size="sm"
              />
              <span className="truncate max-w-[120px]">{activeClub.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Verein auswählen</span>
            </div>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[280px]">
        {showSearch && (
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Verein suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        )}

        <div className="max-h-[300px] overflow-y-auto">
          {filteredClubs.map((club) => (
            <DropdownMenuItem
              key={club.id}
              onClick={() => handleSelectClub(club)}
              className={cn(
                'flex items-center gap-3 p-3 cursor-pointer',
                club.slug === activeClubSlug && 'bg-accent'
              )}
            >
              <ClubAvatar
                name={club.name}
                avatarUrl={club.avatarUrl}
                avatarInitials={club.avatarInitials}
                avatarColor={club.avatarColor}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{club.name}</div>
                <Badge
                  variant="secondary"
                  className={cn('text-xs mt-1', ROLE_COLORS[getPrimaryRole(club.roles)])}
                >
                  {ROLE_LABELS[getPrimaryRole(club.roles)] || getPrimaryRole(club.roles)}
                </Badge>
              </div>
            </DropdownMenuItem>
          ))}

          {filteredClubs.length === 0 && searchQuery && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Keine Vereine gefunden
            </div>
          )}
        </div>

        {canCreateClub && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateClub} className="gap-2">
              <Plus className="h-4 w-4" />
              Neuen Verein erstellen
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
