'use client';

import { CheckIcon, HomeIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useHouseholds } from '@/hooks/use-households';

/** Meta-option values for household filtering */
const META_OPTIONS = [
  { value: 'HAS', label: 'Mit Haushalt' },
  { value: 'NONE', label: 'Ohne Haushalt' },
] as const;

interface MemberFilterHouseholdProps {
  value: string;
  onChange: (value: string) => void;
  slug: string;
}

/**
 * Household filter popover with meta-options and specific household selection.
 * Supports "Mit Haushalt" / "Ohne Haushalt" meta-filters and individual household IDs.
 */
export function MemberFilterHousehold({ value, onChange, slug }: MemberFilterHouseholdProps) {
  const { data: households, isLoading } = useHouseholds(slug);

  // Parse current selection — could be 'HAS', 'NONE', or comma-separated household IDs
  const selectedIds = value && value !== 'HAS' && value !== 'NONE' ? value.split(',') : [];
  const isMeta = value === 'HAS' || value === 'NONE';

  function selectMeta(metaValue: string) {
    if (value === metaValue) {
      onChange('');
    } else {
      onChange(metaValue);
    }
  }

  function toggleHousehold(householdId: string) {
    // If a meta-option is active, switch to specific household selection
    const currentIds = isMeta ? [] : [...selectedIds];
    const index = currentIds.indexOf(householdId);
    if (index >= 0) {
      currentIds.splice(index, 1);
    } else {
      currentIds.push(householdId);
    }
    onChange(currentIds.join(','));
  }

  /** Display label for the trigger button */
  function getTriggerLabel(): string | null {
    if (value === 'HAS') return 'Mit Haushalt';
    if (value === 'NONE') return 'Ohne Haushalt';
    if (selectedIds.length === 1 && households) {
      const h = households.find((hh) => hh.id === selectedIds[0]);
      return h?.name ?? null;
    }
    if (selectedIds.length > 1) return `${selectedIds.length} Haushalte`;
    return null;
  }

  const triggerLabel = getTriggerLabel();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <HomeIcon className="mr-1 size-3.5" />
          Haushalt
          {triggerLabel && (
            <span className="text-muted-foreground ml-1 font-normal">: {triggerLabel}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Haushalt suchen..." />
          <CommandList>
            <CommandEmpty>Kein Haushalt gefunden.</CommandEmpty>
            <CommandGroup heading="Allgemein">
              {META_OPTIONS.map((option) => {
                const isSelected = value === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => selectMeta(option.value)}
                  >
                    <div
                      className={cn(
                        'border-primary mr-2 flex size-4 items-center justify-center rounded-sm border',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className="size-3" />
                    </div>
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {isLoading && (
              <CommandGroup heading="Haushalte">
                <div className="space-y-1 p-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              </CommandGroup>
            )}
            {!isLoading && households && households.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Haushalte">
                  {households.map((household) => {
                    const isSelected = selectedIds.includes(household.id);
                    return (
                      <CommandItem
                        key={household.id}
                        value={household.name}
                        onSelect={() => toggleHousehold(household.id)}
                      >
                        <div
                          className={cn(
                            'border-primary mr-2 flex size-4 items-center justify-center rounded-sm border',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'opacity-50 [&_svg]:invisible'
                          )}
                        >
                          <CheckIcon className="size-3" />
                        </div>
                        <span className="truncate">{household.name}</span>
                        <span className="text-muted-foreground ml-auto text-xs">
                          {household.members.length}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
