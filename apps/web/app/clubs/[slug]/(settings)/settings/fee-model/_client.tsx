'use client';

import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useClubSettings, useUpdateClubSettings } from '@/hooks/use-club-settings';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FeeTypeList } from '@/components/fees/fee-type-list';
import { CrossTableMatrix } from '@/components/fees/cross-table-matrix';

const HOUSEHOLD_BILLING_OPTIONS = [
  {
    value: 'NONE',
    label: 'Kein Rabatt',
    description: 'Alle Mitglieder zahlen den Einzelbeitrag.',
  },
  {
    value: 'REDUCED_MEMBERS',
    label: 'Weitere Mitglieder reduziert',
    description:
      'Das Hauptmitglied zahlt voll, weitere Mitglieder zahlen einen reduzierten Beitrag.',
  },
  {
    value: 'FAMILY_PAYER',
    label: 'Einer zahlt für alle',
    description:
      'Das Hauptmitglied zahlt einen Familien-Pauschalbeitrag, alle weiteren Mitglieder sind beitragsfrei.',
  },
  {
    value: 'ALL_REDUCED',
    label: 'Alle im Haushalt reduziert',
    description:
      'Alle Haushaltsmitglieder (auch das Hauptmitglied) zahlen einen reduzierten Beitrag.',
  },
] as const;

/**
 * Fee model settings page client component.
 * Manages household billing model, fee types (Beitragsarten), and the cross-table matrix.
 */
export function FeeModelSettingsClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data: club, isLoading } = useClubSettings(slug);
  const updateSettings = useUpdateClubSettings(slug);
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Einstellungen konnten nicht geladen werden.
      </div>
    );
  }

  async function handleBillingModelChange(value: string) {
    try {
      await updateSettings.mutateAsync({ householdBillingModel: value });
      toast({ title: 'Haushaltsbeitragsmodell gespeichert' });
    } catch {
      toast({
        title: 'Fehler beim Speichern',
        description: 'Das Haushaltsbeitragsmodell konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Household billing model */}
      <Card>
        <CardHeader>
          <CardTitle>Haushaltsbeitragsmodell</CardTitle>
          <CardDescription>Wie werden Beiträge für Haushaltsmitglieder berechnet?</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={club.householdBillingModel ?? 'NONE'}
            onValueChange={handleBillingModelChange}
            disabled={updateSettings.isPending}
            className="space-y-3"
          >
            {HOUSEHOLD_BILLING_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-start space-x-3">
                <RadioGroupItem value={option.value} id={`hbm-${option.value}`} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={`hbm-${option.value}`} className="text-sm font-medium">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
          <p className="mt-4 text-sm text-muted-foreground">
            Änderung beeinflusst die automatische Beitragsart-Zuweisung für neue Mitglieder und
            Haushaltswechsel. Bestehende Zuweisungen bleiben unverändert.
          </p>
        </CardContent>
      </Card>

      {/* Fee types CRUD list */}
      <FeeTypeList slug={slug} />

      {/* Cross-table matrix */}
      <CrossTableMatrix slug={slug} />
    </div>
  );
}
