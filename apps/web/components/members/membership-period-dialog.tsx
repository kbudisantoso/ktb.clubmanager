'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useCreatePeriod, useUpdatePeriod, useClosePeriod } from '@/hooks/use-membership-periods';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

/** Membership type options with German labels */
const MEMBERSHIP_TYPE_OPTIONS = [
  { value: 'ORDENTLICH', label: 'Ordentlich' },
  { value: 'PASSIV', label: 'Passiv' },
  { value: 'EHREN', label: 'Ehren' },
  { value: 'FOERDER', label: 'Foerder' },
  { value: 'JUGEND', label: 'Jugend' },
] as const;

// ============================================================================
// Types
// ============================================================================

type DialogMode = 'create' | 'edit' | 'close';

/** Period data accepted by this dialog (flexible - works with both MembershipPeriod and TimelinePeriod) */
interface PeriodData {
  id: string;
  joinDate: string | null;
  leaveDate: string | null;
  membershipType: string;
  notes: string | null;
}

interface MembershipPeriodDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Club slug for API calls */
  slug: string;
  /** Member ID */
  memberId: string;
  /** Dialog mode: create, edit, or close (quick close) */
  mode: DialogMode;
  /** Existing period for edit/close mode */
  period?: PeriodData | null;
  /** Existing periods for overlap validation */
  existingPeriods?: PeriodData[];
}

// ============================================================================
// Component
// ============================================================================

/**
 * Dialog for creating, editing, and closing membership periods.
 *
 * Create mode: full form with date pickers, type select, notes.
 * Edit mode: pre-filled form with all fields editable.
 * Close mode: simplified - only leaveDate picker + confirm button.
 *
 * Validates no overlap with existing periods.
 */
export function MembershipPeriodDialog({
  open,
  onOpenChange,
  slug,
  memberId,
  mode,
  period,
  existingPeriods = [],
}: MembershipPeriodDialogProps) {
  const { toast } = useToast();
  const createPeriod = useCreatePeriod(slug, memberId);
  const updatePeriod = useUpdatePeriod(slug, memberId);
  const closePeriod = useClosePeriod(slug, memberId);

  // ============================================================================
  // State
  // ============================================================================

  const [joinDate, setJoinDate] = useState<string>('');
  const [leaveDate, setLeaveDate] = useState<string>('');
  const [membershipType, setMembershipType] = useState<string>('ORDENTLICH');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Initialize state when dialog opens
  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && period) {
      setJoinDate(period.joinDate ?? '');
      setLeaveDate(period.leaveDate ?? '');
      setMembershipType(period.membershipType);
      setNotes(period.notes ?? '');
    } else if (mode === 'close') {
      // Pre-fill leaveDate with today
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      setLeaveDate(`${y}-${m}-${d}`);
    } else {
      // Create mode
      setJoinDate('');
      setLeaveDate('');
      setMembershipType('ORDENTLICH');
      setNotes('');
    }

    setError(null);
  }, [open, mode, period]);

  // ============================================================================
  // Validation
  // ============================================================================

  const overlapError = useMemo(() => {
    if (!joinDate) return null;

    const currentPeriodId = period?.id;
    const otherPeriods = existingPeriods.filter((p) => p.id !== currentPeriodId);

    for (const other of otherPeriods) {
      if (!other.joinDate) continue;

      const otherStart = other.joinDate;
      const otherEnd = other.leaveDate ?? '9999-12-31';
      const thisStart = joinDate;
      const thisEnd = leaveDate || '9999-12-31';

      // Check overlap: two intervals overlap if start1 <= end2 AND start2 <= end1
      if (thisStart <= otherEnd && otherStart <= thisEnd) {
        return 'Zeitraum ueberschneidet sich mit einer bestehenden Mitgliedschaft';
      }
    }

    return null;
  }, [joinDate, leaveDate, existingPeriods, period?.id]);

  const leaveDateError = useMemo(() => {
    if (leaveDate && joinDate && leaveDate < joinDate) {
      return 'Austrittsdatum muss nach dem Eintrittsdatum liegen';
    }
    return null;
  }, [joinDate, leaveDate]);

  const isValid = useMemo(() => {
    if (mode === 'close') {
      return !!leaveDate && !leaveDateError;
    }
    return !!joinDate && !!membershipType && !overlapError && !leaveDateError;
  }, [mode, joinDate, leaveDate, membershipType, overlapError, leaveDateError]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleClose = useCallback(() => {
    setJoinDate('');
    setLeaveDate('');
    setMembershipType('ORDENTLICH');
    setNotes('');
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;
    setError(null);

    try {
      if (mode === 'create') {
        await createPeriod.mutateAsync({
          joinDate,
          membershipType,
          notes: notes.trim() || undefined,
        });
        toast({ title: 'Mitgliedschaft hinzugefuegt' });
      } else if (mode === 'edit' && period) {
        await updatePeriod.mutateAsync({
          periodId: period.id,
          joinDate: joinDate || undefined,
          leaveDate: leaveDate || undefined,
          membershipType: membershipType || undefined,
          notes: notes.trim() || undefined,
        });
        toast({ title: 'Mitgliedschaft aktualisiert' });
      } else if (mode === 'close' && period) {
        await closePeriod.mutateAsync({
          periodId: period.id,
          leaveDate,
        });
        toast({ title: 'Mitgliedschaft beendet' });
      }

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    }
  }, [
    isValid,
    mode,
    period,
    joinDate,
    leaveDate,
    membershipType,
    notes,
    createPeriod,
    updatePeriod,
    closePeriod,
    toast,
    handleClose,
  ]);

  const isPending = createPeriod.isPending || updatePeriod.isPending || closePeriod.isPending;

  // ============================================================================
  // Render helpers
  // ============================================================================

  const dialogTitle = useMemo(() => {
    switch (mode) {
      case 'create':
        return 'Mitgliedschaft hinzufuegen';
      case 'edit':
        return 'Mitgliedschaft bearbeiten';
      case 'close':
        return 'Mitgliedschaft beenden';
    }
  }, [mode]);

  const dialogDescription = useMemo(() => {
    switch (mode) {
      case 'create':
        return 'Erstelle einen neuen Mitgliedschaftszeitraum.';
      case 'edit':
        return 'Bearbeite den Mitgliedschaftszeitraum.';
      case 'close':
        return 'Beende die aktuelle Mitgliedschaft mit einem Austrittsdatum.';
    }
  }, [mode]);

  const submitLabel = useMemo(() => {
    switch (mode) {
      case 'create':
        return 'Mitgliedschaft hinzufuegen';
      case 'edit':
        return 'Speichern';
      case 'close':
        return 'Mitgliedschaft beenden';
    }
  }, [mode]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Close mode: simplified UI */}
          {mode === 'close' ? (
            <DatePickerField
              label="Austrittsdatum"
              value={leaveDate}
              onChange={setLeaveDate}
              required
              error={leaveDateError}
            />
          ) : (
            <>
              {/* Join date */}
              <DatePickerField
                label="Eintrittsdatum"
                value={joinDate}
                onChange={setJoinDate}
                required
              />

              {/* Leave date */}
              <DatePickerField
                label="Austrittsdatum"
                value={leaveDate}
                onChange={setLeaveDate}
                placeholder="Offen (laufende Mitgliedschaft)"
                error={leaveDateError}
              />

              {/* Membership type */}
              <div className="space-y-1.5">
                <Label>
                  Mitgliedsart <span className="text-destructive">*</span>
                </Label>
                <Select value={membershipType} onValueChange={setMembershipType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mitgliedsart waehlen" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBERSHIP_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="period-notes">Notizen</Label>
                <Textarea
                  id="period-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optionale Notizen zum Zeitraum..."
                  maxLength={1000}
                  className="min-h-[60px] resize-y"
                />
              </div>
            </>
          )}

          {/* Overlap error */}
          {overlapError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/25 p-3 text-sm text-destructive">
              {overlapError}
            </div>
          )}

          {/* Server error */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/25 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            variant={mode === 'close' ? 'destructive' : 'default'}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// DatePickerField - reusable date picker for this dialog
// ============================================================================

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string | null;
}

function DatePickerField({
  label,
  value,
  onChange,
  required,
  placeholder,
  error,
}: DatePickerFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value
              ? format(new Date(value + 'T00:00:00'), 'dd.MM.yyyy', { locale: de })
              : (placeholder ?? 'Datum waehlen')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value + 'T00:00:00') : undefined}
            onSelect={(date) => {
              if (date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                onChange(`${year}-${month}-${day}`);
              } else {
                onChange('');
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export type { MembershipPeriodDialogProps, DialogMode };
