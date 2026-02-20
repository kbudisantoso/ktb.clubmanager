import { z } from 'zod';

/** Schema for initiating club deactivation (deletion with grace period) */
export const DeactivateClubSchema = z.object({
  /** Grace period in days (7, 14, 30, 60, or 90) */
  gracePeriodDays: z.number().int().min(7).max(90),
  /** Club name typed by owner to confirm deletion */
  confirmationName: z.string().min(1),
});

export type DeactivateClubInput = z.infer<typeof DeactivateClubSchema>;

/** Response schema for ClubDeletionLog entries */
export const ClubDeletionLogResponseSchema = z.object({
  id: z.string(),
  clubName: z.string(),
  clubSlug: z.string(),
  initiatedBy: z.string(),
  deactivatedAt: z.string(),
  scheduledDeletionAt: z.string(),
  deletedAt: z.string().nullable(),
  memberCount: z.number(),
  notificationEvents: z.any(),
  cancelled: z.boolean(),
  cancelledAt: z.string().nullable(),
  cancelledBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ClubDeletionLogResponse = z.infer<typeof ClubDeletionLogResponseSchema>;

/** Notification event type for deletion milestones */
export const NotificationEventSchema = z.object({
  type: z.enum(['T_GRACE', 'T_7', 'T_1', 'T_0']),
  scheduledAt: z.string(),
  sentAt: z.string().nullable().optional(),
  recipientCount: z.number(),
});

export type NotificationEvent = z.infer<typeof NotificationEventSchema>;

/** Grace period preset options */
export const GRACE_PERIOD_PRESETS = [7, 14, 30, 60, 90] as const;
export const DEFAULT_GRACE_PERIOD = 30;
export const MIN_GRACE_PERIOD_FLOOR = 7;
