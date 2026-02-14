import { z } from 'zod';

/**
 * Schema for creating a new membership period.
 * Membership periods track when a member was active with which type.
 * Multiple periods per member support re-entry scenarios.
 * Date fields use z.string().date() (YYYY-MM-DD) - no z.coerce.
 */
export const CreateMembershipPeriodSchema = z
  .object({
    /** Start date of the membership period (ISO date string YYYY-MM-DD) */
    joinDate: z.string().date('Ungueltiges Eintrittsdatum (YYYY-MM-DD erwartet)'),

    /** End date of the membership period (null = current/ongoing) */
    leaveDate: z.string().date('Ungueltiges Austrittsdatum (YYYY-MM-DD erwartet)').optional(),

    /** Membership type ID (FK to MembershipType entity) */
    membershipTypeId: z.string().optional(),

    /** Optional notes about this period */
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.leaveDate && data.joinDate) {
        return data.leaveDate >= data.joinDate;
      }
      return true;
    },
    {
      message: 'Austrittsdatum muss nach dem Eintrittsdatum liegen',
      path: ['leaveDate'],
    }
  );

export type CreateMembershipPeriod = z.infer<typeof CreateMembershipPeriodSchema>;

/**
 * Schema for updating an existing membership period.
 * All fields optional except validation constraints.
 */
export const UpdateMembershipPeriodSchema = z
  .object({
    /** Updated join date */
    joinDate: z.string().date().optional(),

    /** Updated leave date */
    leaveDate: z.string().date().optional(),

    /** Updated membership type ID (FK to MembershipType entity) */
    membershipTypeId: z.string().optional(),

    /** Updated notes */
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.leaveDate && data.joinDate) {
        return data.leaveDate >= data.joinDate;
      }
      return true;
    },
    {
      message: 'Austrittsdatum muss nach dem Eintrittsdatum liegen',
      path: ['leaveDate'],
    }
  );

export type UpdateMembershipPeriod = z.infer<typeof UpdateMembershipPeriodSchema>;

/**
 * Full membership period response schema including server-generated fields.
 * Matches the shape returned by MembershipPeriodsService.
 */
export const MembershipPeriodResponseSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  /** Start date of the membership period (YYYY-MM-DD) */
  joinDate: z.string().nullable(),
  /** End date of the membership period (null = current/ongoing) */
  leaveDate: z.string().nullable(),
  /** FK to MembershipType entity */
  membershipTypeId: z.string().nullable().optional(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MembershipPeriodResponse = z.infer<typeof MembershipPeriodResponseSchema>;
