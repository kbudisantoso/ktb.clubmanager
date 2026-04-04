'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { UpdateMemberSchema } from '@ktb/shared';
import type { FeeTypeResponse, CrossTableEntryResponse } from '@ktb/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useUpdateMember } from '@/hooks/use-members';
import { useFeeTypes } from '@/hooks/use-fee-types';
import { useCrossTable } from '@/hooks/use-cross-table';
import { useClubSettings } from '@/hooks/use-club-settings';
import { useToast } from '@/hooks/use-toast';
import type { MemberDetail } from '@/hooks/use-member-detail';
import { BasicInfoSection } from './basic-info-section';
import { AddressContactSection } from './address-contact-section';
import { MembershipSection } from './membership-section';
import { NotesSection } from './notes-section';

// ============================================================================
// Types
// ============================================================================

/** Form values for the update form (uses schema _input for zodResolver compatibility) */
type FormValues = (typeof UpdateMemberSchema)['_input'];

interface MemberFormProps {
  /** Full member data */
  member: MemberDetail;
  /** Club slug for API calls */
  slug: string;
  /** Called when the form dirty state changes */
  onDirtyChange?: (dirty: boolean) => void;
}

// ============================================================================
// Helper: Format amount to German locale
// ============================================================================

function formatAmount(amount: string): string {
  return parseFloat(amount).toFixed(2).replace('.', ',');
}

// ============================================================================
// Helper: Suggest FeeType based on HouseholdBillingModel + household context
// ============================================================================

interface FeeTypeSuggestion {
  feeTypeId: string;
  feeTypeName: string;
  reason: string;
}

function suggestFeeType(
  model: string | null | undefined,
  householdRole: string | null,
  isInHousehold: boolean,
  membershipTypeName: string | null,
  feeTypes: FeeTypeResponse[]
): FeeTypeSuggestion | null {
  const activeFeeTypes = feeTypes.filter((ft) => ft.isActive);
  if (activeFeeTypes.length === 0) return null;

  // Find by name (case-insensitive, fuzzy start match)
  const findByName = (name: string) =>
    activeFeeTypes.find((ft) => ft.name.toLowerCase().includes(name.toLowerCase()));

  // Honorary members always get "Beitragsfrei"
  if (membershipTypeName?.toLowerCase().includes('ehren')) {
    const free = findByName('beitragsfrei');
    return free ? { feeTypeId: free.id, feeTypeName: free.name, reason: 'Ehrenmitglied' } : null;
  }

  if (!model || model === 'NONE' || !isInHousehold) {
    const single = findByName('einzelbeitrag');
    return single
      ? { feeTypeId: single.id, feeTypeName: single.name, reason: 'Einzelperson' }
      : null;
  }

  switch (model) {
    case 'REDUCED_MEMBERS':
      if (householdRole === 'HEAD') {
        const single = findByName('einzelbeitrag');
        return single
          ? { feeTypeId: single.id, feeTypeName: single.name, reason: 'Hauptmitglied' }
          : null;
      } else {
        const family = findByName('familientarif');
        return family
          ? { feeTypeId: family.id, feeTypeName: family.name, reason: 'Haushaltsmitglied' }
          : null;
      }

    case 'FAMILY_PAYER':
      if (householdRole === 'HEAD') {
        const familyPay = findByName('familien-pauschal') ?? findByName('familienpauschal');
        return familyPay
          ? { feeTypeId: familyPay.id, feeTypeName: familyPay.name, reason: 'Familienzahler' }
          : null;
      } else {
        const free = findByName('beitragsfrei');
        return free
          ? {
              feeTypeId: free.id,
              feeTypeName: free.name,
              reason: 'Haushalt, beitragsfrei',
            }
          : null;
      }

    case 'ALL_REDUCED': {
      const reduced = findByName('familientarif');
      return reduced
        ? {
            feeTypeId: reduced.id,
            feeTypeName: reduced.name,
            reason: 'Alle reduziert',
          }
        : null;
    }

    default:
      return null;
  }
}

// ============================================================================
// Helper: Convert MemberDetail to form values
// ============================================================================

function memberToFormValues(member: MemberDetail): FormValues {
  return {
    personType: member.personType as FormValues['personType'],
    // Enum/select fields keep undefined so placeholder renders correctly
    salutation: (member.salutation as FormValues['salutation']) ?? undefined,
    // Text input fields use '' — HTML inputs coerce undefined to '',
    // which would make isDirty true after reset() if defaults were undefined.
    title: member.title ?? '',
    firstName: member.firstName ?? '',
    lastName: member.lastName ?? '',
    nickname: member.nickname ?? '',
    organizationName: member.organizationName ?? '',
    contactFirstName: member.contactFirstName ?? '',
    contactLastName: member.contactLastName ?? '',
    department: member.department ?? '',
    position: member.position ?? '',
    vatId: member.vatId ?? '',
    email: member.email ?? '',
    phone: member.phone ?? '',
    mobile: member.mobile ?? '',
    notes: member.notes ?? '',
    street: member.street ?? '',
    houseNumber: member.houseNumber ?? '',
    addressExtra: member.addressExtra ?? '',
    postalCode: member.postalCode ?? '',
    city: member.city ?? '',
    country: member.country ?? 'DE',
    feeTypeId: member.feeTypeId ?? undefined,
  };
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Always-editable member form with vertical sections.
 * All fields are editable — a sticky save bar appears when the form is dirty.
 */
export function MemberForm({ member, slug, onDirtyChange }: MemberFormProps) {
  const { toast } = useToast();
  const updateMember = useUpdateMember(slug);
  const { data: feeTypes } = useFeeTypes(slug);
  const { data: crossTableEntries } = useCrossTable(slug);
  const { data: clubSettings } = useClubSettings(slug);

  const defaultValues = useMemo(() => memberToFormValues(member), [member]);

  const form = useForm<FormValues>({
    resolver: zodResolver(UpdateMemberSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const selectedFeeTypeId = watch('feeTypeId');

  // Resolve the member's current MembershipType from the latest period
  const currentMembershipTypeId = useMemo(() => {
    const periods = member.membershipPeriods ?? [];
    // Latest period that has a membershipTypeId
    const latest = [...periods]
      .sort((a, b) => {
        const dateA = a.joinDate ?? a.createdAt ?? '';
        const dateB = b.joinDate ?? b.createdAt ?? '';
        return dateB.localeCompare(dateA);
      })
      .find((p) => p.membershipTypeId);
    return latest?.membershipTypeId ?? null;
  }, [member.membershipPeriods]);

  // Resolve MembershipType name for suggestion logic (fuzzy match via name)
  const currentMembershipTypeName = useMemo(() => {
    // We don't have membership type names directly, so use householdRole-based check only
    // The membershipType name is not on MemberDetail — we rely on honorary check via null/code approach
    return null;
  }, []);

  // Compute auto-suggestion
  const suggestion = useMemo(() => {
    if (!feeTypes?.length) return null;
    const isInHousehold = !!member.householdId;
    return suggestFeeType(
      clubSettings?.householdBillingModel,
      member.householdRole,
      isInHousehold,
      currentMembershipTypeName,
      feeTypes
    );
  }, [
    feeTypes,
    clubSettings?.householdBillingModel,
    member.householdRole,
    member.householdId,
    currentMembershipTypeName,
  ]);

  // Compute the cross-table entry for the currently selected feeType + membershipType
  const selectedEntry = useMemo((): CrossTableEntryResponse | null => {
    if (!selectedFeeTypeId || !currentMembershipTypeId || !crossTableEntries?.length) return null;
    return (
      crossTableEntries.find(
        (e) => e.feeTypeId === selectedFeeTypeId && e.membershipTypeId === currentMembershipTypeId
      ) ?? null
    );
  }, [selectedFeeTypeId, currentMembershipTypeId, crossTableEntries]);

  // Reset form when member data changes (e.g., after save or external refresh)
  useEffect(() => {
    reset(memberToFormValues(member));
  }, [member, reset]);

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // ============================================================================
  // Submit handler — only sends changed fields
  // ============================================================================

  const onSubmit = useCallback(
    async (data: FormValues) => {
      try {
        const changed: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          const original = defaultValues[key as keyof FormValues];
          if (value !== original && value !== '' && value !== undefined) {
            changed[key] = value;
          }
          // Handle clearing a field (was set, now empty)
          if ((value === '' || value === undefined) && original) {
            changed[key] = null;
          }
        }

        // Explicitly handle feeTypeId clearing (from value to null/undefined)
        if (data.feeTypeId !== defaultValues.feeTypeId) {
          changed.feeTypeId = data.feeTypeId ?? null;
        }

        if (Object.keys(changed).length === 0) {
          return;
        }

        await updateMember.mutateAsync({ id: member.id, version: member.version, ...changed });
        reset(data);
        toast({ title: 'Änderungen gespeichert' });
      } catch (error) {
        toast({
          title: 'Fehler beim Speichern',
          description:
            error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
          variant: 'destructive',
        });
      }
    },
    [defaultValues, member.id, member.version, reset, updateMember, toast]
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 pb-6">
        <div className="flex flex-col gap-6">
          {/* Section: Stammdaten */}
          <SectionHeader title="Stammdaten" />
          <BasicInfoSection
            member={member}
            isEditing={true}
            register={register}
            control={control as never}
            setValue={setValue}
            watch={watch}
            errors={errors}
            disabled={isSubmitting}
          />

          <Separator />

          {/* Section: Adresse & Kontakt */}
          <SectionHeader title="Adresse & Kontakt" />
          <AddressContactSection
            member={member}
            isEditing={true}
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
            disabled={isSubmitting}
          />

          <Separator />

          {/* Section: Mitgliedschaft */}
          <SectionHeader title="Mitgliedschaft" />
          <MembershipSection member={member} slug={slug} />

          <Separator />

          {/* Section: Beitragsart */}
          <SectionHeader title="Beitragsart" />
          <div className="space-y-1.5">
            <Label htmlFor="feeTypeId">Beitragsart</Label>
            <Controller
              name="feeTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(val) => field.onChange(val === '__none__' ? null : val)}
                  disabled={isSubmitting || !feeTypes?.length}
                >
                  <SelectTrigger id="feeTypeId">
                    <SelectValue
                      placeholder={
                        feeTypes?.length ? 'Beitragsart wählen' : 'Keine Beitragsarten vorhanden'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Keine Auswahl</SelectItem>
                    {feeTypes
                      ?.filter((ft) => ft.isActive)
                      .map((ft) => {
                        const entry = crossTableEntries?.find(
                          (e) =>
                            e.feeTypeId === ft.id && e.membershipTypeId === currentMembershipTypeId
                        );
                        return (
                          <SelectItem key={ft.id} value={ft.id}>
                            {ft.name}
                            {entry ? ` (${formatAmount(entry.amount)} EUR/Jahr)` : ''}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              )}
            />
            {/* Suggestion line (per D-10) */}
            {suggestion && (
              <p
                className={
                  selectedFeeTypeId && selectedFeeTypeId !== suggestion.feeTypeId
                    ? 'text-sm text-warning'
                    : 'text-sm text-muted-foreground'
                }
              >
                {selectedFeeTypeId && selectedFeeTypeId !== suggestion.feeTypeId
                  ? `Manuell gewählt (Vorschlag wäre: ${suggestion.feeTypeName})`
                  : `Vorschlag: ${suggestion.feeTypeName} (${suggestion.reason})`}
              </p>
            )}
            {/* Computed amount line */}
            {selectedEntry ? (
              <p className="text-sm font-medium tabular-nums">
                Grundbeitrag: {formatAmount(selectedEntry.amount)} EUR / Jahr
              </p>
            ) : selectedFeeTypeId ? (
              <p className="text-sm text-warning">
                Kein Betrag in der Beitragstabelle für diese Kombination
              </p>
            ) : null}
          </div>

          <Separator />

          {/* Section: Notizen */}
          <SectionHeader title="Notizen" />
          <NotesSection
            member={member}
            isEditing={true}
            register={register}
            watch={watch}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Fixed footer — always visible when form has unsaved changes */}
      {isDirty && (
        <div className="shrink-0 flex items-center justify-end gap-2 border-t bg-background px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => reset()}
            disabled={isSubmitting}
          >
            Verwerfen
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </div>
      )}
    </form>
  );
}

// ============================================================================
// Section Header
// ============================================================================

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>;
}
