'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useHasPermission } from '@/lib/permission-hooks';
import { AccessDenied } from '@/components/access-denied';
import {
  useMembershipTypes,
  useCreateMembershipType,
  useUpdateMembershipType,
  useDeleteMembershipType,
} from '@/hooks/use-membership-types';
import type { MembershipType } from '@/hooks/use-membership-types';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Loader2, IdCard, Check, Minus } from 'lucide-react';

interface MembershipTypeFormState {
  name: string;
  code: string;
  description: string;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  vote: boolean;
  assemblyAttendance: boolean;
  eligibleForOffice: boolean;
}

const DEFAULT_FORM_STATE: MembershipTypeFormState = {
  name: '',
  code: '',
  description: '',
  isDefault: false,
  sortOrder: 0,
  isActive: true,
  vote: true,
  assemblyAttendance: true,
  eligibleForOffice: true,
};

/** Render a boolean value as check or minus icon */
function BooleanIcon({ value }: { value: boolean }) {
  return value ? (
    <Check className="h-4 w-4 text-success mx-auto" />
  ) : (
    <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
  );
}

export function MembershipTypesSettingsClient() {
  const params = useParams<{ slug: string }>();
  const hasPermission = useHasPermission('club:settings');
  const { toast } = useToast();

  // CRUD hooks
  const { data: membershipTypes, isLoading, error } = useMembershipTypes(params.slug);
  const createMutation = useCreateMembershipType(params.slug);
  const updateMutation = useUpdateMembershipType(params.slug);
  const deleteMutation = useDeleteMembershipType(params.slug);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MembershipType | null>(null);
  const [formState, setFormState] = useState<MembershipTypeFormState>(DEFAULT_FORM_STATE);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<MembershipType | null>(null);

  /** Open create dialog */
  function openCreate() {
    setEditingType(null);
    setFormState(DEFAULT_FORM_STATE);
    setDialogOpen(true);
  }

  /** Open edit dialog */
  function openEdit(type: MembershipType) {
    setEditingType(type);
    setFormState({
      name: type.name,
      code: type.code,
      description: type.description ?? '',
      isDefault: type.isDefault,
      sortOrder: type.sortOrder,
      isActive: type.isActive,
      vote: type.vote,
      assemblyAttendance: type.assemblyAttendance,
      eligibleForOffice: type.eligibleForOffice,
    });
    setDialogOpen(true);
  }

  /** Handle form submission */
  async function handleSubmit() {
    const payload = {
      name: formState.name,
      code: formState.code.toUpperCase(),
      description: formState.description || undefined,
      isDefault: formState.isDefault,
      sortOrder: formState.sortOrder,
      isActive: formState.isActive,
      vote: formState.vote,
      assemblyAttendance: formState.assemblyAttendance,
      eligibleForOffice: formState.eligibleForOffice,
    };

    if (editingType) {
      // Update
      try {
        await updateMutation.mutateAsync({
          id: editingType.id,
          data: payload,
        });
        toast({
          title: 'Mitgliedsart aktualisiert',
          description: `"${formState.name}" wurde aktualisiert.`,
        });
        setDialogOpen(false);
      } catch (err) {
        toast({
          title: 'Fehler',
          description:
            err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Mitgliedsart',
          variant: 'destructive',
        });
      }
    } else {
      // Create
      try {
        await createMutation.mutateAsync(payload);
        toast({
          title: 'Mitgliedsart erstellt',
          description: `"${formState.name}" wurde erstellt.`,
        });
        setDialogOpen(false);
      } catch (err) {
        toast({
          title: 'Fehler',
          description:
            err instanceof Error ? err.message : 'Fehler beim Erstellen der Mitgliedsart',
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
        title: 'Mitgliedsart gelöscht',
        description: `"${deleteTarget.name}" wurde entfernt.`,
      });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Fehler beim Löschen der Mitgliedsart',
        variant: 'destructive',
      });
      setDeleteTarget(null);
    }
  }

  // Show access denied if no permission (server already validated club access)
  if (!hasPermission) {
    return (
      <AccessDenied
        feature="die Mitgliedsarten-Einstellungen"
        backHref={`/clubs/${params.slug}/dashboard`}
        backLabel="Zurück zum Verein"
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
            {error instanceof Error ? error.message : 'Fehler beim Laden der Mitgliedsarten'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const types = membershipTypes ?? [];
  const isEmpty = types.length === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IdCard className="h-5 w-5" />
                Mitgliedsarten
              </CardTitle>
              <CardDescription>
                Konfiguriere die Mitgliedsarten deines Vereins mit Rechten und Eigenschaften.
              </CardDescription>
            </div>
            {!isEmpty && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Mitgliedsart erstellen
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <IdCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Keine Mitgliedsarten konfiguriert</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Richte mindestens eine Mitgliedsart ein, um Mitglieder nach Typ zu unterscheiden.
              </p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Mitgliedsart erstellen
              </Button>
            </div>
          ) : (
            /* Table */
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-24">Sortierung</TableHead>
                    <TableHead>Kürzel</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Standard</TableHead>
                    <TableHead className="text-center">Stimmrecht</TableHead>
                    <TableHead className="text-center">Versammlung</TableHead>
                    <TableHead className="text-center">Wählbar</TableHead>
                    <TableHead className="text-center">Aktiv</TableHead>
                    <TableHead className="w-25"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="text-center">{type.sortOrder}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">{type.code}</code>
                      </TableCell>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell className="text-center">
                        <BooleanIcon value={type.isDefault} />
                      </TableCell>
                      <TableCell className="text-center">
                        <BooleanIcon value={type.vote} />
                      </TableCell>
                      <TableCell className="text-center">
                        <BooleanIcon value={type.assemblyAttendance} />
                      </TableCell>
                      <TableCell className="text-center">
                        <BooleanIcon value={type.eligibleForOffice} />
                      </TableCell>
                      <TableCell className="text-center">
                        <BooleanIcon value={type.isActive} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(type)}>
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
                                onClick={() => setDeleteTarget(type)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Löschen</TooltipContent>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Mitgliedsart bearbeiten' : 'Mitgliedsart erstellen'}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? 'Ändere die Konfiguration der Mitgliedsart.'
                : 'Erstelle eine neue Mitgliedsart mit Rechten und Eigenschaften.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Ordentliches Mitglied"
                maxLength={100}
              />
            </div>

            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Kürzel</Label>
              <Input
                id="code"
                value={formState.code}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="z.B. ORDENTLICH"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Eindeutiger Code in Großbuchstaben (A-Z, 0-9, _).
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optionale Beschreibung der Mitgliedsart"
                maxLength={500}
                rows={2}
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sortierung</Label>
              <Input
                id="sortOrder"
                type="number"
                min={0}
                value={formState.sortOrder}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    sortOrder: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Bestimmt die Reihenfolge in Listen (aufsteigend).
              </p>
            </div>

            {/* isDefault Switch */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isDefault" className="text-sm font-medium">
                  Standard-Mitgliedsart
                </Label>
                <p className="text-xs text-muted-foreground">
                  Wird bei neuen Mitgliedern automatisch vorausgewählt
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={formState.isDefault}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, isDefault: checked }))
                }
              />
            </div>

            {/* isActive Switch */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive" className="text-sm font-medium">
                  Aktiv
                </Label>
                <p className="text-xs text-muted-foreground">
                  Inaktive Mitgliedsarten sind nicht mehr auswählbar
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formState.isActive}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>

            {/* vote Switch */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="vote" className="text-sm font-medium">
                  Stimmrecht
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mitglieder dieses Typs haben Stimmrecht bei Abstimmungen
                </p>
              </div>
              <Switch
                id="vote"
                checked={formState.vote}
                onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, vote: checked }))}
              />
            </div>

            {/* assemblyAttendance Switch */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="assemblyAttendance" className="text-sm font-medium">
                  Versammlungsteilnahme
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mitglieder können an der Mitgliederversammlung teilnehmen
                </p>
              </div>
              <Switch
                id="assemblyAttendance"
                checked={formState.assemblyAttendance}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, assemblyAttendance: checked }))
                }
              />
            </div>

            {/* eligibleForOffice Switch */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="eligibleForOffice" className="text-sm font-medium">
                  Wählbar
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mitglieder können für Vorstandsämter kandidieren
                </p>
              </div>
              <Switch
                id="eligibleForOffice"
                checked={formState.eligibleForOffice}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, eligibleForOffice: checked }))
                }
              />
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
              disabled={
                !formState.name ||
                !formState.code ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingType ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitgliedsart löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du die Mitgliedsart &quot;{deleteTarget?.name}&quot; wirklich löschen? Diese
              Aktion kann nicht rückgängig gemacht werden.
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
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
