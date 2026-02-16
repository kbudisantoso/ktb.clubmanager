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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DateInput } from '@/components/ui/date-input';
import { useUpdateStatusHistory } from '@/hooks/use-members';
import type { StatusHistoryEntry } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';
import { LEFT_CATEGORY_OPTIONS } from '@/lib/member-status-labels';

// ============================================================================
// Types
// ============================================================================

interface StatusHistoryEditDialogProps {
  /** The status history entry to edit */
  entry: StatusHistoryEntry;
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Club slug for API calls */
  slug: string;
  /** Member ID */
  memberId: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Dialog for editing a status history entry.
 * Allows updating reason, effectiveDate, and leftCategory (when toStatus is LEFT).
 */
export function StatusHistoryEditDialog({
  entry,
  open,
  onOpenChange,
  slug,
  memberId,
}: StatusHistoryEditDialogProps) {
  const { toast } = useToast();
  const updateStatusHistory = useUpdateStatusHistory(slug, memberId);

  const [reason, setReason] = useState(entry.reason);
  const [effectiveDate, setEffectiveDate] = useState<string | undefined>(entry.effectiveDate);
  const [leftCategory, setLeftCategory] = useState<string | null>(entry.leftCategory);
  const [error, setError] = useState<string | null>(null);

  const isToLeft = entry.toStatus === 'LEFT';

  // Reset form when entry changes
  useEffect(() => {
    setReason(entry.reason);
    setEffectiveDate(entry.effectiveDate);
    setLeftCategory(entry.leftCategory);
    setError(null);
  }, [entry]);

  const isValid =
    reason.trim().length >= 1 &&
    reason.trim().length <= 500 &&
    !!effectiveDate &&
    (!isToLeft || leftCategory !== null);

  const handleSubmit = async () => {
    if (!isValid) return;

    setError(null);

    try {
      await updateStatusHistory.mutateAsync({
        transitionId: entry.id,
        reason: reason.trim(),
        effectiveDate,
        ...(isToLeft && leftCategory ? { leftCategory } : {}),
      });

      toast({ title: 'Eintrag aktualisiert' });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Statuseintrag bearbeiten</DialogTitle>
          <DialogDescription>
            Aendern Sie Grund, Datum oder Kategorie des Eintrags.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="status-history-reason">
              Grund <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="status-history-reason"
              placeholder="Grund fuer die Statusaenderung..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              className="min-h-20 resize-y"
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length} / 500 Zeichen
            </p>
          </div>

          {/* Effective date */}
          <div className="space-y-1.5">
            <Label>
              Gueltig ab <span className="text-destructive">*</span>
            </Label>
            <DateInput value={effectiveDate} onChange={(v) => setEffectiveDate(v)} />
          </div>

          {/* Left category — only when toStatus is LEFT */}
          {isToLeft && (
            <div className="space-y-2">
              <Label>
                Austrittsgrund <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={leftCategory ?? ''}
                onValueChange={setLeftCategory}
                className="space-y-1.5"
              >
                {LEFT_CATEGORY_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option.value}
                      id={`edit-left-category-${option.value}`}
                    />
                    <label
                      htmlFor={`edit-left-category-${option.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/25 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || updateStatusHistory.isPending}
          >
            {updateStatusHistory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
