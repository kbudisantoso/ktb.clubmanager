'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMembershipTypes } from '@/hooks/use-membership-types';
import type { SettingsFormValues } from '../club-settings-form';

interface OperationalSectionProps {
  form: UseFormReturn<SettingsFormValues>;
  disabled?: boolean;
}

const MONTH_OPTIONS = [
  { value: '1', label: 'Januar' },
  { value: '2', label: 'Februar' },
  { value: '3', label: 'Maerz' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Dezember' },
] as const;

/**
 * Betriebseinstellungen section: Geschaeftsjahrbeginn, Standard-Mitgliedschaftstyp, Probezeitraum,
 * and Beitragseinstellungen (proRataMode, householdFeeMode with conditional fields).
 */
export function OperationalSection({ form, disabled }: OperationalSectionProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data: membershipTypes } = useMembershipTypes(slug);
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;

  const householdFeeMode = watch('householdFeeMode');

  return (
    <>
      <Card id="section-defaults">
        <CardHeader>
          <CardTitle>Vereinsvorgaben</CardTitle>
          <CardDescription>Standardwerte fuer Mitgliedschaften und Geschaeftsjahr</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Geschaeftsjahrbeginn */}
          <div className="space-y-1.5">
            <Label htmlFor="settings-fiscalYearStartMonth">Geschaeftsjahrbeginn</Label>
            <Controller
              name="fiscalYearStartMonth"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : undefined}
                  onValueChange={(val) => field.onChange(Number(val))}
                  disabled={disabled}
                >
                  <SelectTrigger id="settings-fiscalYearStartMonth" className="w-full">
                    <SelectValue placeholder="Monat waehlen" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Standard-Mitgliedschaftstyp */}
          <div className="space-y-1.5">
            <Label htmlFor="settings-defaultMembershipTypeId">Standard-Mitgliedschaftstyp</Label>
            <Controller
              name="defaultMembershipTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? undefined}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="settings-defaultMembershipTypeId" className="w-full">
                    <SelectValue placeholder="Typ waehlen" />
                  </SelectTrigger>
                  <SelectContent>
                    {(membershipTypes ?? []).map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Probezeitraum */}
          <div className="space-y-1.5">
            <Label htmlFor="settings-probationPeriodDays">Probezeitraum (Tage)</Label>
            <Input
              id="settings-probationPeriodDays"
              type="number"
              min={0}
              max={365}
              placeholder="0"
              disabled={disabled}
              {...register('probationPeriodDays', {
                setValueAs: (v: string | number | undefined | null) => {
                  if (v === '' || v === undefined || v === null) return undefined;
                  const n = Number(v);
                  return Number.isNaN(n) ? undefined : n;
                },
              })}
            />
            {errors.probationPeriodDays?.message && (
              <p className="text-xs text-destructive">
                {String(errors.probationPeriodDays.message)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card id="section-fees">
        <CardHeader>
          <CardTitle>Beitragseinstellungen</CardTitle>
          <CardDescription>
            Konfiguration fuer anteilige Berechnung und Haushaltsrabatte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Anteilige Berechnung (proRataMode) */}
          <div className="space-y-1.5">
            <Label htmlFor="settings-proRataMode">Anteilige Berechnung</Label>
            <Controller
              name="proRataMode"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? undefined}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="settings-proRataMode" className="w-full">
                    <SelectValue placeholder="Modus waehlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL">Voller Beitrag</SelectItem>
                    <SelectItem value="MONTHLY_PRO_RATA">Monatsanteilig</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Bestimmt, ob bei unterjährigem Eintritt der volle Beitrag oder ein anteiliger Betrag
              berechnet wird.
            </p>
          </div>

          {/* Haushaltsbeitrag (householdFeeMode) */}
          <div className="space-y-1.5">
            <Label htmlFor="settings-householdFeeMode">Haushaltsbeitrag</Label>
            <Controller
              name="householdFeeMode"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? undefined}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="settings-householdFeeMode" className="w-full">
                    <SelectValue placeholder="Modus waehlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Kein Rabatt</SelectItem>
                    <SelectItem value="PERCENTAGE">Prozentual</SelectItem>
                    <SelectItem value="FLAT">Pauschal</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Rabatt fuer weitere Haushaltsmitglieder.
            </p>
          </div>

          {/* Conditional: Rabatt (%) for PERCENTAGE mode */}
          {householdFeeMode === 'PERCENTAGE' && (
            <div className="space-y-1.5">
              <Label htmlFor="settings-householdDiscountPercent">Rabatt (%)</Label>
              <Input
                id="settings-householdDiscountPercent"
                type="number"
                min={0}
                max={100}
                placeholder="z.B. 50"
                disabled={disabled}
                {...register('householdDiscountPercent', {
                  setValueAs: (v: string | number | undefined | null) => {
                    if (v === '' || v === undefined || v === null) return undefined;
                    const n = Number(v);
                    return Number.isNaN(n) ? undefined : n;
                  },
                })}
              />
              {errors.householdDiscountPercent?.message && (
                <p className="text-xs text-destructive">
                  {String(errors.householdDiscountPercent.message)}
                </p>
              )}
            </div>
          )}

          {/* Conditional: Pauschalbetrag (EUR) for FLAT mode */}
          {householdFeeMode === 'FLAT' && (
            <div className="space-y-1.5">
              <Label htmlFor="settings-householdFlatAmount">Pauschalbetrag (EUR)</Label>
              <Input
                id="settings-householdFlatAmount"
                placeholder="z.B. 50.00"
                inputMode="decimal"
                disabled={disabled}
                {...register('householdFlatAmount')}
              />
              {errors.householdFlatAmount?.message && (
                <p className="text-xs text-destructive">
                  {String(errors.householdFlatAmount.message)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
