'use client';

import { Home } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

/** German labels for household roles */
const HOUSEHOLD_ROLE_LABELS: Record<string, string> = {
  HEAD: 'Hauptkontakt',
  SPOUSE: 'Ehepartner',
  CHILD: 'Kind',
  OTHER: 'Sonstige',
};

// ============================================================================
// Types
// ============================================================================

interface HouseholdMemberInfo {
  id: string;
  firstName: string;
  lastName: string;
  householdRole: string | null;
}

interface HouseholdBadgeProps {
  /** Household name (e.g., "Fam. Mustermann") */
  name: string;
  /** Household ID */
  householdId: string;
  /** Members in the household (for tooltip) */
  members?: HouseholdMemberInfo[];
  /** Called when badge is clicked */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Compact household badge for display in member table and detail views.
 * Shows household name with Home icon, tooltip lists members with roles.
 * Clickable to open household management.
 */
export function HouseholdBadge({
  name,
  householdId: _householdId,
  members = [],
  onClick,
  className,
}: HouseholdBadgeProps) {
  const badge = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs',
        'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
        'transition-colors cursor-pointer border border-transparent hover:border-border',
        className
      )}
    >
      <Home className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-32">{name}</span>
    </button>
  );

  // If no members info, just show the badge without tooltip
  if (members.length === 0) {
    return badge;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-64">
          <p className="font-medium text-xs mb-1">{name}</p>
          <ul className="space-y-0.5">
            {members.map((m) => (
              <li key={m.id} className="text-xs flex items-center gap-1.5">
                <span>
                  {m.firstName} {m.lastName}
                </span>
                {m.householdRole && (
                  <span className="text-muted-foreground">
                    ({HOUSEHOLD_ROLE_LABELS[m.householdRole] ?? m.householdRole})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export type { HouseholdBadgeProps, HouseholdMemberInfo };
