'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { MemberStatusBadge } from './member-status-badge';
import { useChangeStatus, usePreviewChangeStatus } from '@/hooks/use-members';
import type { ChainRecalculationPreview } from '@/hooks/use-members';
import { useMembershipTypes } from '@/hooks/use-membership-types';
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
 * left category selector when transitioning to LEFT,
 * and membership type selector for non-LEFT transitions.
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
  const previewMutation = usePreviewChangeStatus(slug);
  const { data: membershipTypes } = useMembershipTypes(slug);

  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string | undefined>(undefined);
  const [leftCategory, setLeftCategory] = useState<string | null>(null);
  const [membershipTypeId, setMembershipTypeId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ChainRecalculationPreview | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced preview call when effectiveDate changes
  const triggerPreview = useCallback(
    (date: string | undefined) => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      setPreview(null);

      if (!date) return;

      previewTimerRef.current = setTimeout(() => {
        previewMutation.mutate(
          {
            id: member.id,
            newStatus: targetStatus,
            reason: reason || 'preview',
            effectiveDate: date,
            ...(targetStatus === 'LEFT' && leftCategory ? { leftCategory } : {}),
          },
          {
            onSuccess: (data) => setPreview(data),
            onError: () => setPreview(null),
          }
        );
      }, 500);
    },
    [member.id, targetStatus, reason, leftCategory, previewMutation]
  );

  // Trigger preview when effectiveDate changes
  useEffect(() => {
    triggerPreview(effectiveDate);
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [effectiveDate, triggerPreview]);

  const isToLeft = targetStatus === 'LEFT';
  const isSelfTransition = member.status === targetStatus;

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

  // Show membership type selector for all non-LEFT transitions
  const showMembershipTypeSelector = !isToLeft;

  // Available types: active only
  const availableTypes = useMemo(() => {
    if (!membershipTypes) return [];
    return membershipTypes.filter((t) => t.isActive);
  }, [membershipTypes]);

  // Pre-select membership type when dialog opens
  useEffect(() => {
    if (!open || !membershipTypes?.length) return;

    if (isSelfTransition) {
      // Self-transition: pre-select current type (period containing today)
      const today = new Date().toISOString().slice(0, 10);
      const allPeriods = member.membershipPeriods ?? [];
      const activePeriod = allPeriods.find(
        (p) => (p.joinDate ?? '') <= today && (!p.leaveDate || p.leaveDate > today)
      );
      setMembershipTypeId(activePeriod?.membershipTypeId ?? '');
    } else if (member.status === 'PENDING') {
      // PENDING activation: pre-select default type
      const defaultType = membershipTypes.find((t) => t.isDefault && t.isActive);
      setMembershipTypeId(defaultType?.id ?? membershipTypes[0]?.id ?? '');
    } else {
      // Other transitions: empty (optional, means keep current)
      setMembershipTypeId('');
    }
  }, [open, isSelfTransition, member.status, member.membershipPeriods, membershipTypes]);

  const isValid =
    reason.trim().length >= 1 &&
    reason.trim().length <= 500 &&
    (!isToLeft || effectiveLeftCategory !== null) &&
    (!isSelfTransition || membershipTypeId !== '');

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
        ...(membershipTypeId ? { membershipTypeId } : {}),
      });

      toast({
        title: isSelfTransition
          ? 'Mitgliedsart geändert'
          : `Status auf "${STATUS_LABELS[targetStatus]}" geändert`,
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
    setMembershipTypeId('');
    setError(null);
    setPreview(null);
    setPreviewExpanded(false);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{namedTransition.action}</DialogTitle>
          <DialogDescription>
            {isSelfTransition ? (
              <span className="inline-flex items-center gap-2">
                <MemberStatusBadge status={member.status} />
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 flex-wrap">
                <MemberStatusBadge status={member.status} />
                <span aria-hidden="true">&rarr;</span>
                <MemberStatusBadge status={targetStatus} />
              </span>
            )}
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

          {/* Membership type selector — for non-LEFT transitions */}
          {showMembershipTypeSelector && availableTypes.length > 0 && (
            <div className="space-y-1.5">
              <Label>
                Mitgliedsart{isSelfTransition && <span className="text-destructive"> *</span>}
              </Label>
              <Select value={membershipTypeId} onValueChange={setMembershipTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Mitgliedsart wählen" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isSelfTransition && (
                <p className="text-xs text-muted-foreground">
                  Leer lassen, um die aktuelle Mitgliedsart beizubehalten
                </p>
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
              placeholder="Grund für die Statusänderung..."
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
            <Label>Gültig ab</Label>
            <DateInput
              value={effectiveDate ?? getTodayISO()}
              onChange={(v) => setEffectiveDate(v)}
            />
          </div>

          {/* Chain recalculation preview */}
          {preview?.hasChanges && (
            <div className="rounded-md border border-amber-500/25 bg-amber-500/10 p-3 space-y-2">
              <button
                type="button"
                onClick={() => setPreviewExpanded((v) => !v)}
                className="flex w-full items-center gap-2 text-left"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Diese Änderung beeinflusst bestehende Einträge
                </span>
                {previewExpanded ? (
                  <ChevronDown className="ml-auto h-4 w-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <ChevronRight className="ml-auto h-4 w-4 text-amber-600 dark:text-amber-400" />
                )}
              </button>
              {previewExpanded && (
                <div className="space-y-1.5 pt-1 text-sm text-amber-700 dark:text-amber-300">
                  {preview.removedTransitions.length > 0 && (
                    <div>
                      <p className="font-medium">
                        {preview.removedTransitions.length} Eintrag/Einträge werden entfernt:
                      </p>
                      <ul className="ml-4 list-disc">
                        {preview.removedTransitions.map((t) => (
                          <li key={t.id}>
                            {STATUS_LABELS[t.toStatus as MemberStatus] ?? t.toStatus} (
                            {t.effectiveDate}) &mdash; {t.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {preview.closedPeriods.length > 0 && (
                    <p>{preview.closedPeriods.length} Mitgliedschaft(en) werden geschlossen</p>
                  )}
                  {preview.restoredTransitions.length > 0 && (
                    <p>
                      {preview.restoredTransitions.length} Eintrag/Einträge werden wiederhergestellt
                    </p>
                  )}
                  {preview.reopenedPeriods.length > 0 && (
                    <p>{preview.reopenedPeriods.length} Mitgliedschaft(en) werden wiedereröffnet</p>
                  )}
                  <p className="pt-1 font-medium">
                    Neuer Status:{' '}
                    {STATUS_LABELS[preview.finalMemberStatus as MemberStatus] ??
                      preview.finalMemberStatus}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Preview loading indicator */}
          {previewMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Vorschau wird berechnet...
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
