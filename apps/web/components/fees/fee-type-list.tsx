'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useFeeTypes, useDeleteFeeType } from '@/hooks/use-fee-types';
import { FeeTypeForm } from './fee-type-form';
import type { FeeTypeResponse } from '@ktb/shared';

interface FeeTypeListProps {
  slug: string;
}

/**
 * FeeType CRUD list component.
 * Displays a table of fee types with create, edit, and delete functionality.
 * Used in the Beitragsmodell section of Settings.
 */
export function FeeTypeList({ slug }: FeeTypeListProps) {
  const { data: feeTypes, isLoading } = useFeeTypes(slug);
  const deleteMutation = useDeleteFeeType(slug);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState<FeeTypeResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeTypeResponse | null>(null);

  function openCreate() {
    setEditingFeeType(null);
    setFormOpen(true);
  }

  function openEdit(feeType: FeeTypeResponse) {
    setEditingFeeType(feeType);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48 hidden lg:block" />
                <Skeleton className="h-5 w-12 rounded-md" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = feeTypes ?? [];
  const isEmpty = items.length === 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Beitragsarten</CardTitle>
              <CardDescription>
                Definiere, wie deine Mitglieder zahlen (z.B. Einzelbeitrag, Familientarif)
              </CardDescription>
            </div>
            {!isEmpty && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Beitragsart erstellen
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Noch keine Beitragsarten</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Erstelle Beitragsarten, um festzulegen, wie deine Mitglieder zahlen (z.B.
                Einzelbeitrag, Familientarif).
              </p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Erste Beitragsart erstellen
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Beschreibung</TableHead>
                  <TableHead>Aktiv</TableHead>
                  <TableHead className="w-24">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((ft) => (
                  <TableRow key={ft.id}>
                    <TableCell className="font-medium">{ft.name}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {ft.description || '\u2014'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          ft.isActive
                            ? 'bg-success/15 text-success border-success/25'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {ft.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(ft)}
                          aria-label={`Beitragsart ${ft.name} bearbeiten`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(ft)}
                          aria-label={`Beitragsart ${ft.name} l\u00f6schen`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <FeeTypeForm open={formOpen} onOpenChange={setFormOpen} editingFeeType={editingFeeType} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Beitragsart l\u00f6schen"
        description={`M\u00f6chtest du die Beitragsart \u201e${deleteTarget?.name}\u201c wirklich l\u00f6schen? Mitglieder mit dieser Beitragsart behalten ihre aktuelle Zuweisung, die Beitragsart kann aber nicht mehr neu zugewiesen werden.`}
        confirmLabel="Beitragsart l\u00f6schen"
        cancelLabel="Abbrechen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
