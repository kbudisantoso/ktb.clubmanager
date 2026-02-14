'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { SettingsFormValues } from '../club-settings-form';

interface VisibilitySectionProps {
  form: UseFormReturn<SettingsFormValues>;
  disabled?: boolean;
}

const VISIBILITY_OPTIONS = [
  {
    value: 'PUBLIC',
    label: 'Öffentlich',
    description: 'Sichtbar in der Vereinssuche',
  },
  {
    value: 'PRIVATE',
    label: 'Privat',
    description: 'Nur per Einladungscode erreichbar',
  },
] as const;

/**
 * Sichtbarkeit section: PUBLIC / PRIVATE RadioGroup.
 */
export function VisibilitySection({ form, disabled }: VisibilitySectionProps) {
  const { control } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sichtbarkeit</CardTitle>
        <CardDescription>Wie der Verein in der App erscheint</CardDescription>
      </CardHeader>
      <CardContent>
        <Controller
          name="visibility"
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
              className="space-y-3"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start gap-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`visibility-${option.value}`}
                    className="mt-0.5"
                  />
                  <div>
                    <Label htmlFor={`visibility-${option.value}`} className="font-normal">
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        />
      </CardContent>
    </Card>
  );
}
