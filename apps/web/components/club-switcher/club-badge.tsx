'use client';

import Link from 'next/link';
import { useActiveClub } from '@/lib/club-store';
import { ClubAvatar } from './club-avatar';
import { cn } from '@/lib/utils';

interface ClubBadgeProps {
  className?: string;
}

/**
 * Displays the active club name as a badge in the header.
 * Clicking navigates to the club dashboard.
 * Returns null if no club is active.
 */
export function ClubBadge({ className }: ClubBadgeProps) {
  const activeClub = useActiveClub();

  if (!activeClub) {
    return null;
  }

  return (
    <Link
      href={`/clubs/${activeClub.slug}/dashboard`}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-primary/10 hover:bg-primary/15 transition-colors',
        'text-sm font-medium text-foreground',
        className
      )}
      title={`${activeClub.name} - Zum Dashboard`}
    >
      <ClubAvatar club={activeClub} size="xs" />
      <span className="hidden sm:inline max-w-[150px] truncate">{activeClub.name}</span>
    </Link>
  );
}
