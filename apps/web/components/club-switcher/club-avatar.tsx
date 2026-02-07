'use client';

import { cn } from '@/lib/utils';

/**
 * Preset colors for club avatars.
 */
const AVATAR_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
  cyan: 'bg-cyan-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-500',
};

interface ClubData {
  name: string;
  avatarUrl?: string;
  avatarInitials?: string;
  avatarColor?: string;
}

interface ClubAvatarProps {
  /** Club object with avatar data */
  club?: ClubData;
  /** Direct props (used if club is not provided) */
  avatarUrl?: string;
  avatarInitials?: string;
  avatarColor?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Club avatar component showing either an image or initials with color.
 */
export function ClubAvatar({
  club,
  avatarUrl: directAvatarUrl,
  avatarInitials: directAvatarInitials,
  avatarColor: directAvatarColor = 'blue',
  name: directName,
  size = 'md',
  className,
}: ClubAvatarProps) {
  // Use club prop values if provided, otherwise fall back to direct props
  const avatarUrl = club?.avatarUrl ?? directAvatarUrl;
  const avatarInitials = club?.avatarInitials ?? directAvatarInitials;
  const avatarColor = club?.avatarColor ?? directAvatarColor;
  const name = club?.name ?? directName ?? '';

  const sizeClasses = {
    xs: 'h-6 w-6 text-[8px]',
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-12 w-12 text-sm',
  };

  const bgColor = AVATAR_COLORS[avatarColor] || AVATAR_COLORS.blue;

  // Generate initials from name if not provided, limit to 3 chars
  const initials = (avatarInitials || generateInitials(name)).slice(0, 3);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn('rounded-md object-cover', sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md text-white font-medium',
        sizeClasses[size],
        bgColor,
        className
      )}
      title={name}
    >
      {initials}
    </div>
  );
}

function generateInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    // Take first letter of up to 3 words (e.g., "Western Club Dakota" → "WCD")
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
