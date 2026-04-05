'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { CreateFeeTypeSchema, type CreateFeeType, type FeeTypeResponse } from '@ktb/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateFeeType, useUpdateFeeType } from '@/hooks/use-fee-types';

type FeeTypeFormValues = (typeof CreateFeeTypeSchema)['_input'];

const DEFAULT_VALUES: FeeTypeFormValues = {
  name: '',
  description: '',
  isActive: true,
};

interface FeeTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFeeType: FeeTypeResponse | null;
}

/**
 * Dialog for creating or editing a fee type.
 * Uses react-hook-form with zodResolver for validation.
 */
export function FeeTypeForm({ open, onOpenChange, editingFeeType }: FeeTypeFormProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const isEditing = !!editingFeeType;

  const createMutation = useCreateFeeType(slug);
  const updateMutation = useUpdateFeeType(slug);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FeeTypeFormValues>({
    resolver: zodResolver(CreateFeeTypeSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // Reset form when dialog opens/closes or editing target changes
  useEffect(() => {
    if (open) {
      if (editingFeeType) {
        reset({
          name: editingFeeType.name,
          description: editingFeeType.description ?? '',
          isActive: editingFeeType.isActive,
        });
      } else {
        reset(DEFAULT_VALUES);
      }
    }
  }, [open, editingFeeType, reset]);

  async function onSubmit(data: FeeTypeFormValues) {
    const payload: CreateFeeType = {
      name: data.name,
      description: data.description || undefined,
      isActive: data.isActive ?? true,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({
        id: editingFeeType.id,
        data: payload,
      });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const name = watch('name');
  const isActive = watch('isActive');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Beitragsart bearbeiten' : 'Beitragsart erstellen'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Ändere die Konfiguration der Beitragsart.'
              : 'Erstelle eine neue Beitragsart, die festlegt, wie ein Mitglied zahlt.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 py-4 overflow-y-auto">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="ft-name">Name</Label>
              <Input
                id="ft-name"
                placeholder="z.B. Einzelbeitrag"
                maxLength={100}
                autoFocus
                {...register('name')}
              />
              {errors.name?.message && (
                <p className="text-destructive text-sm">{errors.name.message}</p>
              )}
            </div>

            {/* Beschreibung */}
            <div className="space-y-2">
              <Label htmlFor="ft-description">Beschreibung</Label>
              <Textarea
                id="ft-description"
                placeholder="Optionale Beschreibung"
                maxLength={500}
                rows={2}
                {...register('description')}
              />
              {errors.description?.message && (
                <p className="text-destructive text-sm">{errors.description.message}</p>
              )}
            </div>

            {/* Aktiv */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="ft-isActive" className="text-sm font-medium">
                  Aktiv
                </Label>
                <p className="text-xs text-muted-foreground">
                  Inaktive Beitragsarten können nicht mehr zugewiesen werden.
                </p>
              </div>
              <Switch
                id="ft-isActive"
                checked={isActive}
                onCheckedChange={(checked) => setValue('isActive', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending || !name}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
