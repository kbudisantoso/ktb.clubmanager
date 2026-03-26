'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useMemberFeeCharges } from '@/hooks/use-fee-charges';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface MemberFeeBadgeProps {
  slug: string;
  memberId: string;
}

// ============================================================================
// Helpers
// ============================================================================

const moneyFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// ============================================================================
// Component
// ============================================================================

/**
 * Compact fee status badge for the member detail header.
 *
 * Display logic per UI-SPEC IC-05:
 * - No open/overdue charges: hidden (return null)
 * - Open charges (not overdue): muted badge with count and total
 * - Any overdue charge: destructive badge with count and total
 *
 * Badge hidden during loading (no skeleton for inline badge per UI-SPEC).
 * Click scrolls to #member-fee-section and opens the collapsible.
 */
export function MemberFeeBadge({ slug, memberId }: MemberFeeBadgeProps) {
  const { data: charges, isLoading } = useMemberFeeCharges(slug, memberId);

  const badgeInfo = useMemo(() => {
    if (!charges?.length) return null;

    const openCharges = charges.filter((c) => c.status !== 'PAID');
    if (openCharges.length === 0) return null;

    const hasOverdue = openCharges.some((c) => c.isOverdue);
    const totalAmount = openCharges.reduce((sum, c) => sum + parseFloat(c.remainingAmount), 0);

    return {
      count: openCharges.length,
      amount: moneyFormatter.format(totalAmount),
      hasOverdue,
    };
  }, [charges]);

  if (isLoading || !badgeInfo) return null;

  const handleClick = () => {
    const section = document.getElementById('member-fee-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Dispatch a custom event to open the collapsible
      section.dispatchEvent(new CustomEvent('expand-fee-section'));
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'cursor-pointer transition-colors',
        badgeInfo.hasOverdue
          ? 'bg-destructive/15 text-destructive border-destructive/25'
          : 'bg-muted text-muted-foreground border-border'
      )}
      onClick={handleClick}
    >
      {badgeInfo.count} offen, {badgeInfo.amount} EUR
    </Badge>
  );
}
