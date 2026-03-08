import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// ============================================================================
// Query Key Factory
// ============================================================================

export interface ClubUserFilters {
  search?: string;
  status?: string[];
  roles?: string[];
}

export const clubUserKeys = {
  all: (slug: string) => ['club-users', slug] as const,
  list: (slug: string, filters?: ClubUserFilters) =>
    [...clubUserKeys.all(slug), 'list', filters] as const,
  detail: (slug: string, clubUserId: string) =>
    [...clubUserKeys.all(slug), 'detail', clubUserId] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface ClubUserListItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string;
  roles: string[];
  status: string;
  joinedAt: string;
  isExternal: boolean;
}

export interface ClubUserDetail extends ClubUserListItem {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    memberNumber: string;
  } | null;
}

interface InviteClubUserInput {
  email: string;
  roles?: string[];
}

interface UpdateClubUserStatusInput {
  clubUserId: string;
  status: string;
}

interface UpdateClubUserRolesInput {
  clubUserId: string;
  roles: string[];
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch club users with optional filters (search, status, roles).
 */
export function useClubUsers(slug: string, filters?: ClubUserFilters) {
  return useQuery<ClubUserListItem[]>({
    queryKey: clubUserKeys.list(slug, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.status && filters.status.length > 0) {
        params.set('status', filters.status.join(','));
      }
      if (filters?.roles && filters.roles.length > 0) {
        params.set('roles', filters.roles.join(','));
      }
      const query = params.toString();
      const url = `/api/clubs/${slug}/users${query ? `?${query}` : ''}`;
      const res = await apiFetch(url);
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Benutzer');
      }
      return res.json();
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch a single club user's details.
 */
export function useClubUserDetail(slug: string, clubUserId: string | undefined) {
  return useQuery<ClubUserDetail>({
    queryKey: clubUserKeys.detail(slug, clubUserId ?? ''),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/users/${clubUserId}`);
      if (!res.ok) {
        throw new Error('Fehler beim Laden des Benutzers');
      }
      return res.json();
    },
    enabled: !!clubUserId,
    staleTime: 30_000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Invite a user to the club by email.
 * Invalidates the club user list on success.
 */
export function useInviteClubUser(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InviteClubUserInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/users/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Einladen des Benutzers');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubUserKeys.all(slug) });
    },
  });
}

/**
 * Update a club user's status (e.g., activate, suspend).
 * Invalidates the club user list on success.
 */
export function useUpdateClubUserStatus(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clubUserId, status }: UpdateClubUserStatusInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/users/${clubUserId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Ändern des Status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubUserKeys.all(slug) });
    },
  });
}

/**
 * Update a club user's roles.
 * Invalidates the club user list on success.
 */
export function useUpdateClubUserRoles(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clubUserId, roles }: UpdateClubUserRolesInput) => {
      const res = await apiFetch(`/api/clubs/${slug}/users/${clubUserId}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Ändern der Rollen');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubUserKeys.all(slug) });
    },
  });
}

/**
 * Remove a club user from the club.
 * Invalidates the club user list on success.
 */
export function useRemoveClubUser(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clubUserId: string) => {
      const res = await apiFetch(`/api/clubs/${slug}/users/${clubUserId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Fehler beim Entfernen des Benutzers');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubUserKeys.all(slug) });
    },
  });
}
