'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FeeTypeList } from '@/components/fees/fee-type-list';
import { CrossTableMatrix } from '@/components/fees/cross-table-matrix';
import type { SettingsFormValues } from '../club-settings-form';

interface BeitragsmodellSectionProps {
  form: UseFormReturn<SettingsFormValues>;
  disabled?: boolean;
  slug: string;
}

const HOUSEHOLD_BILLING_OPTIONS = [
  {
    value: 'NONE',
    label: 'Kein Rabatt',
    description: 'Alle Mitglieder zahlen den Einzelbeitrag.',
  },
  {
    value: 'REDUCED_MEMBERS',
    label: 'Weitere Mitglieder reduziert',
    description:
      'Das Hauptmitglied zahlt voll, weitere Mitglieder zahlen einen reduzierten Beitrag.',
  },
  {
    value: 'FAMILY_PAYER',
    label: 'Einer zahlt f\u00fcr alle',
    description:
      'Das Hauptmitglied zahlt einen Familien-Pauschalbeitrag, alle weiteren Mitglieder sind beitragsfrei.',
  },
  {
    value: 'ALL_REDUCED',
    label: 'Alle im Haushalt reduziert',
    description:
      'Alle Haushaltsmitglieder (auch das Hauptmitglied) zahlen einen reduzierten Beitrag.',
  },
] as const;

/**
 * Beitragsmodell section in Settings.
 * Combines HouseholdBillingModel RadioGroup (Surface 1), FeeType CRUD list (Surface 2),
 * and cross-table matrix (Surface 3) per CONTEXT D-14.
 */
export function BeitragsmodellSection({ form, disabled, slug }: BeitragsmodellSectionProps) {
  return (
    <div className="space-y-6">
      {/* Surface 1: HouseholdBillingModel RadioGroup */}
      <Card>
        <CardHeader>
          <CardTitle>Haushaltsbeitragsmodell</CardTitle>
          <CardDescription>
            Wie werden Beitr\u00e4ge f\u00fcr Haushaltsmitglieder berechnet?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            name="householdBillingModel"
            control={form.control}
            render={({ field }) => (
              <RadioGroup
                value={field.value ?? 'NONE'}
                onValueChange={field.onChange}
                disabled={disabled}
                className="space-y-3"
              >
                {HOUSEHOLD_BILLING_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem
                      value={option.value}
                      id={`hbm-${option.value}`}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor={`hbm-${option.value}`} className="text-sm font-medium">
                        {option.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
          <p className="mt-4 text-sm text-muted-foreground">
            \u00c4nderung beeinflusst die automatische Beitragsart-Zuweisung f\u00fcr neue
            Mitglieder und Haushaltswechsel. Bestehende Zuweisungen bleiben unver\u00e4ndert.
          </p>
        </CardContent>
      </Card>

      {/* Surface 2: FeeType CRUD list */}
      <FeeTypeList slug={slug} />

      {/* Surface 3: Cross-table matrix */}
      <CrossTableMatrix slug={slug} />
    </div>
  );
}
