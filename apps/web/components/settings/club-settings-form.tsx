'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { UpdateClubSettingsSchema } from '@ktb/shared';
import { Button } from '@/components/ui/button';
import { useUpdateClubSettings } from '@/hooks/use-club-settings';
import type { ClubSettingsResponse } from '@/hooks/use-club-settings';
import { useToast } from '@/hooks/use-toast';
import { BasicInfoSection } from './sections/basic-info-section';
import { AddressContactSection } from './sections/address-contact-section';
import { RegistrySection } from './sections/registry-section';
import { TaxSection } from './sections/tax-section';
import { BankSection } from './sections/bank-section';
import { OperationalSection } from './sections/operational-section';
import { VisibilitySection } from './sections/visibility-section';

// ============================================================================
// Types
// ============================================================================

/** Form values use the schema _input type for zodResolver compatibility */
export type SettingsFormValues = (typeof UpdateClubSettingsSchema)['_input'];

interface ClubSettingsFormProps {
  club: ClubSettingsResponse;
  slug: string;
}

// ============================================================================
// Helper: Convert API response to form values
// ============================================================================

function clubToFormValues(club: ClubSettingsResponse): SettingsFormValues {
  return {
    // Stammdaten
    name: club.name,
    shortCode: club.shortCode ?? '',
    foundedAt: club.foundedAt ?? '',
    description: club.description ?? '',
    // Adresse & Kontakt
    street: club.street ?? '',
    houseNumber: club.houseNumber ?? '',
    postalCode: club.postalCode ?? '',
    city: club.city ?? '',
    phone: club.phone ?? '',
    email: club.email ?? '',
    website: club.website ?? '',
    // Vereinsregister
    isRegistered: club.isRegistered ?? false,
    registryCourt: club.registryCourt ?? '',
    registryNumber: club.registryNumber ?? '',
    clubPurpose: (club.clubPurpose as SettingsFormValues['clubPurpose']) ?? undefined,
    clubSpecialForm: (club.clubSpecialForm as SettingsFormValues['clubSpecialForm']) ?? undefined,
    // Steuerdaten
    taxNumber: club.taxNumber ?? '',
    vatId: club.vatId ?? '',
    taxOffice: club.taxOffice ?? '',
    isNonProfit: club.isNonProfit ?? false,
    // Bankverbindung
    iban: club.iban ?? '',
    bic: club.bic ?? '',
    bankName: club.bankName ?? '',
    accountHolder: club.accountHolder ?? '',
    // Betriebseinstellungen
    fiscalYearStartMonth: club.fiscalYearStartMonth ?? undefined,
    defaultMembershipType:
      (club.defaultMembershipType as SettingsFormValues['defaultMembershipType']) ?? undefined,
    probationPeriodDays: club.probationPeriodDays ?? undefined,
    // Sichtbarkeit
    visibility: club.visibility,
  };
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Always-editable club settings form with 7 sections.
 * Sticky save bar appears when form has unsaved changes.
 */
export function ClubSettingsForm({ club, slug }: ClubSettingsFormProps) {
  const { toast } = useToast();
  const updateSettings = useUpdateClubSettings(slug);

  const defaultValues = useMemo(() => clubToFormValues(club), [club]);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(UpdateClubSettingsSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = form;

  // Reset form when club data changes (e.g., after save or external refresh)
  useEffect(() => {
    reset(clubToFormValues(club));
  }, [club, reset]);

  // Warn about unsaved changes on page leave
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ============================================================================
  // Submit handler — only sends changed fields
  // ============================================================================

  const onSubmit = useCallback(
    async (data: SettingsFormValues) => {
      try {
        const changed: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          const original = defaultValues[key as keyof SettingsFormValues];
          // Value changed to something non-empty
          if (value !== original && value !== '' && value !== undefined) {
            changed[key] = value;
          }
          // Handle clearing a field (was set, now empty)
          if ((value === '' || value === undefined) && original) {
            changed[key] = null;
          }
        }

        if (Object.keys(changed).length === 0) {
          return;
        }

        await updateSettings.mutateAsync(changed);
        reset(data);
        toast({ title: 'Einstellungen gespeichert' });
      } catch (error) {
        toast({
          title: 'Fehler beim Speichern',
          description:
            error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
          variant: 'destructive',
        });
      }
    },
    [defaultValues, reset, updateSettings, toast]
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="space-y-6">
          <BasicInfoSection form={form} disabled={isSubmitting} />
          <AddressContactSection form={form} disabled={isSubmitting} />
          <RegistrySection form={form} disabled={isSubmitting} />
          <TaxSection form={form} disabled={isSubmitting} />
          <BankSection form={form} disabled={isSubmitting} />
          <OperationalSection form={form} disabled={isSubmitting} />
          <VisibilitySection form={form} disabled={isSubmitting} />
        </div>
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-background px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => reset(defaultValues)}
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
