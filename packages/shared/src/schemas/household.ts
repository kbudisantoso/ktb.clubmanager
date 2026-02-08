import { z } from 'zod';
import { HouseholdRoleSchema } from './member-status.js';

/**
 * Schema for creating a new household group.
 * Households group members (e.g., "Familie Mustermann") with roles.
 */
export const CreateHouseholdSchema = z.object({
  /** Household name/label (e.g., "Familie Mustermann") */
  name: z.string().min(1, 'Haushaltsname ist erforderlich').max(200),

  /** Member IDs to add to the household */
  memberIds: z.array(z.string()).min(1, 'Mindestens ein Mitglied erforderlich'),

  /** Mapping of memberId to household role */
  roles: z.record(z.string(), HouseholdRoleSchema),

  /** Primary contact member ID (typically HEAD) */
  primaryContactId: z.string().optional(),
});

export type CreateHousehold = z.infer<typeof CreateHouseholdSchema>;

/**
 * Schema for updating an existing household.
 * Only name and primary contact can be updated directly.
 */
export const UpdateHouseholdSchema = z.object({
  /** Updated household name */
  name: z.string().min(1).max(200).optional(),

  /** Updated primary contact member ID */
  primaryContactId: z.string().optional(),
});

export type UpdateHousehold = z.infer<typeof UpdateHouseholdSchema>;

/**
 * Schema for adding a member to an existing household.
 */
export const AddHouseholdMemberSchema = z.object({
  /** Member ID to add */
  memberId: z.string().min(1),

  /** Role within the household */
  role: HouseholdRoleSchema,
});

export type AddHouseholdMember = z.infer<typeof AddHouseholdMemberSchema>;

/**
 * Schema for a household member as returned in API responses.
 * Subset of Member fields included via Prisma select.
 */
export const HouseholdMemberResponseSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  householdRole: HouseholdRoleSchema.nullable(),
  memberNumber: z.string(),
});

export type HouseholdMemberResponse = z.infer<typeof HouseholdMemberResponseSchema>;

/**
 * Full household response schema including server-generated fields.
 * Matches the shape returned by HouseholdsService.findAll/findOne.
 */
export const HouseholdResponseSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  name: z.string(),
  primaryContactId: z.string().nullable(),
  members: z.array(HouseholdMemberResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type HouseholdResponse = z.infer<typeof HouseholdResponseSchema>;
