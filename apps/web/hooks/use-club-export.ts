import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/**
 * Trigger a browser file download from a Blob.
 * Uses the same pattern as member-csv-export.tsx.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Hook for exporting club data as a YAML file download.
 * Calls GET /api/clubs/:slug/export and triggers a browser download.
 */
export function useClubExport(slug: string) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportClub = useCallback(async () => {
    setIsExporting(true);
    try {
      const res = await apiFetch(`/api/clubs/${slug}/export`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Export fehlgeschlagen');
      }
      const blob = await res.blob();
      triggerDownload(blob, `${slug}.yaml`);
      toast({ title: 'Export abgeschlossen' });
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Export fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [slug, toast]);

  return { exportClub, isExporting };
}
