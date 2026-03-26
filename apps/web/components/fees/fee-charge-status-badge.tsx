'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FeeChargeStatus } from '@ktb/shared';

// ============================================================================
// Types
// ============================================================================

interface FeeChargeStatusBadgeProps {
  /** Charge payment status */
  status: FeeChargeStatus;
  /** Whether the charge is past due date and not fully paid */
  isOverdue: boolean;
  className?: string;
}

// ============================================================================
// Status Configuration
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  OVERDUE: {
    label: 'Ueberfaellig',
    className: 'bg-destructive/15 text-destructive border-destructive/25',
  },
  OPEN: {
    label: 'Offen',
    className: 'bg-muted text-muted-foreground border-border',
  },
  PARTIAL: {
    label: 'Teilweise bezahlt',
    className: 'bg-warning/15 text-warning-foreground border-warning/25',
  },
  PAID: {
    label: 'Bezahlt',
    className: 'bg-success/15 text-success border-success/25',
  },
};

// ============================================================================
// Component
// ============================================================================

/**
 * Badge displaying fee charge payment status with semantic colors.
 *
 * Status hierarchy:
 * - OVERDUE takes precedence when isOverdue=true and status is OPEN or PARTIAL
 * - PAID is always shown as PAID regardless of isOverdue
 *
 * Colors follow the UI-SPEC Fee Charge Status Colors table.
 */
export function FeeChargeStatusBadge({ status, isOverdue, className }: FeeChargeStatusBadgeProps) {
  // Determine effective status: OVERDUE overrides OPEN/PARTIAL
  const effectiveStatus = isOverdue && status !== 'PAID' ? 'OVERDUE' : status;

  const config = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.OPEN;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
