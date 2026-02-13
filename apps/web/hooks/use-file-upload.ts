'use client';

import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface UploadState {
  status: 'idle' | 'creating' | 'uploading' | 'confirming' | 'done' | 'error';
  progress: number; // 0-100
  error: string | null;
  fileId: string | null;
  fileUrl: string | null;
}

interface UploadOptions {
  slug: string;
  purpose: string; // e.g., 'club-logo'
  onSuccess?: (fileId: string, fileUrl: string) => void;
  onError?: (error: string) => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Generic file upload hook using the presigned URL pattern.
 *
 * Flow:
 * 1. POST /api/clubs/:slug/files — create metadata, receive presigned PUT URL
 * 2. PUT presigned URL — upload file directly to MinIO/S3
 * 3. POST /api/clubs/:slug/files/:fileId/confirm — verify upload
 */
export function useFileUpload({ slug, purpose, onSuccess, onError }: UploadOptions) {
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    error: null,
    fileId: null,
    fileUrl: null,
  });

  const upload = useCallback(
    async (file: Blob, filename: string) => {
      try {
        // Stage 1: Create file metadata and get presigned URL
        setState({ status: 'creating', progress: 10, error: null, fileId: null, fileUrl: null });

        const createRes = await apiFetch(`/api/clubs/${slug}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            contentType: file.type || 'image/png',
            size: file.size,
            purpose,
          }),
        });

        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({ message: 'Fehler beim Erstellen' }));
          throw new Error(err.message);
        }

        const { id: fileId, uploadUrl } = await createRes.json();

        // Stage 2: Upload directly to MinIO via presigned PUT URL
        setState((s) => ({ ...s, status: 'uploading', progress: 30, fileId }));

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'image/png' },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error('Fehler beim Hochladen der Datei');
        }

        // Stage 3: Confirm upload
        setState((s) => ({ ...s, status: 'confirming', progress: 80 }));

        const confirmRes = await apiFetch(`/api/clubs/${slug}/files/${fileId}/confirm`, {
          method: 'POST',
        });

        if (!confirmRes.ok) {
          const err = await confirmRes
            .json()
            .catch(() => ({ message: 'Fehler bei der Bestaetigung' }));
          throw new Error(err.message);
        }

        const confirmed = await confirmRes.json();
        const fileUrl = confirmed.url ?? '';

        setState({ status: 'done', progress: 100, error: null, fileId, fileUrl });
        onSuccess?.(fileId, fileUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        setState((s) => ({ ...s, status: 'error', error: message }));
        onError?.(message);
      }
    },
    [slug, purpose, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0, error: null, fileId: null, fileUrl: null });
  }, []);

  return { ...state, upload, reset };
}
