import { z } from 'zod';

/**
 * Schema for creating a new number range.
 * Number ranges provide auto-generated sequential numbers for entities
 * (members, transactions, SEPA mandates).
 * Pattern: {prefix}{zero-padded sequential} with optional {YYYY} in prefix.
 */
export const CreateNumberRangeSchema = z.object({
  /** Entity type this range applies to (e.g., 'MEMBER', 'TRANSACTION', 'SEPA_MANDATE') */
  entityType: z.string().min(1, 'Entitaetstyp ist erforderlich').max(50),

  /** Prefix for generated numbers (e.g., "TSV-", "M-{YYYY}-") */
  prefix: z.string().max(20).default(''),

  /** Number of digits to pad with zeros (e.g., 4 -> "0001") */
  padLength: z.number().int().min(1).max(10).default(4),

  /** Whether to reset the counter at the start of each year */
  yearReset: z.boolean().default(false),
});

export type CreateNumberRange = z.infer<typeof CreateNumberRangeSchema>;

/**
 * Schema for updating an existing number range.
 * Only configuration fields can be updated (not entityType or currentValue).
 */
export const UpdateNumberRangeSchema = z.object({
  /** Updated prefix */
  prefix: z.string().max(20).optional(),

  /** Updated pad length */
  padLength: z.number().int().min(1).max(10).optional(),

  /** Updated year reset flag */
  yearReset: z.boolean().optional(),
});

export type UpdateNumberRange = z.infer<typeof UpdateNumberRangeSchema>;

/**
 * Full number range response schema including server-generated fields.
 */
export const NumberRangeResponseSchema = z.object({
  id: z.string(),
  clubId: z.string(),

  entityType: z.string(),
  prefix: z.string(),
  currentValue: z.number().int(),
  padLength: z.number().int(),
  yearReset: z.boolean(),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type NumberRangeResponse = z.infer<typeof NumberRangeResponseSchema>;
