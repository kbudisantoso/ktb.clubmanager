'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { CalendarIcon, Loader2, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { VALID_TRANSITIONS, type MemberStatus } from '@ktb/shared';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useChangeStatus } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';
import { MemberStatusBadge } from './member-status-badge';
import type { MemberDetail } from '@/hooks/use-member-detail';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

/** German labels for each member status */
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktiv',
  INACTIVE: 'Inaktiv',
  PENDING: 'Ausstehend',
  LEFT: 'Ausgetreten',
};

/** German descriptions for each transition */
const TRANSITION_DESCRIPTIONS: Record<string, string> = {
  ACTIVE: 'Mitglied wird als aktives Mitglied geführt.',
  INACTIVE: 'Mitglied wird vorübergehend inaktiv gesetzt.',
  LEFT: 'Mitglied tritt aus dem Verein aus. Dies ist endgültig.',
  PENDING: 'Mitglied wird zurück auf ausstehend gesetzt.',
};

// ============================================================================
// Types
// ============================================================================

interface MemberStatusDialogProps {
  /** The member whose status should be changed */
  member: MemberDetail;
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Dialog for changing a member's status.
 * Validates transitions based on VALID_TRANSITIONS state machine.
 * Requires a reason and optionally an effective date.
 */
export function MemberStatusDialog({ member, open, onOpenChange }: MemberStatusDialogProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();
  const changeStatus = useChangeStatus(slug);

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Compute valid transitions from current status
  const validTransitions = useMemo(() => {
    const current = member.status as MemberStatus;
    return VALID_TRANSITIONS[current] ?? [];
  }, [member.status]);

  const hasActivePeriod = useMemo(
    () => member.membershipPeriods?.some((p) => !p.leaveDate) ?? false,
    [member.membershipPeriods]
  );

  const isValid = selectedStatus && reason.trim().length >= 1 && reason.trim().length <= 500;

  const handleSubmit = async () => {
    if (!selectedStatus || !reason.trim()) return;

    setError(null);

    try {
      await changeStatus.mutateAsync({
        id: member.id,
        newStatus: selectedStatus,
        reason: reason.trim(),
        effectiveDate,
      });

      toast({ title: 'Status geändert' });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    }
  };

  const handleClose = () => {
    setSelectedStatus(null);
    setReason('');
    setEffectiveDate(undefined);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Status ändern</DialogTitle>
          <DialogDescription>
            Ändere den Mitgliedsstatus und dokumentiere den Grund.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current status display */}
          <div>
            <Label className="text-sm text-muted-foreground">Aktueller Status</Label>
            <div className="mt-1">
              <MemberStatusBadge status={member.status} />
            </div>
          </div>

          {/* Valid transitions or no-transition message */}
          {validTransitions.length === 0 ? (
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Keine Statusänderung möglich. Der Status &quot;Ausgetreten&quot; ist endgültig.</p>
            </div>
          ) : (
            <>
              {/* Target status selection */}
              <div className="space-y-2">
                <Label>Neuer Status</Label>
                <RadioGroup
                  value={selectedStatus ?? ''}
                  onValueChange={setSelectedStatus}
                  className="space-y-2"
                >
                  {validTransitions.map((status) => (
                    <div key={status} className="flex items-start gap-3 rounded-md border p-3">
                      <RadioGroupItem value={status} id={`status-${status}`} className="mt-0.5" />
                      <label htmlFor={`status-${status}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <MemberStatusBadge status={status} />
                          <span className="text-sm font-medium">{STATUS_LABELS[status]}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {TRANSITION_DESCRIPTIONS[status]}
                        </p>
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Warning when transitioning to LEFT with active period */}
              {selectedStatus === 'LEFT' && hasActivePeriod && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Die aktive Mitgliedschaft wird automatisch beendet.
                  </p>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1.5">
                <Label htmlFor="status-reason">
                  Grund <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="status-reason"
                  placeholder="Grund für die Statusänderung..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  className="min-h-[80px] resize-y"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {reason.length} / 500 Zeichen
                </p>
              </div>

              {/* Effective date */}
              <div className="space-y-1.5">
                <Label>Gültig ab (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !effectiveDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {effectiveDate
                        ? format(new Date(effectiveDate + 'T00:00:00'), 'dd.MM.yyyy', {
                            locale: de,
                          })
                        : 'Heute (Standard)'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={effectiveDate ? new Date(effectiveDate + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setEffectiveDate(`${year}-${month}-${day}`);
                        } else {
                          setEffectiveDate(undefined);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Error display */}
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/25 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Abbrechen
          </Button>
          {validTransitions.length > 0 && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || changeStatus.isPending}
            >
              {changeStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Status ändern
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
