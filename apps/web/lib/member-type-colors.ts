import type { MemberTypeColor } from '@ktb/shared';

/**
 * CSS class sets for each MemberTypeColor enum value.
 * Uses CSS custom properties defined in globals.css with light/dark mode variants.
 */
const TYPE_COLOR_CLASSES: Record<MemberTypeColor, { bg: string; text: string; border: string }> = {
  BLUE: {
    bg: 'bg-type-blue/10',
    text: 'text-type-blue',
    border: 'border-type-blue/25',
  },
  GREEN: {
    bg: 'bg-type-green/10',
    text: 'text-type-green',
    border: 'border-type-green/25',
  },
  PURPLE: {
    bg: 'bg-type-purple/10',
    text: 'text-type-purple',
    border: 'border-type-purple/25',
  },
  AMBER: {
    bg: 'bg-type-amber/10',
    text: 'text-type-amber',
    border: 'border-type-amber/25',
  },
  ROSE: {
    bg: 'bg-type-rose/10',
    text: 'text-type-rose',
    border: 'border-type-rose/25',
  },
  TEAL: {
    bg: 'bg-type-teal/10',
    text: 'text-type-teal',
    border: 'border-type-teal/25',
  },
  SLATE: {
    bg: 'bg-type-slate/10',
    text: 'text-type-slate',
    border: 'border-type-slate/25',
  },
  INDIGO: {
    bg: 'bg-type-indigo/10',
    text: 'text-type-indigo',
    border: 'border-type-indigo/25',
  },
};

/** Default color when none specified */
const DEFAULT_COLOR: MemberTypeColor = 'BLUE';

/**
 * Get Tailwind CSS classes for a membership type badge.
 * Returns bg, text, and border classes for the given color enum value.
 */
export function getTypeColorClasses(color: string | null | undefined) {
  const key = (color ?? DEFAULT_COLOR) as MemberTypeColor;
  return TYPE_COLOR_CLASSES[key] ?? TYPE_COLOR_CLASSES[DEFAULT_COLOR];
}
