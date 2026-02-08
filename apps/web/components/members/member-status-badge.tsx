'use client';

import { cn } from '@/lib/utils';

/** Member status values matching the backend enum */
type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'LEFT';

/** Status configuration with German labels and semantic styling */
const STATUS_CONFIG: Record<MemberStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Aktiv',
    className: 'bg-success/15 text-success border-success/25',
  },
  INACTIVE: {
    label: 'Inaktiv',
    className: 'bg-warning/15 text-warning-foreground border-warning/25',
  },
  PENDING: {
    label: 'Ausstehend',
    className: 'bg-accent/15 text-accent-foreground border-accent/25',
  },
  LEFT: {
    label: 'Ausgetreten',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

interface MemberStatusBadgeProps {
  /** The member status to display */
  status: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Color-coded status badge for members.
 * Displays German labels with semantic colors.
 */
export function MemberStatusBadge({ status, className }: MemberStatusBadgeProps) {
  const config = STATUS_CONFIG[status as MemberStatus] ?? {
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

export type { MemberStatus };
