import { z } from 'zod';

/**
 * Member status enum - tracks lifecycle of club membership.
 * 6-state machine: PENDING -> PROBATION -> ACTIVE -> DORMANT/SUSPENDED/LEFT
 */
export const MemberStatusSchema = z.enum([
  'PENDING',
  'PROBATION',
  'ACTIVE',
  'DORMANT',
  'SUSPENDED',
  'LEFT',
]);

/**
 * TypeScript type inferred from Zod schema.
 * This is the pattern for all shared types - schema is source of truth.
 */
export type MemberStatus = z.infer<typeof MemberStatusSchema>;

/**
 * Default member status for new members.
 */
export const DEFAULT_MEMBER_STATUS: MemberStatus = 'PENDING';

/**
 * Valid status transitions for the member lifecycle state machine.
 * LEFT is terminal - no transitions out of LEFT.
 *
 * State machine:
 *   PENDING    -> PROBATION, ACTIVE, LEFT
 *   PROBATION  -> ACTIVE, LEFT
 *   ACTIVE     -> DORMANT, SUSPENDED, LEFT
 *   DORMANT    -> ACTIVE, LEFT
 *   SUSPENDED  -> ACTIVE, DORMANT, LEFT
 *   LEFT       -> (terminal)
 */
export const VALID_TRANSITIONS: Record<MemberStatus, readonly MemberStatus[]> = {
  PENDING: ['PROBATION', 'ACTIVE', 'LEFT'],
  PROBATION: ['ACTIVE', 'LEFT'],
  ACTIVE: ['DORMANT', 'SUSPENDED', 'LEFT'],
  DORMANT: ['ACTIVE', 'LEFT'],
  SUSPENDED: ['ACTIVE', 'DORMANT', 'LEFT'],
  LEFT: [],
} as const;

/**
 * Category for why a member left the club.
 * Required when transitioning to LEFT status.
 */
export const LeftCategorySchema = z.enum(['VOLUNTARY', 'EXCLUSION', 'DEATH', 'OTHER']);
export type LeftCategory = z.infer<typeof LeftCategorySchema>;

/**
 * Person type - distinguishes natural persons from legal entities (e.g., companies, associations).
 */
export const PersonTypeSchema = z.enum(['NATURAL', 'LEGAL_ENTITY']);
export type PersonType = z.infer<typeof PersonTypeSchema>;

/**
 * Salutation - German form of address.
 */
export const SalutationSchema = z.enum(['HERR', 'FRAU', 'DIVERS']);
export type Salutation = z.infer<typeof SalutationSchema>;

/**
 * Household role - role of a member within a household group.
 */
export const HouseholdRoleSchema = z.enum(['HEAD', 'SPOUSE', 'CHILD', 'OTHER']);
export type HouseholdRole = z.infer<typeof HouseholdRoleSchema>;

/**
 * Deletion reason - required when soft-deleting a member.
 * German terms: AUSTRITT (voluntary exit), AUSSCHLUSS (expulsion),
 * DATENSCHUTZ (DSGVO/privacy), SONSTIGES (other).
 */
export const DeletionReasonSchema = z.enum(['AUSTRITT', 'AUSSCHLUSS', 'DATENSCHUTZ', 'SONSTIGES']);
export type DeletionReason = z.infer<typeof DeletionReasonSchema>;
