'use client';

import { CheckIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { type MemberStatus, MEMBER_STATUSES } from '@/hooks/use-member-filters';

/** German labels for each status value */
const STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: 'Aktiv',
  PROBATION: 'Probezeit',
  DORMANT: 'Ruhend',
  SUSPENDED: 'Gesperrt',
  PENDING: 'Mitgliedschaft beantragt',
  LEFT: 'Ausgetreten',
};

interface MemberFilterStatusProps {
  selected: MemberStatus[];
  onSelectionChange: (statuses: MemberStatus[]) => void;
}

/**
 * Multi-select status filter using Popover + Command pattern.
 * Shows checkboxes for each member status with German labels.
 */
export function MemberFilterStatus({ selected, onSelectionChange }: MemberFilterStatusProps) {
  function toggleStatus(status: MemberStatus) {
    if (selected.includes(status)) {
      onSelectionChange(selected.filter((s) => s !== status));
    } else {
      onSelectionChange([...selected, status]);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          Status
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 rounded-sm px-1 font-normal">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {MEMBER_STATUSES.map((status) => {
                const isSelected = selected.includes(status);
                return (
                  <CommandItem key={status} value={status} onSelect={() => toggleStatus(status)}>
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
                    {STATUS_LABELS[status]}
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
