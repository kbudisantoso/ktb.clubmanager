'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  useCreateHousehold,
  useUpdateHousehold,
  useAddHouseholdMember,
  useRemoveHouseholdMember,
  useDissolveHousehold,
} from '@/hooks/use-households';
import { useToast } from '@/hooks/use-toast';
import type { Household, HouseholdMember } from '@/hooks/use-households';

// ============================================================================
// Constants
// ============================================================================

const ROLE_OPTIONS = [
  { value: 'HEAD', label: 'Hauptkontakt' },
  { value: 'SPOUSE', label: 'Ehepartner' },
  { value: 'CHILD', label: 'Kind' },
  { value: 'OTHER', label: 'Sonstige' },
] as const;

// ============================================================================
// Types
// ============================================================================

/** Minimal member info for selection in create mode */
interface SelectableMember {
  id: string;
  firstName: string;
  lastName: string;
  memberNumber: string;
}

interface HouseholdDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Existing household for edit mode (null for create mode) */
  household?: Household | null;
  /** Available members for selection in create mode */
  availableMembers?: SelectableMember[];
  /** Pre-selected member IDs (e.g., from table bulk selection) */
  preSelectedMemberIds?: string[];
  /** Pre-fill household name */
  preFilledName?: string;
}

interface SelectedMemberState {
  id: string;
  firstName: string;
  lastName: string;
  memberNumber: string;
  role: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Dialog for creating and editing households.
 *
 * Create mode: select members, assign roles, set name and primary contact.
 * Edit mode: edit name, manage members and roles, dissolve household.
 *
 * Validation: exactly one HEAD required, primaryContact must be in member list.
 */
export function HouseholdDialog({
  open,
  onOpenChange,
  household,
  availableMembers = [],
  preSelectedMemberIds = [],
  preFilledName,
}: HouseholdDialogProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();

  const createHousehold = useCreateHousehold(slug);
  const updateHousehold = useUpdateHousehold(slug);
  const addMember = useAddHouseholdMember(slug);
  const removeMember = useRemoveHouseholdMember(slug);
  const dissolveHousehold = useDissolveHousehold(slug);

  const isEditMode = !!household;

  // ============================================================================
  // State
  // ============================================================================

  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<SelectedMemberState[]>([]);
  const [primaryContactId, setPrimaryContactId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showDissolveConfirm, setShowDissolveConfirm] = useState(false);

  // Initialize state when dialog opens or household changes
  useEffect(() => {
    if (!open) return;

    if (isEditMode && household) {
      setName(household.name);
      setSelectedMembers(
        household.members.map((m: HouseholdMember) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          memberNumber: m.memberNumber,
          role: m.householdRole ?? 'OTHER',
        }))
      );
      setPrimaryContactId(household.primaryContactId ?? '');
    } else {
      // Create mode
      const defaultName = preFilledName ?? '';
      setName(defaultName);

      // Pre-select members from props
      const preSelected = availableMembers
        .filter((m) => preSelectedMemberIds.includes(m.id))
        .map((m, i) => ({
          ...m,
          role: i === 0 ? 'HEAD' : 'MEMBER',
        }));

      // Auto-assign first as HEAD
      if (preSelected.length > 0) {
        preSelected[0].role = 'HEAD';
        setPrimaryContactId(preSelected[0].id);

        // Auto-fill name from first member's last name if not pre-filled
        if (!defaultName) {
          setName(`Familie ${preSelected[0].lastName}`);
        }
      }

      setSelectedMembers(preSelected);
    }

    setError(null);
  }, [open, household, isEditMode, availableMembers, preSelectedMemberIds, preFilledName]);

  // ============================================================================
  // Derived state
  // ============================================================================

  const headCount = useMemo(
    () => selectedMembers.filter((m) => m.role === 'HEAD').length,
    [selectedMembers]
  );

  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    if (selectedMembers.length === 0) return false;
    if (headCount !== 1) return false;
    if (primaryContactId && !selectedMembers.some((m) => m.id === primaryContactId)) return false;
    return true;
  }, [name, selectedMembers, headCount, primaryContactId]);

  // Members not yet selected (for adding in create mode)
  const unselectedMembers = useMemo(
    () => availableMembers.filter((m) => !selectedMembers.some((s) => s.id === m.id)),
    [availableMembers, selectedMembers]
  );

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleAddMember = useCallback((member: SelectableMember) => {
    setSelectedMembers((prev) => [
      ...prev,
      {
        ...member,
        role: prev.length === 0 ? 'HEAD' : 'OTHER',
      },
    ]);
  }, []);

  const handleRemoveMember = useCallback(
    (memberId: string) => {
      setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
      if (primaryContactId === memberId) {
        setPrimaryContactId('');
      }
    },
    [primaryContactId]
  );

  const handleRoleChange = useCallback((memberId: string, newRole: string) => {
    setSelectedMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
  }, []);

  const handleClose = useCallback(() => {
    setName('');
    setSelectedMembers([]);
    setPrimaryContactId('');
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleCreate = useCallback(async () => {
    if (!isValid) return;
    setError(null);

    try {
      const roles: Record<string, string> = {};
      for (const m of selectedMembers) {
        roles[m.id] = m.role;
      }

      await createHousehold.mutateAsync({
        name: name.trim(),
        memberIds: selectedMembers.map((m) => m.id),
        primaryContactId: primaryContactId || undefined,
      });

      toast({ title: 'Haushalt erstellt' });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    }
  }, [isValid, selectedMembers, name, primaryContactId, createHousehold, toast, handleClose]);

  const handleUpdate = useCallback(async () => {
    if (!household) return;
    setError(null);

    try {
      // Update name and primary contact
      if (name.trim() !== household.name || primaryContactId !== household.primaryContactId) {
        await updateHousehold.mutateAsync({
          id: household.id,
          data: {
            name: name.trim(),
            primaryContactId: primaryContactId || undefined,
          },
        });
      }

      // Find new members to add and removed members
      const currentIds = new Set(household.members.map((m: HouseholdMember) => m.id));
      const selectedIds = new Set(selectedMembers.map((m) => m.id));

      // Add new members
      for (const m of selectedMembers) {
        if (!currentIds.has(m.id)) {
          await addMember.mutateAsync({
            householdId: household.id,
            memberId: m.id,
            role: m.role,
          });
        }
      }

      // Remove members no longer selected
      for (const m of household.members) {
        if (!selectedIds.has(m.id)) {
          await removeMember.mutateAsync({
            householdId: household.id,
            memberId: m.id,
          });
        }
      }

      toast({ title: 'Haushalt aktualisiert' });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    }
  }, [
    household,
    name,
    primaryContactId,
    selectedMembers,
    updateHousehold,
    addMember,
    removeMember,
    toast,
    handleClose,
  ]);

  const handleDissolve = useCallback(async () => {
    if (!household) return;
    setError(null);

    try {
      await dissolveHousehold.mutateAsync(household.id);
      toast({ title: 'Haushalt aufgeloest' });
      setShowDissolveConfirm(false);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    }
  }, [household, dissolveHousehold, toast, handleClose]);

  const isPending =
    createHousehold.isPending ||
    updateHousehold.isPending ||
    addMember.isPending ||
    removeMember.isPending;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Haushalt bearbeiten' : 'Haushalt erstellen'}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Bearbeite den Haushalt und die zugeordneten Mitglieder.'
                : 'Erstelle einen neuen Haushalt und ordne Mitglieder zu.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Household name */}
            <div className="space-y-1.5">
              <Label htmlFor="household-name">
                Haushaltsname <span className="text-destructive">*</span>
              </Label>
              <Input
                id="household-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Familie Mustermann"
                maxLength={200}
              />
            </div>

            {/* Selected members with roles */}
            <div className="space-y-1.5">
              <Label>
                Mitglieder <span className="text-destructive">*</span>
              </Label>

              {selectedMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Noch keine Mitglieder ausgewählt
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 rounded-md border p-2 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">
                          {m.lastName}, {m.firstName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {m.memberNumber}
                        </span>
                      </div>

                      {/* Role select */}
                      <Select
                        value={m.role}
                        onValueChange={(value) => handleRoleChange(m.id, value)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Remove button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleRemoveMember(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="sr-only">Entfernen</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Validation: HEAD count */}
              {selectedMembers.length > 0 && headCount !== 1 && (
                <p className="text-xs text-destructive">
                  {headCount === 0
                    ? 'Genau ein Hauptkontakt erforderlich'
                    : 'Es darf nur einen Hauptkontakt geben'}
                </p>
              )}

              {/* Add member button (create mode with available members) */}
              {!isEditMode && unselectedMembers.length > 0 && (
                <div className="pt-1">
                  <Select
                    value=""
                    onValueChange={(memberId) => {
                      const member = unselectedMembers.find((m) => m.id === memberId);
                      if (member) handleAddMember(member);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <div className="flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Mitglied hinzufuegen</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {unselectedMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.lastName}, {m.firstName} ({m.memberNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Primary contact */}
            {selectedMembers.length > 0 && (
              <div className="space-y-1.5">
                <Label>Hauptkontakt</Label>
                <RadioGroup
                  value={primaryContactId}
                  onValueChange={setPrimaryContactId}
                  className="space-y-1"
                >
                  {selectedMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <RadioGroupItem value={m.id} id={`primary-${m.id}`} />
                      <label htmlFor={`primary-${m.id}`} className="text-sm cursor-pointer">
                        {m.firstName} {m.lastName}
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Dissolve button (edit mode only) */}
            {isEditMode && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDissolveConfirm(true)}
                disabled={isPending}
                className="sm:mr-auto"
              >
                Haushalt auflösen
              </Button>
            )}

            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Abbrechen
            </Button>

            <Button
              type="button"
              onClick={isEditMode ? handleUpdate : handleCreate}
              disabled={!isValid || isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Speichern' : 'Haushalt erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dissolve confirmation */}
      <AlertDialog open={showDissolveConfirm} onOpenChange={setShowDissolveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Haushalt auflösen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle Mitglieder werden aus dem Haushalt entfernt. Die Mitgliederdaten bleiben
              erhalten. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDissolve}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {dissolveHousehold.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Endgültig auflösen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export type { HouseholdDialogProps, SelectableMember };
