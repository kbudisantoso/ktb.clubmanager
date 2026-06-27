'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  CreateFeeCategorySchema,
  type CreateFeeCategory,
  type FeeCategoryResponse,
  type FeeCategoryScope,
} from '@ktb/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateFeeCategory, useUpdateFeeCategory } from '@/hooks/use-fee-categories';
import { useMembershipTypes } from '@/hooks/use-membership-types';

/**
 * Form values type uses the schema _input for zodResolver compatibility.
 */
type FeeCategoryFormValues = (typeof CreateFeeCategorySchema)['_input'];

const DEFAULT_VALUES: FeeCategoryFormValues = {
  name: '',
  description: '',
  amount: '',
  billingInterval: 'ANNUALLY',
  isOneTime: false,
  proRataEligible: false,
  sortOrder: 0,
  scope: 'ALL_MEMBERS',
  membershipTypeIds: [],
};

interface FeeCategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: FeeCategoryResponse | null;
}

/**
 * Dialog for creating or editing a fee category.
 * Uses react-hook-form with zodResolver for validation.
 */
export function FeeCategoryForm({ open, onOpenChange, editingCategory }: FeeCategoryFormProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const isEditing = !!editingCategory;

  const createMutation = useCreateFeeCategory(slug);
  const updateMutation = useUpdateFeeCategory(slug);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: membershipTypes } = useMembershipTypes(slug);

  // Track selected membership type IDs for BY_MEMBERSHIP_TYPE scope
  const [selectedMembershipTypeIds, setSelectedMembershipTypeIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FeeCategoryFormValues>({
    resolver: zodResolver(CreateFeeCategorySchema),
    defaultValues: DEFAULT_VALUES,
  });

  // Reset form when dialog opens/closes or editing target changes
  useEffect(() => {
    if (open) {
      if (editingCategory) {
        const existingMtIds =
          editingCategory.membershipTypes?.map((mt) => mt.membershipTypeId) ?? [];
        reset({
          name: editingCategory.name,
          description: editingCategory.description ?? '',
          amount: editingCategory.amount,
          billingInterval: editingCategory.billingInterval,
          isOneTime: editingCategory.isOneTime,
          proRataEligible: editingCategory.proRataEligible,
          sortOrder: editingCategory.sortOrder,
          scope: editingCategory.scope,
          membershipTypeIds: existingMtIds,
        });
        setSelectedMembershipTypeIds(existingMtIds);
      } else {
        reset(DEFAULT_VALUES);
        setSelectedMembershipTypeIds([]);
      }
    }
  }, [open, editingCategory, reset]);

  async function onSubmit(data: FeeCategoryFormValues) {
    const scope = (data.scope ?? 'ALL_MEMBERS') as FeeCategoryScope;
    const payload: CreateFeeCategory = {
      name: data.name,
      description: data.description || undefined,
      amount: data.amount,
      billingInterval: data.billingInterval ?? 'ANNUALLY',
      isOneTime: data.isOneTime ?? false,
      proRataEligible: data.proRataEligible ?? false,
      sortOrder: data.sortOrder ?? 0,
      scope,
      membershipTypeIds: scope === 'BY_MEMBERSHIP_TYPE' ? selectedMembershipTypeIds : undefined,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({
        id: editingCategory.id,
        data: payload,
      });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const name = watch('name');
  const amount = watch('amount');
  const isOneTime = watch('isOneTime');
  const proRataEligible = watch('proRataEligible');
  const billingInterval = watch('billingInterval');
  const watchedScope = watch('scope') as FeeCategoryScope | undefined;

  function handleMembershipTypeToggle(mtId: string, checked: boolean) {
    setSelectedMembershipTypeIds((prev) =>
      checked ? [...prev, mtId] : prev.filter((id) => id !== mtId)
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Beitragskategorie bearbeiten' : 'Beitragskategorie erstellen'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Ändere die Konfiguration der Beitragskategorie.'
              : 'Erstelle eine neue Beitragskategorie mit Betrag und Abrechnungszeitraum.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 py-4 overflow-y-auto">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="fc-name">Name</Label>
              <Input
                id="fc-name"
                placeholder="z.B. Tennisabteilung"
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
              <Label htmlFor="fc-description">Beschreibung</Label>
              <Textarea
                id="fc-description"
                placeholder="Optionale Beschreibung"
                maxLength={500}
                rows={2}
                {...register('description')}
              />
              {errors.description?.message && (
                <p className="text-destructive text-sm">{errors.description.message}</p>
              )}
            </div>

            {/* Betrag (EUR) */}
            <div className="space-y-2">
              <Label htmlFor="fc-amount">Betrag (EUR)</Label>
              <Input
                id="fc-amount"
                placeholder="z.B. 120.00"
                inputMode="decimal"
                {...register('amount')}
              />
              {errors.amount?.message && (
                <p className="text-destructive text-sm">{errors.amount.message}</p>
              )}
            </div>

            {/* Abrechnungszeitraum */}
            <div className="space-y-2">
              <Label htmlFor="fc-interval">Abrechnungszeitraum</Label>
              <Select
                value={billingInterval}
                onValueChange={(val) =>
                  setValue('billingInterval', val as FeeCategoryFormValues['billingInterval'])
                }
              >
                <SelectTrigger id="fc-interval" className="w-full">
                  <SelectValue placeholder="Zeitraum wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monatlich</SelectItem>
                  <SelectItem value="QUARTERLY">Vierteljährlich</SelectItem>
                  <SelectItem value="ANNUALLY">Jährlich</SelectItem>
                </SelectContent>
              </Select>
              {errors.billingInterval?.message && (
                <p className="text-destructive text-sm">{errors.billingInterval.message}</p>
              )}
            </div>

            {/* Einmalige Gebühr */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="fc-isOneTime" className="text-sm font-medium">
                  Einmalige Gebühr (z.B. Aufnahmegebühr)
                </Label>
              </div>
              <Switch
                id="fc-isOneTime"
                checked={isOneTime}
                onCheckedChange={(checked) => setValue('isOneTime', checked)}
              />
            </div>

            {/* Anteilige Berechnung (pro rata) */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="fc-proRataEligible" className="text-sm font-medium">
                  Anteilig bei unterjährigem Eintritt berechnen
                </Label>
                <p className="text-muted-foreground text-sm">
                  Nur wirksam, wenn der Verein anteilige Beiträge nutzt. Für laufende Zusatzbeiträge
                  (z.B. Spartenbeitrag); einmalige Gebühren bleiben voll.
                </p>
              </div>
              <Switch
                id="fc-proRataEligible"
                checked={proRataEligible}
                onCheckedChange={(checked) => setValue('proRataEligible', checked)}
              />
            </div>

            {/* Sortierung */}
            <div className="space-y-2">
              <Label htmlFor="fc-sortOrder">Sortierung</Label>
              <Input
                id="fc-sortOrder"
                type="number"
                min={0}
                {...register('sortOrder', { valueAsNumber: true })}
              />
              {errors.sortOrder?.message && (
                <p className="text-destructive text-sm">{errors.sortOrder.message}</p>
              )}
            </div>

            {/* Zuordnung (Scope) */}
            <div className="space-y-2">
              <Label htmlFor="fc-scope">Zuordnung</Label>
              <Select
                value={watchedScope ?? 'ALL_MEMBERS'}
                onValueChange={(val) => setValue('scope', val as FeeCategoryScope)}
              >
                <SelectTrigger id="fc-scope" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_MEMBERS">Alle Mitglieder</SelectItem>
                  <SelectItem value="BY_MEMBERSHIP_TYPE">Nach Mitgliedsart</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individuell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional MembershipType checkboxes */}
            {watchedScope === 'BY_MEMBERSHIP_TYPE' && (
              <div className="space-y-2">
                <Label>Mitgliedsarten</Label>
                {membershipTypes && membershipTypes.length > 0 ? (
                  <div className="space-y-2">
                    {membershipTypes.map((mt) => (
                      <div key={mt.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mt-${mt.id}`}
                          checked={selectedMembershipTypeIds.includes(mt.id)}
                          onCheckedChange={(checked) =>
                            handleMembershipTypeToggle(mt.id, !!checked)
                          }
                        />
                        <Label htmlFor={`mt-${mt.id}`} className="font-normal">
                          {mt.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Keine Mitgliedsarten vorhanden.</p>
                )}
                {selectedMembershipTypeIds.length === 0 &&
                  membershipTypes &&
                  membershipTypes.length > 0 && (
                    <p className="text-sm text-destructive">
                      Wähle mindestens eine Mitgliedsart aus.
                    </p>
                  )}
              </div>
            )}
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
            <Button type="submit" disabled={isPending || !name || !amount}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
