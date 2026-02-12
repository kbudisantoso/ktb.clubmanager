'use client';

import { User, Building2 } from 'lucide-react';
import { type Control, useController } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface PersonTypeToggleProps {
  /** react-hook-form control from parent form */
  control: Control<{ personType: string; [key: string]: unknown }>;
  /** Field name in the form (default: 'personType') */
  name?: string;
  /** Whether the toggle is disabled */
  disabled?: boolean;
}

const OPTIONS = [
  {
    value: 'NATURAL',
    label: 'Natürliche Person',
    icon: User,
  },
  {
    value: 'LEGAL_ENTITY',
    label: 'Juristische Person',
    icon: Building2,
  },
] as const;

/**
 * Toggle switch for selecting person type (NATURAL vs LEGAL_ENTITY).
 * Integrates with react-hook-form via Controller.
 * Renders as a segmented control with icons and German labels.
 */
export function PersonTypeToggle({
  control,
  name = 'personType',
  disabled = false,
}: PersonTypeToggleProps) {
  const {
    field: { value, onChange },
  } = useController({
    name: name as 'personType',
    control,
  });

  return (
    <div className="flex gap-2">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
