'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
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
import { DateInput } from '@/components/ui/date-input';
import { useSetCancellation } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';
import { getTodayISO } from '@/lib/format-date';
import type { MemberDetail } from '@/hooks/use-member-detail';

// ============================================================================
// Types
// ============================================================================

interface CancellationDialogProps {
  /** The member to record a cancellation for */
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
 * Dialog for recording a membership cancellation.
 * Captures cancellationDate, cancellationReceivedAt, and reason.
 * Does NOT change the member's status — it records the intent to leave.
 */
export function CancellationDialog({ member, open, onOpenChange }: CancellationDialogProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();
  const setCancellation = useSetCancellation(slug);

  const [cancellationDate, setCancellationDate] = useState<string | undefined>(undefined);
  const [cancellationReceivedAt, setCancellationReceivedAt] = useState<string | undefined>(
    getTodayISO()
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isValid =
    !!cancellationDate &&
    !!cancellationReceivedAt &&
    reason.trim().length >= 1 &&
    reason.trim().length <= 500;

  const handleSubmit = async () => {
    if (!isValid) return;

    setError(null);

    try {
      await setCancellation.mutateAsync({
        id: member.id,
        cancellationDate: cancellationDate!,
        cancellationReceivedAt: cancellationReceivedAt!,
        reason: reason.trim(),
      });

      toast({ title: 'Kündigung erfasst' });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    }
  };

  const handleClose = () => {
    setCancellationDate(undefined);
    setCancellationReceivedAt(getTodayISO());
    setReason('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kündigung erfassen</DialogTitle>
          <DialogDescription>
            Kündigung für {member.firstName} {member.lastName} erfassen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cancellation date — when the membership ends */}
          <div className="space-y-1.5">
            <Label>
              Kündigungsdatum <span className="text-destructive">*</span>
            </Label>
            <DateInput value={cancellationDate} onChange={(v) => setCancellationDate(v)} />
            <p className="text-xs text-muted-foreground">Wann endet die Mitgliedschaft?</p>
          </div>

          {/* Received date — when cancellation was received */}
          <div className="space-y-1.5">
            <Label>
              Eingangsdatum <span className="text-destructive">*</span>
            </Label>
            <DateInput
              value={cancellationReceivedAt}
              onChange={(v) => setCancellationReceivedAt(v)}
            />
            <p className="text-xs text-muted-foreground">Wann wurde die Kündigung eingereicht?</p>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="cancellation-reason">
              Grund <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Grund für die Kündigung..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              className="min-h-20 resize-y"
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length} / 500 Zeichen
            </p>
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
            onClick={handleSubmit}
            disabled={!isValid || setCancellation.isPending}
          >
            {setCancellation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kündigung speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
