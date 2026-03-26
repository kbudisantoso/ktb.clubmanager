import { z } from 'zod';

/**
 * Derived status of a fee charge based on payment sum vs. charge amount.
 */
export const FeeChargeStatusEnum = z.enum(['OPEN', 'PARTIAL', 'PAID']);
export type FeeChargeStatus = z.infer<typeof FeeChargeStatusEnum>;

/**
 * Full fee charge response schema including derived payment status.
 * Amounts are serialized as strings for Decimal precision.
 */
export const FeeChargeResponseSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  memberId: z.string(),
  feeCategoryId: z.string().nullable(),
  membershipTypeId: z.string().nullable(),
  description: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  amount: z.string(),
  dueDate: z.string(),
  /** Amount of discount applied (null if no discount) */
  discountAmount: z.string().nullable(),
  /** Human-readable reason for the discount */
  discountReason: z.string().nullable(),
  /** Derived status: OPEN, PARTIAL, or PAID */
  status: FeeChargeStatusEnum,
  /** Sum of all payments against this charge */
  paidAmount: z.string(),
  /** Remaining amount to be paid */
  remainingAmount: z.string(),
  /** Whether the charge is past due date and not fully paid */
  isOverdue: z.boolean(),
  /** Member summary for list display */
  member: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    memberNumber: z.string(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FeeChargeResponse = z.infer<typeof FeeChargeResponseSchema>;

/**
 * Query parameters for filtering fee charges.
 */
export const FeeChargeQuerySchema = z.object({
  /** Filter by derived payment status */
  status: FeeChargeStatusEnum.optional(),
  /** Filter by specific member */
  memberId: z.string().optional(),
  /** Filter by period start (inclusive) */
  periodStart: z.string().date().optional(),
  /** Filter by period end (inclusive) */
  periodEnd: z.string().date().optional(),
  /** Page number for pagination */
  page: z.coerce.number().int().min(1).optional(),
  /** Items per page */
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type FeeChargeQuery = z.infer<typeof FeeChargeQuerySchema>;
