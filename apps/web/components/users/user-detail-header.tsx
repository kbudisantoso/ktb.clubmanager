'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusBadge } from './user-status-badge';

interface UserDetailHeaderProps {
  name: string;
  email: string;
  image?: string;
  status: string;
  isSelf: boolean;
}

/**
 * Header for the user detail panel.
 * Shows avatar, name, email, and status badge.
 */
export function UserDetailHeader({ name, email, image, status, isSelf }: UserDetailHeaderProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-start gap-3">
      <Avatar className="h-12 w-12 shrink-0">
        {image && <AvatarImage src={image} alt={name} />}
        <AvatarFallback className="text-sm">{initials || '?'}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 space-y-1">
        <h2 className="text-lg font-semibold truncate">
          {name}
          {isSelf && <span className="text-sm font-normal text-muted-foreground ml-1">(Du)</span>}
        </h2>
        <p className="text-sm text-muted-foreground truncate">{email}</p>
        <UserStatusBadge status={status} />
      </div>
    </div>
  );
}
