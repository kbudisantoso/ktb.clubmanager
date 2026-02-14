import { z } from 'zod';

/**
 * Schema for creating a new membership type (club-scoped entity).
 * Replaces the former MembershipType enum with a dynamic, configurable model.
 */
export const CreateMembershipTypeSchema = z.object({
  /** Display name (e.g., "Ordentliches Mitglied") */
  name: z.string().min(1, 'Name ist erforderlich').max(100),

  /** Short code (e.g., "ORDENTLICH") - unique per club, uppercase */
  code: z
    .string()
    .min(1, 'Code ist erforderlich')
    .max(20)
    .regex(/^[A-Z0-9_]+$/, 'Code muss aus Grossbuchstaben, Ziffern oder Unterstrichen bestehen'),

  /** Optional longer description */
  description: z.string().max(500).optional(),

  /** Whether this is the default type for new members */
  isDefault: z.boolean().optional(),

  /** Display order in lists */
  sortOrder: z.number().int().min(0).optional(),

  /** Whether this type is currently available for selection */
  isActive: z.boolean().optional(),

  /** Whether members of this type have voting rights */
  vote: z.boolean().optional(),

  /** Whether members can attend general assembly */
  assemblyAttendance: z.boolean().optional(),

  /** Whether members are eligible for board positions */
  eligibleForOffice: z.boolean().optional(),
});

export type CreateMembershipType = z.infer<typeof CreateMembershipTypeSchema>;

/**
 * Schema for updating an existing membership type.
 * All fields optional for partial updates.
 */
export const UpdateMembershipTypeSchema = CreateMembershipTypeSchema.partial();

export type UpdateMembershipType = z.infer<typeof UpdateMembershipTypeSchema>;

/**
 * Full membership type response schema including server-generated fields.
 */
export const MembershipTypeResponseSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable().optional(),
  isDefault: z.boolean(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  vote: z.boolean(),
  assemblyAttendance: z.boolean(),
  eligibleForOffice: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MembershipTypeResponse = z.infer<typeof MembershipTypeResponseSchema>;
