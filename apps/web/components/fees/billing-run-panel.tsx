'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { BillingRunPreview } from '@/components/fees/billing-run-preview';
import { useBillingRunPreview, useBillingRunConfirm } from '@/hooks/use-billing-run';
import type { BillingRunPreviewResponse, BillingInterval } from '@ktb/shared';

// ============================================================================
// Types
// ============================================================================

interface BillingRunPanelProps {
  slug: string;
  /** Callback when billing run completes (e.g., switch to Forderungen tab) */
  onComplete?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

import { formatMoney } from '@/lib/format-money';

const INTERVAL_OPTIONS: { value: BillingInterval; label: string }[] = [
  { value: 'MONTHLY', label: 'Monatlich' },
  { value: 'QUARTERLY', label: 'Quartalsweise' },
  { value: 'ANNUALLY', label: 'Jaehrlich' },
];

// ============================================================================
// Component
// ============================================================================

/**
 * Billing run orchestration panel.
 *
 * Two-step flow:
 * 1. Configuration: Select period, interval, load preview
 * 2. Preview: Review summary, set due date, confirm
 */
export function BillingRunPanel({ slug, onComplete }: BillingRunPanelProps) {
  // Form state
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('ANNUALLY');
  const [dueDate, setDueDate] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Preview state
  const [previewData, setPreviewData] = useState<BillingRunPreviewResponse | null>(null);

  // Mutations
  const previewMutation = useBillingRunPreview(slug);
  const confirmMutation = useBillingRunConfirm(slug);

  // Handlers
  function handleLoadPreview() {
    if (!periodStart || !periodEnd) return;

    previewMutation.mutate(
      { periodStart, periodEnd, billingInterval },
      {
        onSuccess: (data) => {
          setPreviewData(data);
        },
      }
    );
  }

  function handleConfirm() {
    if (!periodStart || !periodEnd || !dueDate) return;

    confirmMutation.mutate(
      { periodStart, periodEnd, billingInterval, dueDate },
      {
        onSuccess: () => {
          setShowConfirmDialog(false);
          setPreviewData(null);
          setPeriodStart('');
          setPeriodEnd('');
          setDueDate('');
          onComplete?.();
        },
      }
    );
  }

  function handleBack() {
    setPreviewData(null);
    setDueDate('');
  }

  const canLoadPreview = periodStart && periodEnd && !previewMutation.isPending;
  const canConfirm = previewData && dueDate && !confirmMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Beitragserhebung</CardTitle>
        <CardDescription>Forderungen fuer einen Abrechnungszeitraum erstellen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Configuration */}
        {!previewData && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Von</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">Bis</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingInterval">Rhythmus</Label>
                <Select
                  value={billingInterval}
                  onValueChange={(value) => setBillingInterval(value as BillingInterval)}
                >
                  <SelectTrigger id="billingInterval" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleLoadPreview} disabled={!canLoadPreview}>
              {previewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Vorschau laden
            </Button>
          </div>
        )}

        {/* Loading skeleton for preview */}
        {previewMutation.isPending && !previewData && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-6 w-56" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        )}

        {/* Step 2: Preview + Confirm */}
        {previewData && (
          <div className="space-y-6">
            <BillingRunPreview data={previewData} />

            {/* Duplicate period warning */}
            {previewData.existingCharges > 0 && (
              <div className="flex items-start gap-3 rounded-md border bg-warning/15 border-warning/25 p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning-foreground" />
                <p className="text-sm text-warning-foreground">
                  Fuer diesen Zeitraum existieren bereits {previewData.existingCharges} Forderungen.
                  Doppelte werden uebersprungen.
                </p>
              </div>
            )}

            {/* Due date field */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Faelligkeitsdatum</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="max-w-xs"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleBack}>
                Zurueck
              </Button>
              <Button onClick={() => setShowConfirmDialog(true)} disabled={!canConfirm}>
                Erhebung durchfuehren
              </Button>
            </div>
          </div>
        )}

        {/* Confirmation AlertDialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Beitragserhebung durchfuehren</AlertDialogTitle>
              <AlertDialogDescription>
                Es werden {previewData?.memberCount ?? 0} Forderungen ueber insgesamt{' '}
                {previewData ? formatMoney(previewData.totalAmount) : '0,00 EUR'} erstellt. Dieser
                Vorgang kann nicht rueckgaengig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm} disabled={confirmMutation.isPending}>
                {confirmMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Erhebung starten
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
