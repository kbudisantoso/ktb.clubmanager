'use client';

import { useState, useMemo } from 'react';
import { CreditCard, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FeeChargeStatusBadge } from '@/components/fees/fee-charge-status-badge';
import { PaymentRecordDialog } from '@/components/fees/payment-record-dialog';
import { useFeeCharges, type FeeChargeFilters } from '@/hooks/use-fee-charges';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import type { FeeChargeResponse } from '@ktb/shared';

// ============================================================================
// Types
// ============================================================================

interface FeeChargeListProps {
  slug: string;
  /** Pre-filter by member ID (from member detail navigation) */
  memberId?: string;
  /** Member name for the pre-filter banner */
  memberName?: string;
  /** Callback to switch to the Erhebung tab */
  onSwitchToErhebung?: () => void;
}

type StatusFilter = 'ALL' | 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE';

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

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const formatDay = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
  return `${formatDay(startDate)}-${formatDay(endDate)}`;
}

const PAGE_SIZE = 20;

// ============================================================================
// Component
// ============================================================================

/**
 * Filterable table of fee charges with status badges and payment recording.
 */
export function FeeChargeList({
  slug,
  memberId: initialMemberId,
  memberName,
  onSwitchToErhebung,
}: FeeChargeListProps) {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [memberSearch, setMemberSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [memberId, setMemberId] = useState(initialMemberId);
  const [page, setPage] = useState(1);

  // Payment dialog state
  const [selectedCharge, setSelectedCharge] = useState<FeeChargeResponse | null>(null);

  const debouncedMemberSearch = useDebounce(memberSearch, 300);

  // Build filter object
  const filters = useMemo<FeeChargeFilters>(() => {
    const f: FeeChargeFilters = {
      page,
      limit: PAGE_SIZE,
    };
    if (statusFilter !== 'ALL' && statusFilter !== 'OVERDUE') {
      f.status = statusFilter;
    }
    if (memberId) {
      f.memberId = memberId;
    }
    if (periodFilter) {
      f.periodStart = `${periodFilter}-01-01`;
      f.periodEnd = `${periodFilter}-12-31`;
    }
    return f;
  }, [statusFilter, memberId, periodFilter, page]);

  const { data, isLoading } = useFeeCharges(slug, filters);

  // Compute filtered data for OVERDUE client-side filter
  const charges = useMemo(() => {
    if (!data?.data) return [];
    if (statusFilter === 'OVERDUE') {
      return data.data.filter((c) => c.isOverdue);
    }
    // Client-side member name search (API filters by memberId; this filters by name text)
    if (debouncedMemberSearch && !memberId) {
      const search = debouncedMemberSearch.toLowerCase();
      return data.data.filter(
        (c) =>
          c.member.firstName.toLowerCase().includes(search) ||
          c.member.lastName.toLowerCase().includes(search) ||
          c.member.memberNumber.toLowerCase().includes(search)
      );
    }
    return data.data;
  }, [data?.data, statusFilter, debouncedMemberSearch, memberId]);

  // Summary calculations
  const summary = useMemo(() => {
    if (!data?.data) return { total: 0, openAmount: '0', paidAmount: '0' };
    const total = data.total ?? data.data.length;
    let openSum = 0;
    let paidSum = 0;
    for (const charge of data.data) {
      if (charge.status !== 'PAID') {
        openSum += parseFloat(charge.remainingAmount);
      }
      paidSum += parseFloat(charge.paidAmount);
    }
    return {
      total,
      openAmount: moneyFormatter.format(openSum),
      paidAmount: moneyFormatter.format(paidSum),
    };
  }, [data]);

  const hasActiveFilters = statusFilter !== 'ALL' || memberSearch || periodFilter || memberId;

  function resetFilters() {
    setStatusFilter('ALL');
    setMemberSearch('');
    setPeriodFilter('');
    setMemberId(undefined);
    setPage(1);
  }

  function clearMemberFilter() {
    setMemberId(undefined);
  }

  // ---- Render ----

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-5 w-96" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state: No charges at all
  if (!isLoading && !hasActiveFilters && charges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Noch keine Forderungen</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Fuehre eine Beitragserhebung durch, um Forderungen fuer deine Mitglieder zu erstellen.
        </p>
        {onSwitchToErhebung && (
          <Button className="mt-4" onClick={onSwitchToErhebung}>
            Zur Erhebung
          </Button>
        )}
      </div>
    );
  }

  // Empty state: No filter results
  if (!isLoading && hasActiveFilters && charges.length === 0) {
    return (
      <div className="space-y-4">
        <FilterBar
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          memberSearch={memberSearch}
          onMemberSearchChange={setMemberSearch}
          periodFilter={periodFilter}
          onPeriodChange={setPeriodFilter}
        />
        {memberId && memberName && (
          <MemberFilterBanner name={memberName} onClear={clearMemberFilter} />
        )}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-semibold">Keine Forderungen gefunden</h3>
          <p className="text-sm text-muted-foreground mt-2">Deine Filter ergaben keine Treffer.</p>
          <Button variant="outline" className="mt-4" onClick={resetFilters}>
            Filter zuruecksetzen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <FilterBar
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        memberSearch={memberSearch}
        onMemberSearchChange={setMemberSearch}
        periodFilter={periodFilter}
        onPeriodChange={setPeriodFilter}
      />

      {/* Member pre-filter banner */}
      {memberId && memberName && (
        <MemberFilterBanner name={memberName} onClear={clearMemberFilter} />
      )}

      {/* Summary row */}
      <p className="text-sm text-muted-foreground">
        Gesamt: {summary.total} Forderungen | Offen: {summary.openAmount} EUR | Bezahlt:{' '}
        {summary.paidAmount} EUR
      </p>

      {/* Charges table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mitglied</TableHead>
            <TableHead>Beschreibung</TableHead>
            <TableHead className="hidden lg:table-cell">Zeitraum</TableHead>
            <TableHead className="text-right tabular-nums">Betrag</TableHead>
            <TableHead className="text-right tabular-nums">Bezahlt</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {charges.map((charge) => (
            <TableRow
              key={charge.id}
              className={cn(charge.isOverdue && 'border-l-4 border-destructive')}
            >
              <TableCell>
                <div>
                  <span className="font-medium">
                    {charge.member.lastName}, {charge.member.firstName}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {charge.member.memberNumber}
                  </span>
                </div>
              </TableCell>
              <TableCell>{charge.description}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {formatPeriod(charge.periodStart, charge.periodEnd)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(charge.amount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(charge.paidAmount)}
              </TableCell>
              <TableCell>
                <FeeChargeStatusBadge status={charge.status} isOverdue={charge.isOverdue} />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setSelectedCharge(charge)}
                  aria-label="Zahlung erfassen"
                >
                  <CreditCard className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Zurueck
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">Seite {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * PAGE_SIZE >= data.total}
          >
            Weiter
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Payment recording dialog */}
      {selectedCharge && (
        <PaymentRecordDialog
          charge={selectedCharge}
          open={!!selectedCharge}
          onOpenChange={(open) => {
            if (!open) setSelectedCharge(null);
          }}
          slug={slug}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface FilterBarProps {
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  memberSearch: string;
  onMemberSearchChange: (value: string) => void;
  periodFilter: string;
  onPeriodChange: (value: string) => void;
}

function FilterBar({
  statusFilter,
  onStatusChange,
  memberSearch,
  onMemberSearchChange,
  periodFilter,
  onPeriodChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label htmlFor="statusFilter">Status</Label>
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
          <SelectTrigger id="statusFilter" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle</SelectItem>
            <SelectItem value="OPEN">Offen</SelectItem>
            <SelectItem value="PARTIAL">Teilweise bezahlt</SelectItem>
            <SelectItem value="PAID">Bezahlt</SelectItem>
            <SelectItem value="OVERDUE">Ueberfaellig</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="memberSearch">Mitglied</Label>
        <Input
          id="memberSearch"
          placeholder="Suchen..."
          value={memberSearch}
          onChange={(e) => onMemberSearchChange(e.target.value)}
          className="w-48"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="periodFilter">Periode</Label>
        <Input
          id="periodFilter"
          type="number"
          placeholder="z.B. 2026"
          value={periodFilter}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="w-28"
          min={2000}
          max={2100}
        />
      </div>
    </div>
  );
}

interface MemberFilterBannerProps {
  name: string;
  onClear: () => void;
}

function MemberFilterBanner({ name, onClear }: MemberFilterBannerProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm">
      <span>Gefiltert nach: {name}</span>
      <Button variant="ghost" size="icon-xs" onClick={onClear} aria-label="Filter entfernen">
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
