import { z } from 'zod';

/**
 * Available billing intervals for fee categories.
 */
export const BillingIntervalEnum = z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']);
export type BillingInterval = z.infer<typeof BillingIntervalEnum>;

/**
 * Scope of a fee category (which members it applies to).
 * Must match Prisma FeeCategoryScope enum exactly.
 */
export const FeeCategoryScopeEnum = z.enum(['ALL_MEMBERS', 'BY_MEMBERSHIP_TYPE', 'INDIVIDUAL']);
export type FeeCategoryScope = z.infer<typeof FeeCategoryScopeEnum>;

/**
 * Regex for validating decimal amounts (e.g., "12.50", "0.00", "1000.99", "120,00").
 * Accepts both dot and comma as decimal separator.
 */
const DECIMAL_REGEX = /^\d+([.,]\d{1,2})?$/;

/**
 * Schema for creating a new fee category (club-scoped entity).
 * Additional fee categories beyond the base MembershipType fee.
 */
export const CreateFeeCategorySchema = z.object({
  /** Category name (e.g., "Aufnahmegebühr", "Tennisabteilung") */
  name: z.string().min(1, 'Name ist erforderlich').max(100),

  /** Optional description */
  description: z.string().max(500).optional(),

  /** Fee amount as decimal string (e.g., "120.00" or "120,00") — normalized to dot */
  amount: z
    .string()
    .transform((v) => v.replace(',', '.'))
    .pipe(z.string().regex(DECIMAL_REGEX, 'Betrag muss ein gültiges Dezimalformat haben')),

  /** Billing frequency */
  billingInterval: BillingIntervalEnum.default('ANNUALLY'),

  /** Whether this is a one-time fee (e.g., enrollment fee) */
  isOneTime: z.boolean().default(false),

  /** Display order in lists */
  sortOrder: z.number().int().min(0).default(0),

  /** Scope: which members this category applies to */
  scope: FeeCategoryScopeEnum.optional().default('ALL_MEMBERS'),

  /** Membership type IDs (for BY_MEMBERSHIP_TYPE scope) */
  membershipTypeIds: z.array(z.string().cuid()).optional(),
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
  scope: FeeCategoryScopeEnum,
  /** Membership types this category is scoped to (for BY_MEMBERSHIP_TYPE scope) */
  membershipTypes: z
    .array(
      z.object({
        id: z.string(),
        membershipTypeId: z.string(),
      })
    )
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FeeCategoryResponse = z.infer<typeof FeeCategoryResponseSchema>;
