'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { BillingRunPreviewResponse } from '@ktb/shared';

// ============================================================================
// Types
// ============================================================================

interface BillingRunPreviewProps {
  data: BillingRunPreviewResponse;
}

// ============================================================================
// Helpers
// ============================================================================

import { formatMoney } from '@/lib/format-money';

// ============================================================================
// Component
// ============================================================================

/**
 * Displays billing run preview data: summary stats, warnings for members
 * without Beitragsart, and breakdown by membership type.
 */
export function BillingRunPreview({ data }: BillingRunPreviewProps) {
  const warnings = data.warnings ?? [];

  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Warnings summary for members without Beitragsart */}
        {warnings.length > 0 && (
          <div className="rounded-md border border-warning/50 bg-warning/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">
                  {warnings.length} Mitglied{warnings.length !== 1 ? 'er' : ''} ohne Beitragsart —
                  werden nicht berücksichtigt
                </p>
                <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  {warnings.slice(0, 5).map((w) => (
                    <li key={w.memberId}>
                      {w.memberName}: {w.reason}
                    </li>
                  ))}
                  {warnings.length > 5 && (
                    <li className="text-muted-foreground">... und {warnings.length - 5} weitere</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div>
          <h3 className="text-sm font-medium mb-3">Zusammenfassung</h3>
          <div className="flex flex-wrap gap-6">
            <div>
              <span className="text-sm text-muted-foreground">Mitglieder: </span>
              <span className="text-sm font-medium tabular-nums">{data.memberCount}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Forderungen: </span>
              <span className="text-sm font-medium tabular-nums">{data.chargeCount}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Gesamtbetrag: </span>
              <span
                className="text-sm font-medium tabular-nums"
                aria-label={`Gesamtbetrag: ${formatMoney(data.totalAmount)}`}
              >
                {formatMoney(data.totalAmount)}
              </span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Befreit: </span>
              <span className="text-sm font-medium tabular-nums">{data.exemptions}</span>
            </div>
            {warnings.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Ohne Beitragsart: </span>
                <span className="text-sm font-medium tabular-nums text-warning">
                  {warnings.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Breakdown */}
        {data.breakdown.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">Aufschlüsselung:</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Beitragsart</TableHead>
                  <TableHead className="text-right tabular-nums">Anzahl</TableHead>
                  <TableHead className="text-right tabular-nums">Zwischensumme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.breakdown.map((item) => {
                  const memberWarning = warnings.find((w) => w.memberName === item.membershipType);
                  return (
                    <TableRow key={item.membershipType}>
                      <TableCell>
                        <span>{item.membershipType}</span>
                        {memberWarning && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="ml-2 bg-warning/15 text-warning"
                                  role="status"
                                >
                                  Keine Beitragsart
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{memberWarning.reason}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{'—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.count}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
