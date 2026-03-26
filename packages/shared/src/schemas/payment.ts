import { z } from 'zod';

/**
 * Source of a payment recording.
 */
export const PaymentSourceEnum = z.enum(['MANUAL', 'BANK_IMPORT', 'SEPA']);
export type PaymentSource = z.infer<typeof PaymentSourceEnum>;

/**
 * Regex for validating decimal amounts (e.g., "12.50", "0.00", "1000.99").
 */
const DECIMAL_REGEX = /^\d+(\.\d{1,2})?$/;

/**
 * Schema for recording a new payment against a fee charge.
 */
export const RecordPaymentSchema = z.object({
  /** The fee charge this payment is for */
  feeChargeId: z.string(),

  /** Payment amount as decimal string */
  amount: z.string().regex(DECIMAL_REGEX, 'Betrag muss ein gueltiges Dezimalformat haben'),

  /** Date the payment was made (ISO date string, e.g., "2026-01-15") */
  paidAt: z.string().date(),

  /** Optional notes about this payment */
  notes: z.string().max(500).optional(),
});

export type RecordPayment = z.infer<typeof RecordPaymentSchema>;

/**
 * Full payment response schema including server-generated fields.
 */
export const PaymentResponseSchema = z.object({
  id: z.string(),
  feeChargeId: z.string(),
  amount: z.string(),
  paidAt: z.string(),
  source: PaymentSourceEnum,
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  recordedBy: z.string(),
  createdAt: z.string(),
});

export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;
