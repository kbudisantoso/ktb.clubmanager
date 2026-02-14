'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SettingsFormValues } from '../club-settings-form';

interface AddressContactSectionProps {
  form: UseFormReturn<SettingsFormValues>;
  disabled?: boolean;
}

/**
 * Adresse & Kontakt section: Straße, PLZ, Ort, Telefon, E-Mail, Website.
 */
export function AddressContactSection({ form, disabled }: AddressContactSectionProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adresse & Kontakt</CardTitle>
        <CardDescription>Anschrift und Kontaktdaten des Vereins</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Straße + Hausnummer */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-street">Straße</Label>
            <Input
              id="settings-street"
              placeholder="Musterstraße"
              disabled={disabled}
              {...register('street')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-houseNumber">Hausnummer</Label>
            <Input
              id="settings-houseNumber"
              placeholder="42"
              disabled={disabled}
              {...register('houseNumber')}
            />
          </div>
        </div>

        {/* PLZ + Ort */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-postalCode">PLZ</Label>
            <Input
              id="settings-postalCode"
              placeholder="12345"
              disabled={disabled}
              {...register('postalCode')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-city">Ort</Label>
            <Input
              id="settings-city"
              placeholder="Musterstadt"
              disabled={disabled}
              {...register('city')}
            />
          </div>
        </div>

        {/* Telefon + E-Mail */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-phone">Telefon</Label>
            <Input
              id="settings-phone"
              type="tel"
              placeholder="+49 123 456789"
              disabled={disabled}
              {...register('phone')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-email">E-Mail</Label>
            <Input
              id="settings-email"
              type="email"
              placeholder="info@verein.de"
              disabled={disabled}
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email?.message && (
              <p className="text-xs text-destructive">{String(errors.email.message)}</p>
            )}
          </div>
        </div>

        {/* Website (full width) */}
        <div className="space-y-1.5">
          <Label htmlFor="settings-website">Website</Label>
          <Input
            id="settings-website"
            type="url"
            placeholder="https://www.verein.de"
            disabled={disabled}
            aria-invalid={!!errors.website}
            {...register('website')}
          />
          {errors.website?.message && (
            <p className="text-xs text-destructive">{String(errors.website.message)}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
