'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
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
import { useFeeCategories, useDeleteFeeCategory } from '@/hooks/use-fee-categories';
import { FeeCategoryForm } from './fee-category-form';
import type { FeeCategoryResponse } from '@ktb/shared';

const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: 'Monatlich',
  QUARTERLY: 'Vierteljährlich',
  ANNUALLY: 'Jährlich',
};

function formatAmount(amount: string): string {
  return (
    new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(amount)) + ' EUR'
  );
}

/**
 * Fee category list with CRUD actions.
 * Displays a table of fee categories with create, edit, and delete functionality.
 */
export function FeeCategoryList() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: categories, isLoading } = useFeeCategories(slug);
  const deleteMutation = useDeleteFeeCategory(slug);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeeCategoryResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeCategoryResponse | null>(null);

  function openCreate() {
    setEditingCategory(null);
    setFormOpen(true);
  }

  function openEdit(category: FeeCategoryResponse) {
    setEditingCategory(category);
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
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-12 rounded-md" />
                <Skeleton className="h-5 w-12 rounded-md" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = categories ?? [];
  const isEmpty = items.length === 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>
                Zusaetzliche Beitragspositionen neben dem Grundbeitrag der Mitgliedsart
              </CardDescription>
            </div>
            {!isEmpty && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Kategorie erstellen
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Noch keine Beitragskategorien</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Erstelle Beitragskategorien für zusätzliche Positionen neben dem Grundbeitrag der
                Mitgliedsart.
              </p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Erste Kategorie erstellen
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Beschreibung</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead>Rhythmus</TableHead>
                  <TableHead>Einmalig</TableHead>
                  <TableHead>Aktiv</TableHead>
                  <TableHead className="w-24">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {category.description || '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(category.amount)}
                    </TableCell>
                    <TableCell>
                      {category.isOneTime
                        ? 'Einmalig'
                        : (INTERVAL_LABELS[category.billingInterval] ?? category.billingInterval)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.isOneTime ? 'default' : 'secondary'}>
                        {category.isOneTime ? 'Ja' : 'Nein'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          category.isActive
                            ? 'bg-success/15 text-success border-success/25'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {category.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(category)}
                          aria-label={`${category.name} bearbeiten`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(category)}
                          aria-label={`${category.name} löschen`}
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
      <FeeCategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingCategory={editingCategory}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Beitragskategorie löschen"
        description={`Möchtest du die Kategorie „${deleteTarget?.name}" wirklich löschen? Bestehende Forderungen bleiben erhalten.`}
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
