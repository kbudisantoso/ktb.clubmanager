'use client';

import { ChevronDown } from 'lucide-react';
import {
  VALID_TRANSITIONS,
  NAMED_TRANSITIONS,
  PRIMARY_STATUS_ACTION,
  type MemberStatus,
  type NamedTransition,
} from '@ktb/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/format-date';
import type { MemberDetail } from '@/hooks/use-member-detail';

// ============================================================================
// Types
// ============================================================================

interface MemberStatusActionsProps {
  /** Full member data */
  member: MemberDetail;
  /** Called when a status transition is selected */
  onTransition: (targetStatus: MemberStatus, namedTransition: NamedTransition) => void;
  /** Called when "Kuendigung erfassen" is selected */
  onRecordCancellation?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

/** Statuses that support recording a cancellation (not a status change) */
const CANCELLATION_STATUSES: readonly string[] = ['ACTIVE', 'PROBATION', 'DORMANT', 'SUSPENDED'];

/**
 * Build the list of available transitions for a given status,
 * split into primary, non-destructive secondary, and destructive secondary.
 */
function buildTransitionActions(currentStatus: MemberStatus) {
  const allTargets = VALID_TRANSITIONS[currentStatus] ?? [];
  const primaryTarget = PRIMARY_STATUS_ACTION[currentStatus];

  const primary =
    primaryTarget != null
      ? {
          target: primaryTarget,
          transition: NAMED_TRANSITIONS[`${currentStatus}-${primaryTarget}`],
        }
      : null;

  const secondary: { target: MemberStatus; transition: NamedTransition }[] = [];
  const destructive: { target: MemberStatus; transition: NamedTransition }[] = [];

  for (const target of allTargets) {
    if (target === primaryTarget) continue;
    const key = `${currentStatus}-${target}`;
    const transition = NAMED_TRANSITIONS[key];
    if (!transition) continue;

    if (transition.destructive) {
      destructive.push({ target, transition });
    } else {
      secondary.push({ target, transition });
    }
  }

  return { primary, secondary, destructive };
}

// ============================================================================
// Component
// ============================================================================

/**
 * Variante C status actions: primary action button + dropdown for secondary actions.
 * ACTIVE has no primary action (PRIMARY_STATUS_ACTION has no ACTIVE entry),
 * so it renders only a dropdown with trigger "Aktionen".
 */
export function MemberStatusActions({
  member,
  onTransition,
  onRecordCancellation,
}: MemberStatusActionsProps) {
  const currentStatus = member.status as MemberStatus;
  const { primary, secondary, destructive } = buildTransitionActions(currentStatus);
  const hasCancellation = !!member.cancellationDate && member.status !== 'LEFT';
  const canRecordCancellation = CANCELLATION_STATUSES.includes(member.status);

  const hasDropdownItems =
    secondary.length > 0 || destructive.length > 0 || canRecordCancellation || hasCancellation;

  // No actions available at all (shouldn't happen with 22-transition state machine, but safe)
  if (!primary && !hasDropdownItems) {
    return null;
  }

  const dropdownContent = (
    <DropdownMenuContent align="end">
      {/* Non-destructive secondary transitions */}
      {secondary.map(({ target, transition }) => (
        <DropdownMenuItem key={target} onClick={() => onTransition(target, transition)}>
          {transition.action}
        </DropdownMenuItem>
      ))}

      {/* Cancellation section */}
      {canRecordCancellation && onRecordCancellation && (
        <>
          {secondary.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={onRecordCancellation}>Kuendigung erfassen</DropdownMenuItem>
        </>
      )}

      {/* Active cancellation notice */}
      {hasCancellation && (
        <>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-warning-foreground">
            Kuendigung zum {formatDate(member.cancellationDate!)}
          </div>
        </>
      )}

      {/* Destructive transitions below separator */}
      {destructive.length > 0 && (
        <>
          <DropdownMenuSeparator />
          {destructive.map(({ target, transition }) => (
            <DropdownMenuItem
              key={target}
              variant="destructive"
              onClick={() => onTransition(target, transition)}
            >
              {transition.action}
            </DropdownMenuItem>
          ))}
        </>
      )}
    </DropdownMenuContent>
  );

  // ACTIVE has no primary action — show "Aktionen" dropdown trigger only
  if (!primary) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Aktionen
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        {dropdownContent}
      </DropdownMenu>
    );
  }

  // Other statuses: primary button + dropdown for the rest
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        onClick={() => onTransition(primary.target, primary.transition)}
      >
        {primary.transition.action}
      </Button>
      {hasDropdownItems && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="px-2">
              <ChevronDown className="h-3.5 w-3.5" />
              <span className="sr-only">Weitere Aktionen</span>
            </Button>
          </DropdownMenuTrigger>
          {dropdownContent}
        </DropdownMenu>
      )}
    </div>
  );
}
