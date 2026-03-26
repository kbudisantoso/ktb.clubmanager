'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

const moneyFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value: string): string {
  return `${moneyFormatter.format(parseFloat(value))} EUR`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Displays billing run preview data: summary stats and breakdown by membership type.
 */
export function BillingRunPreview({ data }: BillingRunPreviewProps) {
  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div>
          <h3 className="text-sm font-medium mb-3">Zusammenfassung</h3>
          <div className="flex flex-wrap gap-6">
            <div>
              <span className="text-sm text-muted-foreground">Mitglieder: </span>
              <span className="text-sm font-medium tabular-nums">{data.memberCount}</span>
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
          </div>
        </div>

        {/* Breakdown */}
        {data.breakdown.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">Aufschluesselung nach Mitgliedsart:</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitgliedsart</TableHead>
                  <TableHead className="text-right tabular-nums">Anzahl</TableHead>
                  <TableHead className="text-right tabular-nums">Zwischensumme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.breakdown.map((item) => (
                  <TableRow key={item.membershipType}>
                    <TableCell>{item.membershipType}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.count}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(item.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
