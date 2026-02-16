'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { MemberStatus, NamedTransition } from '@ktb/shared';
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
import { MemberStatusBadge } from './member-status-badge';
import { useChangeStatus } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';
import { STATUS_LABELS, LEFT_CATEGORY_OPTIONS } from '@/lib/member-status-labels';
import { getTodayISO } from '@/lib/format-date';
import type { MemberDetail } from '@/hooks/use-member-detail';

// ============================================================================
// Types
// ============================================================================

interface StatusTransitionDialogProps {
  /** The member whose status should be changed */
  member: MemberDetail;
  /** Pre-selected target status */
  targetStatus: MemberStatus;
  /** The named transition describing this action */
  namedTransition: NamedTransition;
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Dialog for executing a specific named status transition.
 * Receives a pre-selected target status and named transition.
 * Shows from/to badges, reason field, optional effective date,
 * and left category selector when transitioning to LEFT.
 */
export function StatusTransitionDialog({
  member,
  targetStatus,
  namedTransition,
  open,
  onOpenChange,
}: StatusTransitionDialogProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();
  const changeStatus = useChangeStatus(slug);

  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string | undefined>(undefined);
  const [leftCategory, setLeftCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isToLeft = targetStatus === 'LEFT';

  // Auto-set left category when autoLeftCategory is defined
  const autoCategory = namedTransition.autoLeftCategory;
  const effectiveLeftCategory = autoCategory ?? leftCategory;
  const isCategoryLocked = !!autoCategory;

  // Compute left category label for display when locked
  const lockedCategoryLabel = useMemo(() => {
    if (!autoCategory) return null;
    const option = LEFT_CATEGORY_OPTIONS.find((o) => o.value === autoCategory);
    return option?.label ?? autoCategory;
  }, [autoCategory]);

  const hasActivePeriod = useMemo(
    () => member.membershipPeriods?.some((p) => !p.leaveDate) ?? false,
    [member.membershipPeriods]
  );

  const isValid =
    reason.trim().length >= 1 &&
    reason.trim().length <= 500 &&
    (!isToLeft || effectiveLeftCategory !== null);

  const handleSubmit = async () => {
    if (!isValid) return;

    setError(null);

    try {
      await changeStatus.mutateAsync({
        id: member.id,
        newStatus: targetStatus,
        reason: reason.trim(),
        effectiveDate: effectiveDate ?? undefined,
        ...(isToLeft && effectiveLeftCategory ? { leftCategory: effectiveLeftCategory } : {}),
      });

      toast({
        title: `Status auf "${STATUS_LABELS[targetStatus]}" geaendert`,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    }
  };

  const handleClose = () => {
    setReason('');
    setEffectiveDate(undefined);
    setLeftCategory(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{namedTransition.action}</DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-2 flex-wrap">
              <MemberStatusBadge status={member.status} />
              <span aria-hidden="true">&rarr;</span>
              <MemberStatusBadge status={targetStatus} />
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning when transitioning to LEFT with active period */}
          {isToLeft && hasActivePeriod && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 p-3">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Die aktive Mitgliedschaft wird automatisch beendet.
              </p>
            </div>
          )}

          {/* Left category selector — only for →LEFT transitions */}
          {isToLeft && (
            <div className="space-y-2">
              <Label>
                Austrittsgrund <span className="text-destructive">*</span>
              </Label>
              {isCategoryLocked ? (
                <p className="text-sm text-muted-foreground">{lockedCategoryLabel}</p>
              ) : (
                <RadioGroup
                  value={leftCategory ?? ''}
                  onValueChange={setLeftCategory}
                  className="space-y-1.5"
                >
                  {LEFT_CATEGORY_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <RadioGroupItem value={option.value} id={`left-category-${option.value}`} />
                      <label
                        htmlFor={`left-category-${option.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="transition-reason">
              Grund <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="transition-reason"
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

          {/* Effective date — defaults to today */}
          <div className="space-y-1.5">
            <Label>Gueltig ab</Label>
            <DateInput
              value={effectiveDate ?? getTodayISO()}
              onChange={(v) => setEffectiveDate(v)}
            />
          </div>

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
            variant={namedTransition.destructive ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={!isValid || changeStatus.isPending}
          >
            {changeStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {namedTransition.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
