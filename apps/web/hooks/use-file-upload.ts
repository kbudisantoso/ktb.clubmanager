'use client';

import { usePresignedUpload } from './use-presigned-upload';
export type { UploadState } from './use-presigned-upload';

// ============================================================================
// Types
// ============================================================================

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
 * Club-scoped file upload hook (thin wrapper around usePresignedUpload).
 *
 * Backwards compatible — same API as before.
 */
export function useFileUpload({ slug, purpose, onSuccess, onError }: UploadOptions) {
  return usePresignedUpload({
    createUrl: `/api/clubs/${slug}/files`,
    confirmUrl: (fileId) => `/api/clubs/${slug}/files/${fileId}/confirm`,
    purpose,
    onSuccess,
    onError,
  });
}
