'use client';

import { useCallback, useState } from 'react';
import {
  DateField,
  DateInput as AriaDateInput,
  DateSegment,
  I18nProvider,
} from 'react-aria-components';
import { parseDate, type CalendarDate } from '@internationalized/date';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DateInputProps {
  /** ISO date string YYYY-MM-DD */
  value?: string;
  /** Called with ISO date string or undefined */
  onChange: (value?: string) => void;
  disabled?: boolean;
  /** Show error styling (destructive border) */
  hasError?: boolean;
  /** Earliest selectable year for calendar dropdown */
  fromYear?: number;
  /** Latest selectable year for calendar dropdown */
  toYear?: number;
  className?: string;
}

function DateInput({
  value,
  onChange,
  disabled,
  hasError,
  fromYear = 1920,
  toYear,
  className,
}: DateInputProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Convert ISO string to CalendarDate for React Aria
  let calendarDate: CalendarDate | null = null;
  try {
    if (value) calendarDate = parseDate(value);
  } catch {
    calendarDate = null;
  }

  const handleAriaChange = useCallback(
    (date: CalendarDate | null) => {
      onChange(date ? date.toString() : undefined);
    },
    [onChange]
  );

  const handleCalendarSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
      } else {
        onChange(undefined);
      }
      setPopoverOpen(false);
    },
    [onChange]
  );

  const effectiveToYear = toYear ?? new Date().getFullYear() + 5;

  return (
    <I18nProvider locale="de-DE">
      <div className={cn('flex', className)}>
        <DateField value={calendarDate} onChange={handleAriaChange} isDisabled={disabled}>
          <AriaDateInput
            className={cn(
              'border-input flex h-9 w-full items-center rounded-l-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] md:text-sm',
              'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
              hasError && 'border-destructive ring-destructive/20',
              disabled && 'pointer-events-none cursor-not-allowed opacity-50'
            )}
          >
            {(segment) => (
              <DateSegment
                segment={segment}
                className={cn(
                  'rounded px-0.5 tabular-nums caret-transparent outline-none',
                  'data-[placeholder]:text-muted-foreground',
                  'data-[focused]:bg-accent data-[focused]:text-accent-foreground',
                  'data-[type=literal]:text-muted-foreground'
                )}
              />
            )}
          </AriaDateInput>
        </DateField>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              className="h-9 shrink-0 rounded-l-none border-l-0"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              captionLayout="dropdown"
              fromYear={fromYear}
              toYear={effectiveToYear}
              selected={value ? new Date(value + 'T00:00:00') : undefined}
              onSelect={handleCalendarSelect}
              defaultMonth={value ? new Date(value + 'T00:00:00') : undefined}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </I18nProvider>
  );
}

export { DateInput };
export type { DateInputProps };
