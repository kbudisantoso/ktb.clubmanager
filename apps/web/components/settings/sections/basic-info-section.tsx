'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SettingsFormValues } from '../club-settings-form';

interface BasicInfoSectionProps {
  form: UseFormReturn<SettingsFormValues>;
  disabled?: boolean;
}

/**
 * Stammdaten section: Name, Vereinskuerzel, Gruendungsdatum, Beschreibung.
 */
export function BasicInfoSection({ form, disabled }: BasicInfoSectionProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stammdaten</CardTitle>
        <CardDescription>Grundinformationen ueber den Verein</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name (full width, required) */}
        <div className="space-y-1.5">
          <Label htmlFor="settings-name">
            Vereinsname <span className="text-destructive">*</span>
          </Label>
          <Input
            id="settings-name"
            placeholder="Mein Sportverein"
            disabled={disabled}
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          {errors.name?.message && (
            <p className="text-xs text-destructive">{String(errors.name.message)}</p>
          )}
        </div>

        {/* Vereinskuerzel + Gruendungsdatum (2-col) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-shortCode">Vereinskuerzel</Label>
            <Input
              id="settings-shortCode"
              placeholder="MSV"
              maxLength={10}
              disabled={disabled}
              {...register('shortCode')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-foundedAt">Gruendungsdatum</Label>
            <Input
              id="settings-foundedAt"
              type="date"
              disabled={disabled}
              {...register('foundedAt')}
            />
          </div>
        </div>

        {/* Beschreibung (full width) */}
        <div className="space-y-1.5">
          <Label htmlFor="settings-description">Beschreibung</Label>
          <Textarea
            id="settings-description"
            placeholder="Kurze Beschreibung des Vereins..."
            maxLength={2000}
            disabled={disabled}
            {...register('description')}
          />
          {errors.description?.message && (
            <p className="text-xs text-destructive">{String(errors.description.message)}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
