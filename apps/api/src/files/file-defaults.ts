import type { FilePurpose } from './dto/create-file.dto.js';

/**
 * Presigned URL expiry durations per file purpose (in seconds).
 *
 * Values are intentionally tight — see ADR-0016 for rationale and industry benchmarks.
 *
 * Upload expiry: time between URL generation and the PUT request.
 * Download expiry: time between 302 redirect and the browser following the Location header.
 */

interface PresignedExpiry {
  /** Seconds until the presigned PUT URL expires. */
  upload: number;
  /** Seconds until the presigned GET URL (used in 302 redirect) expires. */
  download: number;
}

export const PRESIGNED_EXPIRY: Record<FilePurpose | 'default', PresignedExpiry> = {
  'club-logo': { upload: 10, download: 60 },
  'user-avatar': { upload: 10, download: 60 },
  default: { upload: 120, download: 60 },
};

/** Look up expiry for a purpose, falling back to default. */
export function getPresignedExpiry(purpose?: string): PresignedExpiry {
  if (purpose && purpose in PRESIGNED_EXPIRY) {
    return PRESIGNED_EXPIRY[purpose as FilePurpose];
  }
  return PRESIGNED_EXPIRY.default;
}
