'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { SettingsFormValues } from '../club-settings-form';

interface TaxSectionProps {
  form: UseFormReturn<SettingsFormValues>;
  disabled?: boolean;
}

/**
 * Steuerdaten section: Steuernummer, USt-IdNr, Finanzamt, Gemeinnützigkeit toggle.
 */
export function TaxSection({ form, disabled }: TaxSectionProps) {
  const { register, control } = form;

  return (
    <Card id="section-tax">
      <CardHeader>
        <CardTitle>Steuerdaten</CardTitle>
        <CardDescription>Steuerliche Angaben des Vereins</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Steuernummer + USt-IdNr (2-col) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-taxNumber">Steuernummer</Label>
            <Input
              id="settings-taxNumber"
              placeholder="123/456/78901"
              disabled={disabled}
              {...register('taxNumber')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-vatId">USt-IdNr.</Label>
            <Input
              id="settings-vatId"
              placeholder="DE123456789"
              disabled={disabled}
              {...register('vatId')}
            />
          </div>
        </div>

        {/* Finanzamt (full width) */}
        <div className="space-y-1.5">
          <Label htmlFor="settings-taxOffice">Zuständiges Finanzamt</Label>
          <Input
            id="settings-taxOffice"
            placeholder="Finanzamt Musterstadt"
            disabled={disabled}
            {...register('taxOffice')}
          />
        </div>

        {/* Gemeinnützigkeit Switch */}
        <Controller
          name="isNonProfit"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch
                id="settings-isNonProfit"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
              <Label htmlFor="settings-isNonProfit">Gemeinnützigkeit anerkannt</Label>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}
