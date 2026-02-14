import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormValues } from '@/components/settings/club-settings-form';
import { computeSettingsCompleteness } from '@/lib/settings-completeness';

export function useSettingsCompleteness(form: UseFormReturn<SettingsFormValues>) {
  const values = form.watch();
  return useMemo(() => computeSettingsCompleteness(values), [values]);
}
