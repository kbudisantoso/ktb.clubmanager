'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useForceRefreshSession } from '@/hooks/use-session';
import { usePresignedUpload } from '@/hooks/use-presigned-upload';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Query keys
// ============================================================================

export const profileKeys = {
  all: ['profile'] as const,
};

// ============================================================================
// useUpdateProfile
// ============================================================================

/**
 * Mutation hook for updating the user's display name.
 * Invalidates session cache on success so header/sidebar reflect changes.
 */
export function useUpdateProfile() {
  const forceRefreshSession = useForceRefreshSession();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const res = await apiFetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Unbekannter Fehler' }));
        throw new Error(err.message || 'Fehler beim Aktualisieren des Profils');
      }

      return res.json();
    },
    onSuccess: () => {
      forceRefreshSession();
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler beim Aktualisieren',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// useAvatarUpload
// ============================================================================

interface AvatarUploadOptions {
  onSuccess?: (fileId: string, fileUrl: string) => void;
  onError?: (error: string) => void;
}

/**
 * User-scoped avatar upload hook (thin wrapper around usePresignedUpload).
 * Invalidates session cache on success so the avatar is reflected everywhere.
 */
export function useAvatarUpload({ onSuccess, onError }: AvatarUploadOptions = {}) {
  const forceRefreshSession = useForceRefreshSession();

  return usePresignedUpload({
    createUrl: '/api/me/avatar',
    confirmUrl: (fileId) => `/api/me/avatar/${fileId}/confirm`,
    purpose: 'user-avatar',
    onSuccess: (fileId, fileUrl) => {
      forceRefreshSession();
      onSuccess?.(fileId, fileUrl);
    },
    onError,
  });
}

// ============================================================================
// useRemoveAvatar
// ============================================================================

/**
 * Mutation hook for removing the user's avatar.
 * Invalidates session cache on success (user.image becomes null -> initials fallback).
 */
export function useRemoveAvatar() {
  const forceRefreshSession = useForceRefreshSession();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/me/avatar', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Unbekannter Fehler' }));
        throw new Error(err.message || 'Fehler beim Entfernen des Profilbilds');
      }

      return res.json();
    },
    onSuccess: () => {
      forceRefreshSession();
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler beim Entfernen',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
