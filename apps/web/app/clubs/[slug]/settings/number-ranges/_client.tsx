'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useActiveClub } from '@/lib/club-store';
import { useHasPermission } from '@/lib/permission-hooks';
import { AccessDenied } from '@/components/access-denied';
import {
  useNumberRanges,
  useCreateNumberRange,
  useUpdateNumberRange,
  useDeleteNumberRange,
} from '@/hooks/use-number-ranges';
import type { NumberRange } from '@/hooks/use-number-ranges';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Loader2, Hash, CheckCircle2, Info } from 'lucide-react';

/** Entity type labels in German */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  MEMBER: 'Mitgliedsnummer',
  TRANSACTION: 'Buchungsnummer',
  SEPA_MANDATE: 'Mandatsreferenz',
};

/** Entity types available for selection */
const ENTITY_TYPES = ['MEMBER', 'TRANSACTION', 'SEPA_MANDATE'] as const;

/** Entity types disabled in Phase 10 (not yet available) */
const DISABLED_ENTITY_TYPES = ['TRANSACTION', 'SEPA_MANDATE'];

/**
 * Format a preview number from prefix, value, and pad length.
 * Resolves {YYYY} placeholder to current year.
 */
function formatPreview(prefix: string, value: number, padLength: number): string {
  let resolvedPrefix = prefix;
  if (resolvedPrefix.includes('{YYYY}')) {
    resolvedPrefix = resolvedPrefix.replace('{YYYY}', new Date().getFullYear().toString());
  }
  const paddedValue = String(value).padStart(padLength, '0');
  return `${resolvedPrefix}${paddedValue}`;
}

interface NumberRangeFormState {
  entityType: string;
  prefix: string;
  padLength: number;
  yearReset: boolean;
}

const DEFAULT_FORM_STATE: NumberRangeFormState = {
  entityType: 'MEMBER',
  prefix: '',
  padLength: 4,
  yearReset: false,
};

export function NumberRangesSettingsClient() {
  const params = useParams<{ slug: string }>();
  const activeClub = useActiveClub();
  const hasPermission = useHasPermission('club_settings:manage');
  const [permissionChecked, setPermissionChecked] = useState(false);
  const { toast } = useToast();

  // CRUD hooks
  const { data: numberRanges, isLoading, error } = useNumberRanges(params.slug);
  const createMutation = useCreateNumberRange(params.slug);
  const updateMutation = useUpdateNumberRange(params.slug);
  const deleteMutation = useDeleteNumberRange(params.slug);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<NumberRange | null>(null);
  const [formState, setFormState] = useState<NumberRangeFormState>(DEFAULT_FORM_STATE);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<NumberRange | null>(null);

  // Existing entity types (to prevent duplicates in create)
  const existingEntityTypes = useMemo(
    () => new Set((numberRanges ?? []).map((r) => r.entityType)),
    [numberRanges]
  );

  // Wait for hydration before checking permission
  useEffect(() => {
    if (activeClub) {
      setPermissionChecked(true);
    }
  }, [activeClub]);

  // Live preview
  const preview = useMemo(
    () => formatPreview(formState.prefix, 1, formState.padLength),
    [formState.prefix, formState.padLength]
  );

  /** Open create dialog */
  function openCreate(prefilledEntityType?: string) {
    setEditingRange(null);
    setFormState({
      ...DEFAULT_FORM_STATE,
      entityType: prefilledEntityType ?? 'MEMBER',
    });
    setDialogOpen(true);
  }

  /** Open edit dialog */
  function openEdit(range: NumberRange) {
    setEditingRange(range);
    setFormState({
      entityType: range.entityType,
      prefix: range.prefix,
      padLength: range.padLength,
      yearReset: range.yearReset,
    });
    setDialogOpen(true);
  }

  /** Handle form submission */
  async function handleSubmit() {
    if (editingRange) {
      // Update
      try {
        await updateMutation.mutateAsync({
          id: editingRange.id,
          data: {
            prefix: formState.prefix,
            padLength: formState.padLength,
            yearReset: formState.yearReset,
          },
        });
        toast({
          title: 'Nummernkreis aktualisiert',
          description: `${ENTITY_TYPE_LABELS[formState.entityType] ?? formState.entityType} wurde aktualisiert.`,
        });
        setDialogOpen(false);
      } catch (err) {
        toast({
          title: 'Fehler',
          description:
            err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Nummernkreises',
          variant: 'destructive',
        });
      }
    } else {
      // Create
      try {
        await createMutation.mutateAsync({
          entityType: formState.entityType,
          prefix: formState.prefix || undefined,
          padLength: formState.padLength,
          yearReset: formState.yearReset,
        });
        toast({
          title: 'Nummernkreis erstellt',
          description: `${ENTITY_TYPE_LABELS[formState.entityType] ?? formState.entityType} wurde eingerichtet.`,
        });
        setDialogOpen(false);
      } catch (err) {
        toast({
          title: 'Fehler',
          description:
            err instanceof Error ? err.message : 'Fehler beim Erstellen des Nummernkreises',
          variant: 'destructive',
        });
      }
    }
  }

  /** Handle delete */
  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({
        title: 'Nummernkreis geloescht',
        description: `${ENTITY_TYPE_LABELS[deleteTarget.entityType] ?? deleteTarget.entityType} wurde entfernt.`,
      });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Fehler beim Loeschen des Nummernkreises',
        variant: 'destructive',
      });
      setDeleteTarget(null);
    }
  }

  // Show loading while checking permissions
  if (!permissionChecked) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Show access denied if no permission
  if (!hasPermission) {
    return (
      <AccessDenied
        feature="die Nummernkreise-Einstellungen"
        backHref={`/clubs/${params.slug}/dashboard`}
        backLabel="Zurueck zum Verein"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">
            {error instanceof Error ? error.message : 'Fehler beim Laden der Nummernkreise'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const ranges = numberRanges ?? [];
  const isEmpty = ranges.length === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Nummernkreise
              </CardTitle>
              <CardDescription>
                Konfiguriere die automatische Nummernvergabe fuer Mitglieder, Buchungen und
                SEPA-Mandate.
              </CardDescription>
            </div>
            {!isEmpty && (
              <Button onClick={() => openCreate()}>
                <Plus className="h-4 w-4 mr-2" />
                Nummernkreis hinzufuegen
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Hash className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Noch keine Nummernkreise konfiguriert</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Richte mindestens einen Nummernkreis fuer Mitgliedsnummern ein, bevor du Mitglieder
                anlegen kannst.
              </p>
              <Button onClick={() => openCreate('MEMBER')}>
                <Plus className="h-4 w-4 mr-2" />
                Nummernkreis fuer Mitglieder einrichten
              </Button>
            </div>
          ) : (
            /* Table */
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typ</TableHead>
                    <TableHead>Praefix</TableHead>
                    <TableHead className="text-center">Laenge</TableHead>
                    <TableHead className="text-center">Jaehrlich zuruecksetzen</TableHead>
                    <TableHead className="text-right">Aktueller Wert</TableHead>
                    <TableHead>Naechste Nummer</TableHead>
                    <TableHead className="w-25"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranges.map((range) => (
                    <TableRow key={range.id}>
                      <TableCell className="font-medium">
                        {ENTITY_TYPE_LABELS[range.entityType] ?? range.entityType}
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {range.prefix || '(kein)'}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">{range.padLength}</TableCell>
                      <TableCell className="text-center">
                        {range.yearReset ? (
                          <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">{range.currentValue}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {formatPreview(range.prefix, range.currentValue + 1, range.padLength)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(range)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Bearbeiten</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={range.currentValue > 0}
                                onClick={() => setDeleteTarget(range)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {range.currentValue > 0
                                ? 'Kann nicht geloescht werden (bereits Nummern vergeben)'
                                : 'Loeschen'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRange ? 'Nummernkreis bearbeiten' : 'Nummernkreis hinzufuegen'}
            </DialogTitle>
            <DialogDescription>
              {editingRange
                ? 'Aendere die Konfiguration des Nummernkreises.'
                : 'Konfiguriere einen neuen Nummernkreis fuer die automatische Nummernvergabe.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Entity Type */}
            <div className="space-y-2">
              <Label htmlFor="entityType">Typ</Label>
              {editingRange ? (
                <Input
                  id="entityType"
                  value={ENTITY_TYPE_LABELS[formState.entityType] ?? formState.entityType}
                  disabled
                />
              ) : (
                <Select
                  value={formState.entityType}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, entityType: value }))
                  }
                >
                  <SelectTrigger id="entityType">
                    <SelectValue placeholder="Typ waehlen" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((type) => {
                      const isDisabled =
                        DISABLED_ENTITY_TYPES.includes(type) || existingEntityTypes.has(type);
                      const isExisting = existingEntityTypes.has(type);
                      return (
                        <SelectItem key={type} value={type} disabled={isDisabled}>
                          <span className="flex items-center gap-2">
                            {ENTITY_TYPE_LABELS[type]}
                            {isExisting && (
                              <span className="text-xs text-muted-foreground">
                                (bereits vorhanden)
                              </span>
                            )}
                            {DISABLED_ENTITY_TYPES.includes(type) && !isExisting && (
                              <span className="text-xs text-muted-foreground">
                                (verfuegbar in spaeterer Phase)
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Prefix */}
            <div className="space-y-2">
              <Label htmlFor="prefix">Praefix</Label>
              <Input
                id="prefix"
                value={formState.prefix}
                onChange={(e) => setFormState((prev) => ({ ...prev, prefix: e.target.value }))}
                placeholder="z.B. M- oder TSV-{YYYY}-"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Optional. Verwende {'{YYYY}'} als Platzhalter fuer das aktuelle Jahr.
              </p>
            </div>

            {/* Pad Length */}
            <div className="space-y-2">
              <Label htmlFor="padLength">Laenge (Stellen)</Label>
              <Input
                id="padLength"
                type="number"
                min={1}
                max={10}
                value={formState.padLength}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    padLength: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Anzahl der Ziffern (1-10). Bei 4 Stellen wird z.B. &quot;0001&quot; erzeugt.
              </p>
            </div>

            {/* Year Reset */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="yearReset" className="text-sm font-medium">
                  Jaehrlich zuruecksetzen
                </Label>
                <p className="text-xs text-muted-foreground">
                  Nummerierung wird jaehrlich zurueckgesetzt
                </p>
              </div>
              <Switch
                id="yearReset"
                checked={formState.yearReset}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, yearReset: checked }))
                }
              />
            </div>

            {/* Live Preview */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="text-sm font-medium mb-1">Vorschau</div>
              <div className="font-mono text-lg">{preview}</div>
              <p className="text-xs text-muted-foreground mt-1">
                So sieht die naechste generierte Nummer aus.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingRange ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nummernkreis loeschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Moechtest du den Nummernkreis &quot;
              {ENTITY_TYPE_LABELS[deleteTarget?.entityType ?? ''] ?? deleteTarget?.entityType}
              &quot; wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Loeschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
