'use client';

import { useEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useOpenPlzLocalities, type Locality } from '@/hooks/use-openplz';
import type { SettingsFormValues } from '../club-settings-form';

interface AddressContactSectionProps {
  form: UseFormReturn<SettingsFormValues>;
  disabled?: boolean;
}

/**
 * Adresse & Kontakt section: Straße, PLZ, Ort, Telefon, E-Mail, Website.
 * PLZ auto-fills Ort via OpenPLZ API (same pattern as member address form).
 */
export function AddressContactSection({ form, disabled }: AddressContactSectionProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  // OpenPLZ auto-fill for city
  const postalCode = watch('postalCode') ?? '';
  const { data: localities, isLoading: isLoadingLocalities } = useOpenPlzLocalities(postalCode);

  const [showLocalityPicker, setShowLocalityPicker] = useState(false);
  const hasAutoFilled = useRef(false);
  const lastPlz = useRef('');

  useEffect(() => {
    if (postalCode !== lastPlz.current) {
      hasAutoFilled.current = false;
      lastPlz.current = postalCode;
    }

    if (!localities || localities.length === 0 || hasAutoFilled.current) return;

    if (localities.length === 1) {
      setValue('city', localities[0].name, { shouldValidate: true });
      hasAutoFilled.current = true;
      setShowLocalityPicker(false);
    } else {
      setShowLocalityPicker(true);
    }
  }, [localities, postalCode, setValue]);

  const handleSelectLocality = (locality: Locality) => {
    setValue('city', locality.name, { shouldValidate: true });
    hasAutoFilled.current = true;
    setShowLocalityPicker(false);
  };

  return (
    <Card id="section-address-contact">
      <CardHeader>
        <CardTitle>Adresse & Kontakt</CardTitle>
        <CardDescription>Anschrift und Kontaktdaten des Vereins</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Straße + Hausnummer */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_100px]">
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
            <Label htmlFor="settings-houseNumber">Nr.</Label>
            <Input
              id="settings-houseNumber"
              placeholder="42a"
              disabled={disabled}
              {...register('houseNumber')}
            />
          </div>
        </div>

        {/* PLZ + Ort */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[120px_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="settings-postalCode">PLZ</Label>
            <div className="relative">
              <Popover open={showLocalityPicker} onOpenChange={setShowLocalityPicker}>
                <PopoverAnchor asChild>
                  <Input
                    id="settings-postalCode"
                    placeholder="12345"
                    maxLength={5}
                    disabled={disabled}
                    {...register('postalCode')}
                  />
                </PopoverAnchor>
                {localities && localities.length > 1 && (
                  <PopoverContent className="w-60 p-1" align="start">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Mehrere Orte gefunden:
                    </div>
                    {localities.map((locality, idx) => (
                      <button
                        key={`${locality.postalCode}-${locality.name}-${idx}`}
                        type="button"
                        className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleSelectLocality(locality)}
                      >
                        <span>{locality.name}</span>
                        {locality.municipality?.name &&
                          locality.municipality.name !== locality.name && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {locality.municipality.name}
                            </span>
                          )}
                      </button>
                    ))}
                  </PopoverContent>
                )}
              </Popover>
              {isLoadingLocalities && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
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
