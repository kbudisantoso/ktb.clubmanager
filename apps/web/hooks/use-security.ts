'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { useClearSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Types
// ============================================================================

export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface ConnectedAccount {
  id: string;
  providerId: string;
  accountId: string;
}

export interface DeletionCheckResult {
  canDelete: boolean;
  blockedClubs?: Array<{ id: string; name: string; slug: string }>;
}

// ============================================================================
// Query key factory
// ============================================================================

export const securityKeys = {
  all: ['security'] as const,
  sessions: () => [...securityKeys.all, 'sessions'] as const,
  accounts: () => [...securityKeys.all, 'accounts'] as const,
  deletionCheck: () => [...securityKeys.all, 'deletion-check'] as const,
};

// ============================================================================
// Session hooks (NestJS backend)
// ============================================================================

export function useSessions() {
  return useQuery({
    queryKey: securityKeys.sessions(),
    queryFn: async (): Promise<SessionInfo[]> => {
      const res = await apiFetch('/api/me/sessions');
      if (!res.ok) throw new Error('Sitzungen konnten nicht geladen werden');
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds — sessions change frequently
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiFetch(`/api/me/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Sitzung konnte nicht beendet werden');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.sessions() });
      toast({ title: 'Sitzung beendet' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRevokeAllOtherSessions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/me/sessions', {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Sitzungen konnten nicht beendet werden');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.sessions() });
      toast({ title: 'Alle anderen Sitzungen beendet' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });
}

// ============================================================================
// OAuth account hooks (Better Auth client API)
// ============================================================================

export function useConnectedAccounts() {
  return useQuery({
    queryKey: securityKeys.accounts(),
    queryFn: async (): Promise<ConnectedAccount[]> => {
      const result = await authClient.listAccounts();
      if (result.error) throw new Error(result.error.message);
      return (result.data ?? []) as ConnectedAccount[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUnlinkAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (providerId: string) => {
      const result = await authClient.unlinkAccount({ providerId });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.accounts() });
      toast({ title: 'Konto getrennt' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });
}

// ============================================================================
// Password hook (Better Auth client API)
// ============================================================================

export function useChangePassword() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
      revokeOtherSessions,
    }: {
      currentPassword: string;
      newPassword: string;
      revokeOtherSessions?: boolean;
    }) => {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });
      if (result.error) {
        const msg = result.error.message;
        // Map common Better Auth error messages to German
        if (msg?.includes('Invalid password') || msg?.includes('INVALID_PASSWORD')) {
          throw new Error('Aktuelles Passwort ist falsch');
        }
        throw new Error(msg || 'Passwort konnte nicht geaendert werden');
      }
    },
    onSuccess: (_data, variables) => {
      toast({ title: 'Passwort geaendert' });
      if (variables.revokeOtherSessions) {
        queryClient.invalidateQueries({ queryKey: securityKeys.sessions() });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });
}

// ============================================================================
// Account deletion hooks (NestJS backend)
// ============================================================================

export function useAccountDeletionCheck() {
  return useQuery({
    queryKey: securityKeys.deletionCheck(),
    queryFn: async (): Promise<DeletionCheckResult> => {
      const res = await apiFetch('/api/me/account/deletion-check');
      if (!res.ok) throw new Error('Pruefung fehlgeschlagen');
      return res.json();
    },
    enabled: false, // Only fetch on demand via refetch()
  });
}

export function useDeleteAccount() {
  const router = useRouter();
  const clearSession = useClearSession();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/me/account', {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Konto konnte nicht geloescht werden');
      }
    },
    onSuccess: () => {
      clearSession();
      router.push('/login');
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
    retry: false, // Destructive operation — no retry
  });
}
