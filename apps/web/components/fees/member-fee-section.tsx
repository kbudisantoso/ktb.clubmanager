'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronsUpDown, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { FeeChargeStatusBadge } from '@/components/fees/fee-charge-status-badge';
import { FeeOverrideDialog } from '@/components/fees/fee-override-dialog';
import { useMemberFeeCharges } from '@/hooks/use-fee-charges';
import { useFeeOverrides } from '@/hooks/use-fee-overrides';

// ============================================================================
// Types
// ============================================================================

interface MemberFeeSectionProps {
  slug: string;
  memberId: string;
  memberName: string;
}

// ============================================================================
// Helpers
// ============================================================================

const moneyFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

const OVERRIDE_TYPE_LABELS: Record<string, string> = {
  EXEMPT: 'Befreit',
  CUSTOM_AMOUNT: 'Individuell',
  ADDITIONAL: 'Zusatz',
};

// ============================================================================
// Component
// ============================================================================

/**
 * Collapsible section showing recent open charges for a member.
 *
 * Per UI-SPEC Member Detail Integration layout:
 * - Shows up to 3 most recent open/overdue charges sorted by dueDate ASC
 * - Link to pre-filtered fees page
 * - Override management access via dialog
 * - Loading: skeleton with 3 row placeholders
 * - Empty: "Keine offenen Forderungen"
 */
export function MemberFeeSection({ slug, memberId, memberName }: MemberFeeSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const { data: charges, isLoading: chargesLoading } = useMemberFeeCharges(slug, memberId);
  const { data: overrides } = useFeeOverrides(slug, memberId);

  // Listen for expand event from the badge click
  const handleExpand = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.addEventListener('expand-fee-section', handleExpand);
    return () => el.removeEventListener('expand-fee-section', handleExpand);
  }, [handleExpand]);

  // Filter and sort open/overdue charges: oldest overdue first
  const openCharges = useMemo(() => {
    if (!charges?.length) return [];
    return charges
      .filter((c) => c.status !== 'PAID')
      .sort((a, b) => {
        // Overdue first, then by dueDate ASC (oldest first)
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [charges]);

  const displayCharges = openCharges.slice(0, 3);
  const remainingCount = openCharges.length - displayCharges.length;

  const overrideCount = overrides?.length ?? 0;

  return (
    <div id="member-fee-section" ref={sectionRef} className="rounded-md border bg-muted/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/80 transition-colors rounded-t-md"
          >
            <span className="text-sm font-semibold">Offene Beitraege</span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* Loading state */}
            {chargesLoading && (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}

            {/* Empty state */}
            {!chargesLoading && openCharges.length === 0 && (
              <p className="text-sm text-muted-foreground">Keine offenen Forderungen</p>
            )}

            {/* Charge rows */}
            {!chargesLoading && displayCharges.length > 0 && (
              <div className="space-y-2">
                {displayCharges.map((charge) => (
                  <div
                    key={charge.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate min-w-0">{charge.description}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="tabular-nums text-right">
                        {moneyFormatter.format(parseFloat(charge.remainingAmount))} EUR
                      </span>
                      <FeeChargeStatusBadge status={charge.status} isOverdue={charge.isOverdue} />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(charge.dueDate)}
                      </span>
                    </div>
                  </div>
                ))}

                {remainingCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    und {remainingCount} weitere...
                  </p>
                )}
              </div>
            )}

            {/* Override summary */}
            {overrideCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {overrideCount} Anpassung{overrideCount !== 1 ? 'en' : ''}
                </span>
                {overrides?.map((o) => (
                  <Badge key={o.id} variant="outline" className="text-xs">
                    {OVERRIDE_TYPE_LABELS[o.overrideType] ?? o.overrideType}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <Link
                href={`/clubs/${slug}/fees?tab=forderungen&memberId=${memberId}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Beitragshistorie anzeigen
                <ChevronRight className="h-3 w-3" />
              </Link>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOverrideDialogOpen(true)}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Anpassungen verwalten
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Override dialog */}
      <FeeOverrideDialog
        slug={slug}
        memberId={memberId}
        memberName={memberName}
        open={overrideDialogOpen}
        onOpenChange={setOverrideDialogOpen}
      />
    </div>
  );
}
