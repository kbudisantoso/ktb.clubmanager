'use client';

import { CalendarIcon, CheckIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Generate year options from current year down to current year - 5 */
function getYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => String(currentYear - i));
}

interface MemberFilterPeriodProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Period/year filter popover for membership year filtering.
 * Shows 6 year options (current year down to current year - 5).
 * Clicking an active year deselects it (shows all).
 */
export function MemberFilterPeriod({ value, onChange }: MemberFilterPeriodProps) {
  const years = getYearOptions();

  function toggleYear(year: string) {
    if (value === year) {
      onChange('');
    } else {
      onChange(year);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <CalendarIcon className="mr-1 size-3.5" />
          Zeitraum
          {value && <span className="text-muted-foreground ml-1 font-normal">: {value}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {years.map((year) => {
                const isSelected = value === year;
                return (
                  <CommandItem key={year} value={year} onSelect={() => toggleYear(year)}>
                    <div
                      className={cn(
                        'border-primary mr-2 flex size-4 items-center justify-center rounded-full border',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className="size-3" />
                    </div>
                    {year}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
