import { z } from 'zod';
import { BillingIntervalEnum } from './fee-category.ts';

/**
 * Regex for validating decimal amounts (e.g., "12.50", "0.00", "1000.99", "120,00").
 * Accepts both dot and comma as decimal separator.
 */
const DECIMAL_REGEX = /^\d+([.,]\d{1,2})?$/;

// =============================================================================
// FeeType Schemas
// =============================================================================

/**
 * Schema for creating a new fee type (club-scoped entity).
 * A FeeType defines how a member pays (e.g., Einzelbeitrag, Familientarif, Beitragsfrei).
 */
export const CreateFeeTypeSchema = z.object({
  /** Display name (e.g., "Einzelbeitrag", "Familientarif") */
  name: z.string().min(1, 'Name ist erforderlich').max(100),

  /** Optional description explaining when this fee type applies */
  description: z.string().max(500).optional(),

  /** Whether this fee type is currently available for selection */
  isActive: z.boolean().optional().default(true),
});

export type CreateFeeType = z.infer<typeof CreateFeeTypeSchema>;

/**
 * Schema for updating an existing fee type.
 * All fields optional for partial updates.
 */
export const UpdateFeeTypeSchema = CreateFeeTypeSchema.partial();
export type UpdateFeeType = z.infer<typeof UpdateFeeTypeSchema>;

/**
 * Full fee type response schema including server-generated fields.
 */
export const FeeTypeResponseSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FeeTypeResponse = z.infer<typeof FeeTypeResponseSchema>;

// =============================================================================
// Cross-Table (MembershipTypeFeeType) Schemas
// =============================================================================

/**
 * Schema for upserting a cross-table entry (MembershipType x FeeType = amount).
 * Used for creating or updating a single cell in the fee matrix.
 */
export const UpsertCrossTableEntrySchema = z.object({
  /** Reference to the membership type */
  membershipTypeId: z.string().cuid(),

  /** Reference to the fee type */
  feeTypeId: z.string().cuid(),

  /** Fee amount as decimal string (e.g., "65.00" or "65,00") -- normalized to dot */
  amount: z
    .string()
    .transform((v) => v.replace(',', '.'))
    .pipe(z.string().regex(DECIMAL_REGEX, 'Bitte gib einen gueltigen Betrag ein (z.B. 65.00)')),

  /** Billing frequency for this combination */
  billingInterval: BillingIntervalEnum.optional().default('ANNUALLY'),
});

export type UpsertCrossTableEntry = z.infer<typeof UpsertCrossTableEntrySchema>;

/**
 * Full cross-table entry response schema including server-generated fields.
 */
export const CrossTableEntryResponseSchema = z.object({
  id: z.string(),
  membershipTypeId: z.string(),
  feeTypeId: z.string(),
  amount: z.string(),
  billingInterval: BillingIntervalEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CrossTableEntryResponse = z.infer<typeof CrossTableEntryResponseSchema>;
