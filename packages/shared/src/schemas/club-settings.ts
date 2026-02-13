import { z } from 'zod';
import { MembershipTypeSchema } from './member-status.ts';

/**
 * Zweckbestimmung / Purpose classification of the club.
 * Must match Prisma ClubPurpose enum exactly.
 */
export const ClubPurposeSchema = z.enum(['IDEALVEREIN', 'WIRTSCHAFTLICH']);
export type ClubPurpose = z.infer<typeof ClubPurposeSchema>;

/**
 * Sonderform / Special organizational form of the club.
 * Must match Prisma ClubSpecialForm enum exactly.
 */
export const ClubSpecialFormSchema = z.enum([
  'KEINE',
  'TRAEGERVEREIN',
  'FOERDERVEREIN',
  'DACHVERBAND',
]);
export type ClubSpecialForm = z.infer<typeof ClubSpecialFormSchema>;

/**
 * Club visibility setting.
 * Must match Prisma ClubVisibility enum exactly.
 */
export const ClubVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE']);
export type ClubVisibility = z.infer<typeof ClubVisibilitySchema>;

/**
 * Schema for updating club settings (PATCH semantics).
 * All fields optional — only provided fields are updated.
 * Uses `.optional().nullable()` for clearable fields and `.optional()` for booleans/enums with defaults.
 */
export const UpdateClubSettingsSchema = z.object({
  // Stammdaten
  name: z.string().min(2).max(100).optional(),
  shortCode: z.string().max(10).optional().nullable(),
  foundedAt: z.string().date().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),

  // Adresse & Kontakt
  street: z.string().max(200).optional().nullable(),
  houseNumber: z.string().max(20).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),

  // Vereinsregister
  isRegistered: z.boolean().optional(),
  registryCourt: z.string().max(200).optional().nullable(),
  registryNumber: z.string().max(50).optional().nullable(),
  clubPurpose: ClubPurposeSchema.optional().nullable(),
  clubSpecialForm: ClubSpecialFormSchema.optional().nullable(),

  // Steuerdaten
  taxNumber: z.string().max(50).optional().nullable(),
  vatId: z.string().max(20).optional().nullable(),
  taxOffice: z.string().max(200).optional().nullable(),
  isNonProfit: z.boolean().optional(),

  // Bankverbindung
  iban: z.string().max(34).optional().nullable(),
  bic: z.string().max(11).optional().nullable(),
  bankName: z.string().max(200).optional().nullable(),
  accountHolder: z.string().max(200).optional().nullable(),

  // Betriebseinstellungen
  fiscalYearStartMonth: z.number().int().min(1).max(12).optional().nullable(),
  defaultMembershipType: MembershipTypeSchema.optional().nullable(),
  probationPeriodDays: z.number().int().min(0).max(365).optional().nullable(),

  // Sichtbarkeit
  visibility: ClubVisibilitySchema.optional(),

  // Logo (file reference)
  logoFileId: z.string().optional().nullable(),
});

export type UpdateClubSettings = z.infer<typeof UpdateClubSettingsSchema>;
