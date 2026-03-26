import { z } from 'zod';

/**
 * Available billing intervals for fee categories.
 */
export const BillingIntervalEnum = z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']);
export type BillingInterval = z.infer<typeof BillingIntervalEnum>;

/**
 * Regex for validating decimal amounts (e.g., "12.50", "0.00", "1000.99").
 */
const DECIMAL_REGEX = /^\d+(\.\d{1,2})?$/;

/**
 * Schema for creating a new fee category (club-scoped entity).
 * Additional fee categories beyond the base MembershipType fee.
 */
export const CreateFeeCategorySchema = z.object({
  /** Category name (e.g., "Aufnahmegebuehr", "Tennisabteilung") */
  name: z.string().min(1, 'Name ist erforderlich').max(100),

  /** Optional description */
  description: z.string().max(500).optional(),

  /** Fee amount as decimal string (e.g., "120.00") */
  amount: z.string().regex(DECIMAL_REGEX, 'Betrag muss ein gueltiges Dezimalformat haben'),

  /** Billing frequency */
  billingInterval: BillingIntervalEnum.default('ANNUALLY'),

  /** Whether this is a one-time fee (e.g., enrollment fee) */
  isOneTime: z.boolean().default(false),

  /** Display order in lists */
  sortOrder: z.number().int().min(0).default(0),
});

export type CreateFeeCategory = z.infer<typeof CreateFeeCategorySchema>;

/**
 * Schema for updating an existing fee category.
 * All fields optional for partial updates.
 */
export const UpdateFeeCategorySchema = CreateFeeCategorySchema.partial().extend({
  /** Whether this category is active */
  isActive: z.boolean().optional(),
});

export type UpdateFeeCategory = z.infer<typeof UpdateFeeCategorySchema>;

/**
 * Full fee category response schema including server-generated fields.
 */
export const FeeCategoryResponseSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  amount: z.string(),
  billingInterval: BillingIntervalEnum,
  isActive: z.boolean(),
  isOneTime: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FeeCategoryResponse = z.infer<typeof FeeCategoryResponseSchema>;
