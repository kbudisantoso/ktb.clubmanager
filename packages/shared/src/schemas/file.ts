import { z } from 'zod';

/**
 * File status enum — tracks lifecycle of a stored file.
 * Must match Prisma FileStatus enum exactly.
 */
export const FileStatusSchema = z.enum(['PENDING_UPLOAD', 'UPLOADED', 'DELETED', 'MISSING']);
export type FileStatus = z.infer<typeof FileStatusSchema>;

/**
 * Schema for initiating a file upload (presigned URL request).
 * Client sends filename, type, size, and purpose to get a presigned PUT URL.
 */
export const CreateFileSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
  /** Upload purpose (e.g., "club-logo", "user-avatar", "receipt") */
  purpose: z.string().min(1).max(50),
});

export type CreateFile = z.infer<typeof CreateFileSchema>;

/**
 * Schema for file response objects returned by the API.
 * Includes presigned URLs for upload/download depending on file status.
 */
export const FileResponseSchema = z.object({
  id: z.string(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
  status: FileStatusSchema,
  /** Presigned PUT URL (only in create response) */
  uploadUrl: z.string().optional(),
  /** Presigned GET URL (only for UPLOADED files) */
  url: z.string().optional(),
  uploadedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type FileResponse = z.infer<typeof FileResponseSchema>;
