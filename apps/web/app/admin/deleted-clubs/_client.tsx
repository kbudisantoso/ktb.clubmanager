'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { clubKeys } from '@/hooks/use-clubs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Loader2 } from 'lucide-react';

interface DeletionLog {
  id: string;
  clubName: string;
  clubSlug: string;
  initiatedBy: string;
  deactivatedAt: string;
  scheduledDeletionAt: string;
  deletedAt: string | null;
  memberCount: number;
  cancelled: boolean;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getStatus(log: DeletionLog): {
  label: string;
  variant: 'destructive' | 'secondary' | 'outline';
} {
  if (log.cancelled) {
    return { label: 'Abgebrochen', variant: 'outline' };
  }
  if (log.deletedAt) {
    return { label: 'Gelöscht', variant: 'secondary' };
  }
  return { label: 'Ausstehend', variant: 'destructive' };
}

function useAdminDeletionLogs() {
  return useQuery<DeletionLog[]>({
    queryKey: ['admin', 'deletion-logs'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/deletion-logs');
      if (!res.ok) throw new Error('Löschprotokolle konnten nicht geladen werden');
      return res.json();
    },
  });
}

function useCancelClubDeletion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clubId: string) => {
      const res = await apiFetch(`/api/admin/clubs/${clubId}/cancel-deletion`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Fehler beim Abbrechen der Löschung');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'deletion-logs'] });
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      toast({ title: 'Löschung abgebrochen' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export default function DeletedClubsClient() {
  const { data: logs, isLoading } = useAdminDeletionLogs();
  const cancelMutation = useCancelClubDeletion();
  const [cancellingLog, setCancellingLog] = useState<DeletionLog | null>(null);

  async function handleCancelDeletion() {
    if (!cancellingLog) return;

    // Get pending deletions to find the club ID by slug
    const res = await apiFetch('/api/admin/clubs/pending-deletions');
    if (!res.ok) return;

    const pendingClubs = await res.json();
    const club = pendingClubs.find((c: { slug: string }) => c.slug === cancellingLog.clubSlug);

    if (club) {
      cancelMutation.mutate(club.id);
    }

    setCancellingLog(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gelöschte Vereine</h1>
        <p className="text-muted-foreground">
          Übersicht aller Vereinslöschungen und ausstehenden Löschvorgänge
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vereinsname</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Deaktiviert am</TableHead>
              <TableHead>Löschung geplant</TableHead>
              <TableHead>Gelöscht am</TableHead>
              <TableHead className="text-right">Mitglieder</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !logs || logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Keine Vereinslöschungen protokolliert
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const status = getStatus(log);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.clubName}</TableCell>
                    <TableCell className="font-mono text-sm">{log.clubSlug}</TableCell>
                    <TableCell>{formatDate(log.deactivatedAt)}</TableCell>
                    <TableCell>{formatDate(log.scheduledDeletionAt)}</TableCell>
                    <TableCell>
                      {log.deletedAt ? formatDate(log.deletedAt) : 'Ausstehend'}
                    </TableCell>
                    <TableCell className="text-right">{log.memberCount}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {!log.cancelled && !log.deletedAt && (
                        <Button variant="outline" size="sm" onClick={() => setCancellingLog(log)}>
                          Löschung abbrechen
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!cancellingLog}
        onOpenChange={(open) => !open && setCancellingLog(null)}
        title="Löschung abbrechen"
        description={`Möchtest du die Löschung von "${cancellingLog?.clubName ?? ''}" wirklich abbrechen? Der Verein wird reaktiviert.`}
        confirmLabel="Löschung abbrechen"
        cancelLabel="Zurück"
        onConfirm={handleCancelDeletion}
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
