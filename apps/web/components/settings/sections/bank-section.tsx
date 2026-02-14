'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IbanField } from '../iban-field';
import type { SettingsFormValues } from '../club-settings-form';

interface BankSectionProps {
  form: UseFormReturn<SettingsFormValues>;
  disabled?: boolean;
}

/**
 * Bankverbindung section: IBAN (with validation + bank name), BIC, Kontoinhaber.
 */
export function BankSection({ form, disabled }: BankSectionProps) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bankverbindung</CardTitle>
        <CardDescription>Bankkonto für den Zahlungsverkehr</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* IBAN + BIC (2-col) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <IbanField
            control={control}
            setValue={setValue}
            disabled={disabled}
            error={errors.iban?.message ? String(errors.iban.message) : undefined}
          />
          <div className="space-y-1.5">
            <Label htmlFor="settings-bic">BIC</Label>
            <Input
              id="settings-bic"
              placeholder="COBADEFFXXX"
              disabled={disabled}
              {...register('bic')}
            />
          </div>
        </div>

        {/* Kontoinhaber (full width) */}
        <div className="space-y-1.5">
          <Label htmlFor="settings-accountHolder">Kontoinhaber</Label>
          <Input
            id="settings-accountHolder"
            placeholder="Mein Sportverein e.V."
            disabled={disabled}
            {...register('accountHolder')}
          />
        </div>
      </CardContent>
    </Card>
  );
}
