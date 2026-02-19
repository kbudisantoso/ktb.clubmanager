'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

/**
 * Palette of avatar background colors.
 * Deterministic selection via hash of member ID.
 */
const AVATAR_PALETTE = [
  'bg-[oklch(var(--avatar-1))]',
  'bg-[oklch(var(--avatar-2))]',
  'bg-[oklch(var(--avatar-3))]',
  'bg-[oklch(var(--avatar-4))]',
  'bg-[oklch(var(--avatar-5))]',
  'bg-[oklch(var(--avatar-6))]',
  'bg-[oklch(var(--avatar-7))]',
  'bg-[oklch(var(--avatar-8))]',
] as const;

/** Size presets for different usage contexts */
const SIZE_CLASSES = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-sm',
} as const;

interface MemberAvatarProps {
  /** Member ID for deterministic color selection */
  memberId: string;
  /** First name (for NATURAL person type) */
  firstName?: string;
  /** Last name (for NATURAL person type) */
  lastName?: string;
  /** Organization name (for LEGAL_ENTITY person type) */
  organizationName?: string | null;
  /** Person type to determine initials strategy */
  personType?: string;
  /** Avatar size: sm (28px), md (40px), lg (56px) */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** URL of linked user's profile image */
  imageUrl?: string | null;
}

/**
 * Member avatar with image support and initials fallback.
 * When imageUrl is provided, displays the user's profile image.
 * Otherwise, shows colored initials based on member ID hash.
 */
export function MemberAvatar({
  memberId,
  firstName,
  lastName,
  organizationName,
  personType = 'NATURAL',
  size = 'sm',
  className,
  imageUrl,
}: MemberAvatarProps) {
  const initials = getInitials(personType, firstName, lastName, organizationName);
  const colorIndex = hashToIndex(memberId, AVATAR_PALETTE.length);
  const bgColor = AVATAR_PALETTE[colorIndex];
  const title =
    personType === 'LEGAL_ENTITY'
      ? (organizationName ?? '')
      : `${firstName ?? ''} ${lastName ?? ''}`.trim();

  if (imageUrl) {
    return (
      <Avatar className={cn(SIZE_CLASSES[size], 'shrink-0', className)}>
        <AvatarImage src={imageUrl} alt={title} />
        <AvatarFallback className={cn(bgColor, 'text-white font-medium')}>
          {initials}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-white font-medium shrink-0',
        SIZE_CLASSES[size],
        bgColor,
        className
      )}
      title={title}
    >
      {initials}
    </div>
  );
}

/**
 * Generate initials based on person type.
 * NATURAL: first letter of firstName + lastName (e.g., "MM" for Max Mustermann)
 * LEGAL_ENTITY: first 2 characters of organizationName
 */
function getInitials(
  personType: string,
  firstName?: string,
  lastName?: string,
  organizationName?: string | null
): string {
  if (personType === 'LEGAL_ENTITY' && organizationName) {
    return organizationName.slice(0, 2).toUpperCase();
  }

  const first = firstName?.[0] ?? '';
  const last = lastName?.[0] ?? '';

  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  if (last) return last.toUpperCase();
  return '?';
}

/**
 * Simple hash function to deterministically map a string to an index.
 */
function hashToIndex(str: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash) % max;
}
