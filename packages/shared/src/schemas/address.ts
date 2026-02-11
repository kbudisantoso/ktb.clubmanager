import { z } from 'zod';

/**
 * Address schema - SEPA pain.008 compliant structured address fields.
 * All fields optional as a group (some members may only have name + contact).
 * Structured addresses required from Nov 2026 for SEPA compliance.
 */
export const AddressSchema = z.object({
  /** Street name only (e.g., "Musterstraße") */
  street: z.string().max(100).optional(),

  /** House number, may include suffixes (e.g., "42a", "7-9") */
  houseNumber: z.string().max(20).optional(),

  /** Additional address info (c/o, apartment, Hinterhaus) */
  addressExtra: z.string().max(100).optional(),

  // Germany-only PLZ format (5 digits). International postal codes deferred.
  /** 5-digit German postal code (PLZ) */
  postalCode: z
    .string()
    .regex(/^\d{5}$/, 'PLZ muss genau 5 Ziffern haben')
    .optional()
    .or(z.literal('')),

  /** City name (auto-filled from PLZ via OpenPLZ API) */
  city: z.string().max(100).optional(),

  /** ISO 3166-1 alpha-2 country code (default: DE) */
  country: z.string().length(2).default('DE'),
});

export type Address = z.infer<typeof AddressSchema>;
