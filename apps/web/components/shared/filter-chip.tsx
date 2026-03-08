'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

interface FilterChipProps {
  /** Text label for the chip */
  label: string;
  /** Optional icon to display before the label */
  icon?: ReactNode;
  /** Called when the remove button is clicked */
  onRemove: (e: React.MouseEvent) => void;
}

/**
 * Reusable filter chip with label and remove button.
 * Used in active filter rows to show and dismiss individual filters.
 */
export function FilterChip({ icon, label, onRemove }: FilterChipProps) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      {icon}
      <span className="max-w-[200px] truncate">{label}</span>
      <button
        type="button"
        className="ring-offset-background focus:ring-ring hover:bg-muted-foreground/20 ml-0.5 rounded-full p-0.5 outline-none focus:ring-2 focus:ring-offset-1"
        onClick={onRemove}
        aria-label={`Filter entfernen: ${label}`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}
