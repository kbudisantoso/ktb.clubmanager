'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  X,
  ArrowRightLeft,
  Users,
  Download,
  Mail,
  Pencil,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { VALID_TRANSITIONS, type MemberStatus } from '@ktb/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBulkChangeStatus, useUpdateMember } from '@/hooks/use-members';
import { useCreateHousehold } from '@/hooks/use-households';
import { useToast } from '@/hooks/use-toast';
import { MemberCsvExportDialog } from './member-csv-export';
import type { MemberListItem } from './member-list-table';

// ============================================================================
// Constants
// ============================================================================

/** German labels for status values */
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktiv',
  INACTIVE: 'Inaktiv',
  PENDING: 'Ausstehend',
  LEFT: 'Ausgetreten',
};

/** Fields available for bulk editing */
const BULK_EDIT_FIELDS = [
  { value: 'membershipType', label: 'Mitgliedsart' },
  { value: 'city', label: 'Ort' },
] as const;

/** Membership type options for bulk edit */
const MEMBERSHIP_TYPE_OPTIONS = [
  { value: 'ORDENTLICH', label: 'Ordentlich' },
  { value: 'PASSIV', label: 'Passiv' },
  { value: 'EHREN', label: 'Ehren' },
  { value: 'FOERDER', label: 'Foerder' },
  { value: 'JUGEND', label: 'Jugend' },
];

// ============================================================================
// Types
// ============================================================================

interface MemberBulkActionsProps {
  /** Currently selected member IDs */
  selectedIds: Set<string>;
  /** All currently loaded members for data access */
  members: MemberListItem[];
  /** Total count of all members */
  totalCount: number;
  /** Clear the current selection */
  onClearSelection: () => void;
  /** Called when household creation dialog should open with pre-selected member IDs */
  onCreateHousehold?: (memberIds: string[]) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Floating action bar displayed at the bottom of the viewport when 1+ members are selected.
 * Provides 5 bulk actions: status change, create household, CSV export, copy emails, bulk edit.
 * Follows the Linear/Gmail selection bar pattern.
 */
export function MemberBulkActions({
  selectedIds,
  members,
  totalCount,
  onClearSelection,
  onCreateHousehold,
}: MemberBulkActionsProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();
  const bulkChangeStatus = useBulkChangeStatus(slug);
  const updateMember = useUpdateMember(slug);
  const createHousehold = useCreateHousehold(slug);

  // Dialog states
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [householdDialogOpen, setHouseholdDialogOpen] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [statusConfirmState, setStatusConfirmState] = useState<{
    open: boolean;
    targetStatus: string;
  }>({ open: false, targetStatus: '' });

  // Bulk edit state
  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');

  const count = selectedIds.size;

  // Get the selected members data
  const selectedMembers = useMemo(
    () => members.filter((m) => selectedIds.has(m.id)),
    [members, selectedIds]
  );

  // Compute valid common transitions for all selected members
  const commonTransitions = useMemo(() => {
    if (selectedMembers.length === 0) return [];

    const transitionSets = selectedMembers.map((m) => {
      const transitions = VALID_TRANSITIONS[m.status as MemberStatus] ?? [];
      return new Set(transitions);
    });

    // Find intersection of all transition sets
    const first = transitionSets[0];
    if (!first) return [];

    return [...first].filter((status) => transitionSets.every((set) => set.has(status)));
  }, [selectedMembers]);

  // ---- Action: Bulk Status Change ----
  const handleBulkStatusChange = useCallback(
    async (targetStatus: string) => {
      const memberIds = [...selectedIds];

      // Store original statuses for undo
      const originalStatuses = selectedMembers.map((m) => ({
        id: m.id,
        status: m.status,
      }));

      try {
        await bulkChangeStatus.mutateAsync({
          memberIds,
          newStatus: targetStatus,
          reason: 'Sammelaenderung',
        });

        toast({
          title: `Status fuer ${memberIds.length} Mitglieder geaendert`,
          action: {
            label: 'Rueckgaengig',
            onClick: async () => {
              // Undo: restore original statuses individually
              for (const orig of originalStatuses) {
                try {
                  await bulkChangeStatus.mutateAsync({
                    memberIds: [orig.id],
                    newStatus: orig.status,
                    reason: 'Sammelaenderung rueckgaengig gemacht',
                  });
                } catch {
                  // Best effort undo
                }
              }
              toast({ title: 'Statusaenderung rueckgaengig gemacht' });
            },
          },
        });

        onClearSelection();
      } catch (err) {
        toast({
          title: 'Fehler bei der Statusaenderung',
          description: err instanceof Error ? err.message : 'Unbekannter Fehler',
          variant: 'destructive',
        });
      }
    },
    [selectedIds, selectedMembers, bulkChangeStatus, toast, onClearSelection]
  );

  // ---- Action: Create Household ----
  const handleCreateHousehold = useCallback(() => {
    if (onCreateHousehold) {
      onCreateHousehold([...selectedIds]);
    } else {
      setHouseholdDialogOpen(true);
    }
  }, [selectedIds, onCreateHousehold]);

  const handleHouseholdSubmit = useCallback(async () => {
    if (!householdName.trim()) return;

    try {
      await createHousehold.mutateAsync({
        name: householdName.trim(),
        memberIds: [...selectedIds],
      });

      toast({
        title: `Haushalt "${householdName.trim()}" erstellt`,
        description: `${selectedIds.size} Mitglieder zugeordnet`,
      });

      setHouseholdDialogOpen(false);
      setHouseholdName('');
      onClearSelection();
    } catch (err) {
      toast({
        title: 'Fehler beim Erstellen des Haushalts',
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    }
  }, [householdName, selectedIds, createHousehold, toast, onClearSelection]);

  // ---- Action: Copy Emails ----
  const handleCopyEmails = useCallback(async () => {
    const emails = selectedMembers.map((m) => m.email).filter(Boolean) as string[];

    if (emails.length === 0) {
      toast({ title: 'Keine E-Mail-Adressen vorhanden' });
      return;
    }

    try {
      await navigator.clipboard.writeText(emails.join(';'));
      toast({
        title: `${emails.length} E-Mail-Adresse${emails.length !== 1 ? 'n' : ''} kopiert`,
      });
    } catch {
      toast({
        title: 'Fehler beim Kopieren',
        variant: 'destructive',
      });
    }
  }, [selectedMembers, toast]);

  // ---- Action: Bulk Edit ----
  const handleBulkEditSubmit = useCallback(async () => {
    if (!editField || !editValue) return;

    try {
      for (const member of selectedMembers) {
        await updateMember.mutateAsync({
          id: member.id,
          [editField]: editValue,
        });
      }

      const fieldLabel = BULK_EDIT_FIELDS.find((f) => f.value === editField)?.label ?? editField;

      toast({
        title: `${fieldLabel} fuer ${selectedMembers.length} Mitglieder geaendert`,
        action: {
          label: 'Rueckgaengig',
          onClick: async () => {
            // Undo is complex for bulk edit — notify user
            toast({ title: 'Bitte manuell zuruecksetzen' });
          },
        },
      });

      setBulkEditDialogOpen(false);
      setEditField('');
      setEditValue('');
      onClearSelection();
    } catch (err) {
      toast({
        title: 'Fehler bei der Massenbearbeitung',
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    }
  }, [editField, editValue, selectedMembers, updateMember, toast, onClearSelection]);

  if (count === 0) return null;

  const canCreateHousehold = count >= 2;

  return (
    <>
      {/* Floating action bar */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-lg border bg-popover/95 backdrop-blur-sm px-4 py-2.5 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200"
        role="toolbar"
        aria-label="Massenaktionen"
      >
        {/* Selection count */}
        <span className="text-sm font-medium whitespace-nowrap">
          {count} von {totalCount} ausgewaehlt
        </span>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* 1. Bulk Status Change */}
        <TooltipProvider delayDuration={300}>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    disabled={commonTransitions.length === 0}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Status</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Status aendern</TooltipContent>
            </Tooltip>
            <DropdownMenuContent>
              {commonTransitions.length === 0 ? (
                <DropdownMenuItem disabled>Keine gemeinsamen Statusuebergaenge</DropdownMenuItem>
              ) : (
                commonTransitions.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setStatusConfirmState({ open: true, targetStatus: status })}
                  >
                    {STATUS_LABELS[status] ?? status}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 2. Create Household */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  disabled={!canCreateHousehold}
                  onClick={handleCreateHousehold}
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Haushalt</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {canCreateHousehold ? 'Haushalt erstellen' : 'Mindestens 2 Mitglieder auswaehlen'}
            </TooltipContent>
          </Tooltip>

          {/* 3. CSV Export */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setCsvDialogOpen(true)}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Als CSV exportieren</TooltipContent>
          </Tooltip>

          {/* 4. Copy Emails */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleCopyEmails}>
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">E-Mail</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>E-Mail-Adressen kopieren</TooltipContent>
          </Tooltip>

          {/* 5. Bulk Edit */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Bearbeiten</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Feld massenbearbeiten</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Close (X) button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClearSelection}
          aria-label="Auswahl aufheben"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Status Change Confirmation AlertDialog (CONV-010) */}
      <AlertDialog
        open={statusConfirmState.open}
        onOpenChange={(open) => {
          if (!open) setStatusConfirmState({ open: false, targetStatus: '' });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Status fuer {count} {count === 1 ? 'Mitglied' : 'Mitglieder'} aendern?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Der Status wird auf &ldquo;{STATUS_LABELS[statusConfirmState.targetStatus] ?? statusConfirmState.targetStatus}&rdquo; geaendert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleBulkStatusChange(statusConfirmState.targetStatus);
                setStatusConfirmState({ open: false, targetStatus: '' });
              }}
            >
              Status aendern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Export Dialog */}
      <MemberCsvExportDialog
        members={selectedMembers}
        open={csvDialogOpen}
        onOpenChange={setCsvDialogOpen}
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Massenbearbeitung</DialogTitle>
            <DialogDescription>
              Aendere ein Feld fuer {count} {count === 1 ? 'Mitglied' : 'Mitglieder'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Feld</Label>
              <Select
                value={editField}
                onValueChange={(v) => {
                  setEditField(v);
                  setEditValue('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Feld auswaehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {BULK_EDIT_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editField === 'membershipType' && (
              <div className="space-y-1.5">
                <Label>Neuer Wert</Label>
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mitgliedsart auswaehlen..." />
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
            )}

            {editField === 'city' && (
              <div className="space-y-1.5">
                <Label>Neuer Wert</Label>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Ort eingeben..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleBulkEditSubmit}
              disabled={!editField || !editValue || updateMember.isPending}
            >
              {updateMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Anwenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simple Household Creation Dialog (fallback when no onCreateHousehold callback) */}
      <Dialog open={householdDialogOpen} onOpenChange={setHouseholdDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Haushalt erstellen</DialogTitle>
            <DialogDescription>
              Erstelle einen neuen Haushalt mit {count} Mitgliedern.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="household-name">Haushaltsname</Label>
              <Input
                id="household-name"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="z.B. Familie Mustermann"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Mitglieder:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {selectedMembers.map((m) => (
                  <li key={m.id}>
                    {m.personType === 'LEGAL_ENTITY' && m.organizationName
                      ? m.organizationName
                      : `${m.lastName}, ${m.firstName}`}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHouseholdDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleHouseholdSubmit}
              disabled={!householdName.trim() || createHousehold.isPending}
            >
              {createHousehold.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
