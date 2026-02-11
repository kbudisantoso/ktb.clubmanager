'use client';

import { useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useSyncAddresses } from '@/hooks/use-households';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Constants
// ============================================================================

/** German labels for household roles */
const ROLE_LABELS: Record<string, string> = {
  HEAD: 'Hauptkontakt',
  SPOUSE: 'Ehepartner',
  CHILD: 'Kind',
  OTHER: 'Sonstige',
};

// ============================================================================
// Types
// ============================================================================

interface HouseholdMemberInfo {
  id: string;
  firstName: string;
  lastName: string;
  householdRole: string | null;
}

interface HouseholdAddressSyncDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Club slug for API calls */
  slug: string;
  /** Household ID */
  householdId: string;
  /** Name of the HEAD member whose address changed */
  headMemberName: string;
  /** Other household members (excluding HEAD) to sync address to */
  otherMembers: HouseholdMemberInfo[];
}

// ============================================================================
// Component
// ============================================================================

/**
 * Address sync confirmation dialog for households.
 *
 * Triggered when HEAD member's address is updated and household has other members.
 * Shows a checkbox list of other members (all checked by default).
 * NEVER auto-syncs silently - always requires explicit user action (per CONTEXT.md).
 */
export function HouseholdAddressSyncDialog({
  open,
  onOpenChange,
  slug,
  householdId,
  headMemberName,
  otherMembers,
}: HouseholdAddressSyncDialogProps) {
  const { toast } = useToast();
  const syncAddresses = useSyncAddresses(slug);

  // All members checked by default
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Reset checked state when dialog opens
  useEffect(() => {
    if (open) {
      setCheckedIds(new Set(otherMembers.map((m) => m.id)));
    }
  }, [open, otherMembers]);

  const toggleMember = useCallback((memberId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, []);

  const handleSync = useCallback(async () => {
    if (checkedIds.size === 0) {
      onOpenChange(false);
      return;
    }

    try {
      await syncAddresses.mutateAsync({
        householdId,
        memberIds: Array.from(checkedIds),
      });

      toast({
        title: 'Adressen aktualisiert',
        description: `${checkedIds.size} ${checkedIds.size === 1 ? 'Adresse' : 'Adressen'} synchronisiert`,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Fehler beim Synchronisieren',
        description: err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten',
        variant: 'destructive',
      });
    }
  }, [checkedIds, householdId, syncAddresses, toast, onOpenChange]);

  const handleSkip = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Adresse auch für andere Haushaltsmitglieder aktualisieren?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Du hast die Adresse von {headMemberName} geändert. Wähle die Mitglieder aus, deren
            Adresse ebenfalls aktualisiert werden soll.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Member checkbox list */}
        <div className="space-y-2 py-2">
          {otherMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Checkbox
                id={`sync-${m.id}`}
                checked={checkedIds.has(m.id)}
                onCheckedChange={() => toggleMember(m.id)}
              />
              <label htmlFor={`sync-${m.id}`} className="text-sm cursor-pointer flex-1">
                {m.firstName} {m.lastName}
                {m.householdRole && (
                  <span className="text-muted-foreground ml-1">
                    ({ROLE_LABELS[m.householdRole] ?? m.householdRole})
                  </span>
                )}
              </label>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSkip}>Nur für {headMemberName}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSync}
            disabled={checkedIds.size === 0 || syncAddresses.isPending}
          >
            {syncAddresses.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adressen aktualisieren
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type { HouseholdAddressSyncDialogProps };
