'use client';

import { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DataTableSearchProps {
  /** Current search value */
  value: string;
  /** Called when the search value changes */
  onChange: (value: string) => void;
  /** Placeholder text for the search input */
  placeholder: string;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Reusable search input for data tables.
 * Includes magnifying glass icon and clear button.
 * Debouncing is handled by the parent via useDebounce hook.
 */
export function DataTableSearch({ value, onChange, placeholder, className }: DataTableSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('relative max-w-sm', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Suche löschen"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
