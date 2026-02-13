'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateAndLookupIBAN, formatIBAN } from '@/lib/iban-utils';
import type { IBANValidationResult } from '@/lib/iban-utils';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface IbanFieldProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  disabled?: boolean;
  error?: string;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * IBAN input field with debounced real-time validation and German bank name display.
 * Auto-fills BIC and bankName fields when a valid German IBAN is entered.
 */
export function IbanField({ control, setValue, disabled, error }: IbanFieldProps) {
  const [validation, setValidation] = useState<IBANValidationResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleValidation = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setValidation(null);
        return;
      }

      debounceRef.current = setTimeout(() => {
        const result = validateAndLookupIBAN(value);
        setValidation(result);

        if (result.valid) {
          // Auto-fill BIC and bankName when valid
          if (result.bic) {
            setValue('bic', result.bic, { shouldDirty: true });
          }
          if (result.bankName) {
            setValue('bankName', result.bankName, { shouldDirty: true });
          }
          // Store electronic format
          setValue('iban', result.electronic, { shouldDirty: true });
        }
      }, 300);
    },
    [setValue]
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor="settings-iban">IBAN</Label>
      <Controller
        name="iban"
        control={control}
        render={({ field }) => (
          <div className="space-y-1">
            <Input
              id="settings-iban"
              placeholder="DE89 3704 0044 0532 0130 00"
              disabled={disabled}
              aria-invalid={!!(validation?.error || error)}
              value={field.value ? formatIBAN(field.value) : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\s/g, '').toUpperCase();
                field.onChange(raw);
                handleValidation(raw);
              }}
              onBlur={field.onBlur}
            />

            {/* Validation feedback */}
            {validation?.error && <p className="text-xs text-destructive">{validation.error}</p>}
            {error && !validation?.error && <p className="text-xs text-destructive">{error}</p>}

            {/* Bank name display for valid German IBAN */}
            {validation?.valid && validation.bankName && (
              <p className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="h-3 w-3" />
                {validation.bankName}
              </p>
            )}
          </div>
        )}
      />
    </div>
  );
}
