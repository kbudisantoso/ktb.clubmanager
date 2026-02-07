'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface TierUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  featureDescription?: string;
}

const FEATURE_NAMES: Record<string, string> = {
  sepa: 'SEPA-Lastschrift',
  reports: 'Finanzberichte',
  bankImport: 'Bank-Import',
};

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  sepa: 'Mit SEPA-Lastschrift kannst du Mitgliedsbeitraege automatisch einziehen.',
  reports: 'Finanzberichte helfen dir, den Ueberblick ueber die Vereinsfinanzen zu behalten.',
  bankImport: 'Importiere Kontoauszuege automatisch und ordne Buchungen zu.',
};

export function TierUpgradeModal({
  open,
  onOpenChange,
  feature,
  featureDescription,
}: TierUpgradeModalProps) {
  const featureName = FEATURE_NAMES[feature] || feature;
  const description = featureDescription || FEATURE_DESCRIPTIONS[feature] || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{featureName} freischalten</DialogTitle>
          <DialogDescription className="text-center">
            Diese Funktion ist in deinem aktuellen Tarif nicht verfuegbar.
          </DialogDescription>
        </DialogHeader>

        {description && <p className="text-center text-sm text-muted-foreground">{description}</p>}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full">Tarif upgraden</Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Spaeter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for showing tier upgrade modal.
 */
export function useTierUpgrade() {
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState('');

  const showUpgradeModal = useCallback((featureName: string) => {
    setFeature(featureName);
    setOpen(true);
  }, []);

  const Modal = useCallback(
    () => <TierUpgradeModal open={open} onOpenChange={setOpen} feature={feature} />,
    [open, feature]
  );

  return { showUpgradeModal, TierUpgradeModal: Modal };
}
