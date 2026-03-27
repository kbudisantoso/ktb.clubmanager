import { z } from 'zod';

import { BillingIntervalEnum } from './fee-category.ts';

/**
 * Schema for billing run preview request.
 * Treasurer selects period and interval to see what would be generated.
 */
export const BillingRunPreviewSchema = z.object({
  /** Start of the billing period (ISO date string) */
  periodStart: z.string().date(),

  /** End of the billing period (ISO date string) */
  periodEnd: z.string().date(),

  /** Billing interval to generate charges for */
  billingInterval: BillingIntervalEnum,
});

export type BillingRunPreview = z.infer<typeof BillingRunPreviewSchema>;

/**
 * Response schema for billing run preview.
 * Shows what would be generated without creating anything.
 */
export const BillingRunPreviewResponseSchema = z.object({
  /** Number of members that would receive charges */
  memberCount: z.number(),

  /** Total amount of all charges (decimal string) */
  totalAmount: z.string(),

  /** Number of members exempt from this billing */
  exemptions: z.number(),

  /** Breakdown by membership type */
  breakdown: z.array(
    z.object({
      /** Membership type name */
      membershipType: z.string(),
      /** Number of members in this type */
      count: z.number(),
      /** Subtotal for this type (decimal string) */
      subtotal: z.string(),
    })
  ),

  /** Number of existing charges for this period (duplicate warning) */
  existingCharges: z.number(),
});

export type BillingRunPreviewResponse = z.infer<typeof BillingRunPreviewResponseSchema>;

/**
 * Schema for confirming a billing run (creates FeeCharge records).
 * Same fields as preview plus due date.
 */
export const BillingRunConfirmSchema = BillingRunPreviewSchema.extend({
  /** Due date for all generated charges (ISO date string) */
  dueDate: z.string().date(),
});

export type BillingRunConfirm = z.infer<typeof BillingRunConfirmSchema>;
