'use client';

import { cn } from '@/lib/utils';

/** User status values matching the ClubUser status field */
type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

/** Status configuration with German labels and semantic styling */
const STATUS_CONFIG: Record<UserStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Aktiv',
    className: 'bg-success/15 text-success border-success/25',
  },
  PENDING: {
    label: 'Eingeladen',
    className: 'bg-warning/15 text-warning-foreground border-warning/25',
  },
  SUSPENDED: {
    label: 'Gesperrt',
    className: 'bg-destructive/15 text-destructive border-destructive/25',
  },
};

interface UserStatusBadgeProps {
  /** The user status to display */
  status: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Color-coded status badge for club users.
 * Displays German labels with semantic colors.
 */
export function UserStatusBadge({ status, className }: UserStatusBadgeProps) {
  const config = STATUS_CONFIG[status as UserStatus] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export type { UserStatus };
