'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
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
import type { SettingsFormValues } from '../club-settings-form';

interface OperationalSectionProps {
  form: UseFormReturn<SettingsFormValues>;
  disabled?: boolean;
}

const MONTH_OPTIONS = [
  { value: '1', label: 'Januar' },
  { value: '2', label: 'Februar' },
  { value: '3', label: 'März' },
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

const MEMBERSHIP_TYPE_OPTIONS = [
  { value: 'ORDENTLICH', label: 'Ordentliches Mitglied' },
  { value: 'PASSIV', label: 'Passives Mitglied' },
  { value: 'EHREN', label: 'Ehrenmitglied' },
  { value: 'FOERDER', label: 'Fördermitglied' },
  { value: 'JUGEND', label: 'Jugendmitglied' },
] as const;

/**
 * Betriebseinstellungen section: Geschäftsjahrbeginn, Standard-Mitgliedschaftstyp, Probezeitraum.
 */
export function OperationalSection({ form, disabled }: OperationalSectionProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Card id="section-defaults">
      <CardHeader>
        <CardTitle>Vereinsvorgaben</CardTitle>
        <CardDescription>Standardwerte für Mitgliedschaften und Geschäftsjahr</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Geschäftsjahrbeginn */}
        <div className="space-y-1.5">
          <Label htmlFor="settings-fiscalYearStartMonth">Geschäftsjahrbeginn</Label>
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
                  <SelectValue placeholder="Monat wählen" />
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
          <Label htmlFor="settings-defaultMembershipType">Standard-Mitgliedschaftstyp</Label>
          <Controller
            name="defaultMembershipType"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? undefined}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger id="settings-defaultMembershipType" className="w-full">
                  <SelectValue placeholder="Typ wählen" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBERSHIP_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
            <p className="text-xs text-destructive">{String(errors.probationPeriodDays.message)}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
