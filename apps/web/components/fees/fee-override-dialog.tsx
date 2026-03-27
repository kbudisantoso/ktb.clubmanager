'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useFeeOverrides,
  useCreateFeeOverride,
  useDeleteFeeOverride,
} from '@/hooks/use-fee-overrides';
import { useFeeCategories } from '@/hooks/use-fee-categories';
import type { FeeOverrideType, FeeOverrideResponse } from '@/hooks/use-fee-overrides';

// ============================================================================
// Types
// ============================================================================

interface FeeOverrideDialogProps {
  slug: string;
  memberId: string;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Helpers
// ============================================================================

import { moneyFormatter } from '@/lib/format-money';

const OVERRIDE_TYPE_OPTIONS: { value: FeeOverrideType; label: string }[] = [
  { value: 'EXEMPT', label: 'Befreit' },
  { value: 'CUSTOM_AMOUNT', label: 'Individueller Betrag' },
  { value: 'ADDITIONAL', label: 'Zusatzbeitrag' },
];

const OVERRIDE_TYPE_LABELS: Record<string, string> = {
  EXEMPT: 'Befreit',
  CUSTOM_AMOUNT: 'Individueller Betrag',
  ADDITIONAL: 'Zusatzbeitrag',
};

// ============================================================================
// Component
// ============================================================================

/**
 * Dialog for managing a member's fee overrides.
 *
 * Separates "modify existing fee" (EXEMPT, CUSTOM_AMOUNT on base fee or category)
 * from "add new fee" (ADDITIONAL with category selection).
 *
 * Per CONV-010: Delete uses AlertDialog, not browser confirm().
 */
export function FeeOverrideDialog({
  slug,
  memberId,
  memberName,
  open,
  onOpenChange,
}: FeeOverrideDialogProps) {
  const { data: overrides, isLoading } = useFeeOverrides(slug, memberId);
  const { data: categories } = useFeeCategories(slug);
  const createOverride = useCreateFeeOverride(slug);
  const deleteOverride = useDeleteFeeOverride(slug);

  // Form state for adding new override
  const [showAddForm, setShowAddForm] = useState(false);
  const [formType, setFormType] = useState<FeeOverrideType>('EXEMPT');
  const [formTarget, setFormTarget] = useState<string>('base');
  const [formAmount, setFormAmount] = useState('');
  const [formReason, setFormReason] = useState('');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<FeeOverrideResponse | null>(null);

  function resetForm() {
    setShowAddForm(false);
    setFormType('EXEMPT');
    setFormTarget('base');
    setFormAmount('');
    setFormReason('');
  }

  async function handleCreate() {
    const isBaseFee = formTarget === 'base';
    const feeCategoryId = isBaseFee ? undefined : formTarget;

    await createOverride.mutateAsync({
      memberId,
      overrideType: formType,
      isBaseFee,
      feeCategoryId,
      customAmount:
        formType === 'CUSTOM_AMOUNT' || formType === 'ADDITIONAL' ? formAmount : undefined,
      reason: formReason || undefined,
    });

    resetForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteOverride.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const showAmountField = formType === 'CUSTOM_AMOUNT' || formType === 'ADDITIONAL';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Beitragsanpassungen für {memberName}
            </DialogTitle>
            <DialogDescription>
              Befreiungen, individuelle Betraege und Zusatzbeitraege verwalten
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Existing overrides list */}
            {!isLoading && overrides && overrides.length === 0 && !showAddForm && (
              <p className="text-sm text-muted-foreground">Keine Anpassungen vorhanden</p>
            )}

            {!isLoading && overrides && overrides.length > 0 && (
              <div className="space-y-3">
                {overrides.map((override) => (
                  <div
                    key={override.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          {OVERRIDE_TYPE_LABELS[override.overrideType] ?? override.overrideType}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {override.isBaseFee
                            ? 'Grundbeitrag'
                            : (override.feeCategory?.name ?? 'Kategorie')}
                        </span>
                      </div>
                      {override.customAmount && (
                        <p className="text-sm tabular-nums">
                          {moneyFormatter.format(parseFloat(override.customAmount))} EUR
                        </p>
                      )}
                      {override.reason && (
                        <p className="text-sm text-muted-foreground">{override.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(override)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Entfernen</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add form */}
            {showAddForm && (
              <div className="space-y-4 rounded-md border p-4">
                {/* Override type */}
                <div className="space-y-2">
                  <Label htmlFor="overrideType">Art der Anpassung</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as FeeOverrideType)}>
                    <SelectTrigger id="overrideType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OVERRIDE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target */}
                <div className="space-y-2">
                  <Label htmlFor="overrideTarget">Betrifft</Label>
                  <Select value={formTarget} onValueChange={setFormTarget}>
                    <SelectTrigger id="overrideTarget" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Grundbeitrag</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom amount */}
                {showAmountField && (
                  <div className="space-y-2">
                    <Label htmlFor="overrideAmount">Betrag (EUR)</Label>
                    <Input
                      id="overrideAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                    />
                  </div>
                )}

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="overrideReason">Grund</Label>
                  <Textarea
                    id="overrideReason"
                    placeholder="z.B. Ehrenamtliche Taetigkeit"
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Form actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreate}
                    disabled={createOverride.isPending || (showAmountField && !formAmount)}
                  >
                    {createOverride.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Speichern
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {/* Add button */}
            {!showAddForm && !isLoading && (
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4" />
                Anpassung hinzufuegen
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation - per CONV-010 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anpassung entfernen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du diese Beitragsanpassung wirklich entfernen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteOverride.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOverride.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
