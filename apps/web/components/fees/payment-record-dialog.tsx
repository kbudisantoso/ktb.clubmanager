'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRecordPayment } from '@/hooks/use-payments';
import type { FeeChargeResponse } from '@ktb/shared';

// ============================================================================
// Types
// ============================================================================

interface PaymentRecordDialogProps {
  charge: FeeChargeResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
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

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Validation: amount must be > 0, max 10 digits before decimal, max 2 after
function validateAmount(value: string): string | null {
  if (!value) return 'Betrag ist erforderlich';
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return 'Betrag muss groesser als 0 sein';
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) {
    return 'Betrag darf maximal 10 Vorkomma- und 2 Nachkommastellen haben';
  }
  return null;
}

function validateDate(value: string): string | null {
  if (!value) return 'Zahlungsdatum ist erforderlich';
  const date = new Date(value);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) return 'Zahlungsdatum darf nicht in der Zukunft liegen';
  return null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Dialog for recording a manual payment against a fee charge.
 * Shows charge context (member, amounts) and a form for amount, date, notes.
 */
export function PaymentRecordDialog({
  charge,
  open,
  onOpenChange,
  slug,
}: PaymentRecordDialogProps) {
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const recordPayment = useRecordPayment(slug);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setAmount(charge.remainingAmount);
      setPaidAt(getTodayISO());
      setNotes('');
      setErrors({});
    }
  }, [open, charge.remainingAmount]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    const amountError = validateAmount(amount);
    if (amountError) newErrors.amount = amountError;
    const dateError = validateDate(paidAt);
    if (dateError) newErrors.paidAt = dateError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    recordPayment.mutate(
      {
        feeChargeId: charge.id,
        amount,
        paidAt,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  }

  const isPending = recordPayment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zahlung erfassen</DialogTitle>
          <DialogDescription>Manuelle Zahlung fuer eine Forderung erfassen</DialogDescription>
        </DialogHeader>

        {/* Charge context (read-only) */}
        <div className="rounded-md border bg-muted/50 p-4 space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Mitglied: </span>
            <span className="font-medium">
              {charge.member.lastName}, {charge.member.firstName}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Beschreibung: </span>
            <span>{charge.description}</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-muted-foreground">Betrag: </span>
              <span className="font-medium tabular-nums">{formatMoney(charge.amount)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Bezahlt: </span>
              <span className="font-medium tabular-nums">{formatMoney(charge.paidAmount)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Offen: </span>
              <span className="font-medium tabular-nums">
                {formatMoney(charge.remainingAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Betrag (EUR)</Label>
            <Input
              id="paymentAmount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
              className="tabular-nums"
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate">Zahlungsdatum</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              disabled={isPending}
            />
            {errors.paidAt && <p className="text-sm text-destructive">{errors.paidAt}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentNotes">Notizen</Label>
            <Textarea
              id="paymentNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              placeholder="Optional..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Zahlung erfassen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
