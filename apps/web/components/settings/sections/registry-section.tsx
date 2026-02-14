'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { SettingsFormValues } from '../club-settings-form';

interface RegistrySectionProps {
  form: UseFormReturn<SettingsFormValues>;
  disabled?: boolean;
}

const CLUB_PURPOSE_OPTIONS = [
  { value: 'IDEALVEREIN', label: 'Idealverein (nichtwirtschaftlicher Verein)' },
  { value: 'WIRTSCHAFTLICH', label: 'Wirtschaftlicher Verein' },
] as const;

const CLUB_SPECIAL_FORM_OPTIONS = [
  { value: 'KEINE', label: 'Keine' },
  { value: 'TRAEGERVEREIN', label: 'Trägerverein' },
  { value: 'FOERDERVEREIN', label: 'Förderverein' },
  { value: 'DACHVERBAND', label: 'Dachverband / Verband' },
] as const;

/**
 * Vereinsregister section: e.V. toggle, Amtsgericht, Registernummer,
 * Zweckbestimmung (RadioGroup), Sonderform (RadioGroup).
 */
export function RegistrySection({ form, disabled }: RegistrySectionProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;

  const isRegistered = watch('isRegistered');

  return (
    <Card id="section-registry">
      <CardHeader>
        <CardTitle>Vereinsregister</CardTitle>
        <CardDescription>Registerdaten und Rechtsform</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* e.V. Switch */}
        <Controller
          name="isRegistered"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch
                id="settings-isRegistered"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
              <Label htmlFor="settings-isRegistered">Eingetragener Verein (e.V.)</Label>
            </div>
          )}
        />

        {/* Conditional fields when registered */}
        {isRegistered && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-registryCourt">Amtsgericht</Label>
              <Input
                id="settings-registryCourt"
                placeholder="Amtsgericht Musterstadt"
                disabled={disabled}
                {...register('registryCourt')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-registryNumber">Registernummer</Label>
              <Input
                id="settings-registryNumber"
                placeholder="VR 12345"
                disabled={disabled}
                {...register('registryNumber')}
              />
            </div>
          </div>
        )}

        {/* Zweckbestimmung */}
        <div className="space-y-2">
          <Label>Zweckbestimmung</Label>
          <Controller
            name="clubPurpose"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value ?? ''}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                {CLUB_PURPOSE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem value={option.value} id={`purpose-${option.value}`} />
                    <Label htmlFor={`purpose-${option.value}`} className="font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
          {errors.clubPurpose?.message && (
            <p className="text-xs text-destructive">{String(errors.clubPurpose.message)}</p>
          )}
        </div>

        {/* Sonderform */}
        <div className="space-y-2">
          <Label>Sonderform</Label>
          <Controller
            name="clubSpecialForm"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value ?? ''}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                {CLUB_SPECIAL_FORM_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem value={option.value} id={`specialForm-${option.value}`} />
                    <Label htmlFor={`specialForm-${option.value}`} className="font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
          {errors.clubSpecialForm?.message && (
            <p className="text-xs text-destructive">{String(errors.clubSpecialForm.message)}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
