'use client';

import { Badge } from '@/components/ui/badge';

/** German labels for club roles */
export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Verantwortlicher',
  ADMIN: 'Admin',
  TREASURER: 'Kassierer',
  SECRETARY: 'Schriftführer',
  MEMBER: 'Mitglied',
};

interface UserRoleBadgesProps {
  /** Array of role strings (e.g. ['OWNER', 'ADMIN']) */
  roles: string[];
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Displays club user roles as a row of secondary badges.
 * All roles use neutral/secondary color (no semantic colors per role).
 */
export function UserRoleBadges({ roles, className }: UserRoleBadgesProps) {
  if (roles.length === 0) return <span className="text-muted-foreground">-</span>;

  return (
    <div className={className ?? 'flex flex-wrap gap-1'}>
      {roles.map((role) => (
        <Badge key={role} variant="secondary">
          {ROLE_LABELS[role] ?? role}
        </Badge>
      ))}
    </div>
  );
}
