'use client';

import { useEffect, useRef, useState } from 'react';
import {
  type FieldValues,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useOpenPlzLocalities, type Locality } from '@/hooks/use-openplz';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps<T extends FieldValues = FieldValues> {
  /** react-hook-form register function */
  register: UseFormRegister<T>;
  /** react-hook-form setValue function (for programmatic city fill) */
  setValue: UseFormSetValue<T>;
  /** react-hook-form watch function (for reactive PLZ tracking) */
  watch: UseFormWatch<T>;
  /** Form errors object for inline error display */
  errors?: Record<string, { message?: string }>;
  /** Whether the form is disabled */
  disabled?: boolean;
}

const COUNTRY_OPTIONS = [
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Oesterreich' },
  { value: 'CH', label: 'Schweiz' },
  { value: 'LU', label: 'Luxemburg' },
] as const;

/**
 * Reusable address field group with PLZ-to-city autocomplete via OpenPLZ API.
 *
 * Features:
 * - Auto-fills city when a valid 5-digit German PLZ is entered
 * - Shows popover with options if multiple cities match a PLZ
 * - Graceful fallback: never blocks form submission, user can always type manually
 * - German labels and two-column responsive layout
 */
export function AddressAutocomplete<T extends FieldValues = FieldValues>({
  register: rawRegister,
  setValue: rawSetValue,
  watch: rawWatch,
  errors,
  disabled = false,
}: AddressAutocompleteProps<T>) {
  // Cast form utilities for address field access (component only accesses address-specific fields)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reg = rawRegister as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = rawSetValue as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = rawWatch as any;

  const postalCode = w('postalCode') ?? '';
  const { data: localities, isLoading: isLoadingLocalities } = useOpenPlzLocalities(postalCode);

  const [showLocalityPicker, setShowLocalityPicker] = useState(false);
  const hasAutoFilled = useRef(false);
  const lastPlz = useRef('');

  // Auto-fill city when PLZ returns results
  useEffect(() => {
    // Reset tracking when PLZ changes
    if (postalCode !== lastPlz.current) {
      hasAutoFilled.current = false;
      lastPlz.current = postalCode;
    }

    if (!localities || localities.length === 0 || hasAutoFilled.current) return;

    if (localities.length === 1) {
      // Single result: auto-fill immediately
      set('city', localities[0].name, { shouldValidate: true });
      hasAutoFilled.current = true;
      setShowLocalityPicker(false);
    } else {
      // Multiple results: show picker
      setShowLocalityPicker(true);
    }
  }, [localities, postalCode, set]);

  const handleSelectLocality = (locality: Locality) => {
    set('city', locality.name, { shouldValidate: true });
    hasAutoFilled.current = true;
    setShowLocalityPicker(false);
  };

  return (
    <div className="space-y-3">
      {/* Row 1: PLZ + Ort (side by side) */}
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="postalCode">PLZ</Label>
          <div className="relative">
            <Popover open={showLocalityPicker} onOpenChange={setShowLocalityPicker}>
              <PopoverTrigger asChild>
                <Input
                  id="postalCode"
                  placeholder="12345"
                  maxLength={5}
                  disabled={disabled}
                  aria-invalid={!!errors?.postalCode}
                  {...reg('postalCode')}
                />
              </PopoverTrigger>
              {localities && localities.length > 1 && (
                <PopoverContent className="w-60 p-1" align="start">
                  <div className="text-xs text-muted-foreground px-2 py-1.5">
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
          {errors?.postalCode && (
            <p className="text-xs text-destructive">{errors.postalCode.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">Ort</Label>
          <Input
            id="city"
            placeholder="Stadt"
            disabled={disabled}
            aria-invalid={!!errors?.city}
            {...reg('city')}
          />
          {errors?.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>
      </div>

      {/* Row 2: Strasse + Hausnummer (side by side) */}
      <div className="grid grid-cols-[1fr_100px] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="street">Strasse</Label>
          <Input
            id="street"
            placeholder="Musterstrasse"
            disabled={disabled}
            aria-invalid={!!errors?.street}
            {...reg('street')}
          />
          {errors?.street && <p className="text-xs text-destructive">{errors.street.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="houseNumber">Nr.</Label>
          <Input
            id="houseNumber"
            placeholder="42a"
            disabled={disabled}
            aria-invalid={!!errors?.houseNumber}
            {...reg('houseNumber')}
          />
          {errors?.houseNumber && (
            <p className="text-xs text-destructive">{errors.houseNumber.message}</p>
          )}
        </div>
      </div>

      {/* Row 3: Adresszusatz (full width) */}
      <div className="space-y-1.5">
        <Label htmlFor="addressExtra">Adresszusatz</Label>
        <Input
          id="addressExtra"
          placeholder="c/o, Apartment, etc."
          disabled={disabled}
          aria-invalid={!!errors?.addressExtra}
          {...reg('addressExtra')}
        />
        {errors?.addressExtra && (
          <p className="text-xs text-destructive">{errors.addressExtra.message}</p>
        )}
      </div>

      {/* Row 4: Land (full width) */}
      <div className="space-y-1.5">
        <Label htmlFor="country">Land</Label>
        <Select defaultValue="DE" disabled={disabled} onValueChange={(val) => set('country', val)}>
          <SelectTrigger className={cn('w-full', errors?.country && 'border-destructive')}>
            <SelectValue placeholder="Land wählen" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
      </div>
    </div>
  );
}
