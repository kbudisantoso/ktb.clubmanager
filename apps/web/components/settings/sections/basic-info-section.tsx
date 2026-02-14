'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SettingsFormValues } from '../club-settings-form';

interface BasicInfoSectionProps {
  form: UseFormReturn<SettingsFormValues>;
  slug: string;
  disabled?: boolean;
}

/**
 * Stammdaten section: Name, offizieller Name, Vereinskürzel, URL-Pfad, Gründungsdatum, Beschreibung.
 */
export function BasicInfoSection({ form, slug, disabled }: BasicInfoSectionProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card id="section-basic-info">
      <CardHeader>
        <CardTitle>Stammdaten</CardTitle>
        <CardDescription>Grundinformationen über den Verein</CardDescription>
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

        {/* Offizieller Name (full width) */}
        <div className="space-y-1.5">
          <Label htmlFor="settings-legalName">Offizieller Name</Label>
          <Input
            id="settings-legalName"
            placeholder="z.B. Sportverein Musterstadt 1920 e.V."
            maxLength={255}
            disabled={disabled}
            {...register('legalName')}
          />
          <p className="text-xs text-muted-foreground">
            Vollständiger Name laut Vereinsregister (falls abweichend)
          </p>
        </div>

        {/* Vereinskürzel + URL-Pfad + Gründungsdatum (3-col) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="settings-shortCode">Vereinskürzel</Label>
            <Input
              id="settings-shortCode"
              placeholder="MSV"
              minLength={2}
              maxLength={4}
              disabled={disabled}
              {...register('shortCode')}
            />
            <p className="text-xs text-muted-foreground">2–4 Zeichen, wird im Avatar angezeigt</p>
          </div>
          <div className="space-y-1.5">
            <Label>URL-Pfad</Label>
            <div className="flex h-9 items-center gap-1 rounded-md border bg-muted px-3 text-sm text-muted-foreground">
              <span>/clubs/</span>
              <span className="font-mono">{slug}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-foundedAt">Gründungsdatum</Label>
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
