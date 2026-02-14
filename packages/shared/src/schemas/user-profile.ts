import { z } from 'zod';

/** Schema for updating user profile (display name only; avatar via file upload, email read-only) */
export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/** Schema for changing password */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  revokeOtherSessions: z.boolean().optional().default(false),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

/** Schema for account deletion check response */
export const AccountDeletionCheckResponseSchema = z.object({
  canDelete: z.boolean(),
  blockedClubs: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
      })
    )
    .optional(),
});

export type AccountDeletionCheckResponse = z.infer<typeof AccountDeletionCheckResponseSchema>;
