import { z } from 'zod';

/**
 * Member status enum - tracks lifecycle of club membership.
 * 6-state machine with 22 transitions. LEFT is no longer terminal;
 * members can re-enter via PENDING, PROBATION, or ACTIVE.
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
 * 22 transitions total. LEFT is no longer terminal - members can re-enter.
 *
 * State machine (22 transitions):
 *   PENDING    -> PROBATION, ACTIVE, LEFT                         (3)
 *   PROBATION  -> ACTIVE, DORMANT, SUSPENDED, LEFT                (4)
 *   ACTIVE     -> DORMANT, SUSPENDED, LEFT                        (3)
 *   DORMANT    -> ACTIVE, PROBATION, SUSPENDED, LEFT              (4)
 *   SUSPENDED  -> ACTIVE, DORMANT, PROBATION, LEFT                (4)
 *   LEFT       -> PENDING, PROBATION, ACTIVE                      (3 - re-entry)
 */
export const VALID_TRANSITIONS: Record<MemberStatus, readonly MemberStatus[]> = {
  PENDING: ['PROBATION', 'ACTIVE', 'LEFT'],
  PROBATION: ['ACTIVE', 'DORMANT', 'SUSPENDED', 'LEFT'],
  ACTIVE: ['DORMANT', 'SUSPENDED', 'LEFT'],
  DORMANT: ['ACTIVE', 'PROBATION', 'SUSPENDED', 'LEFT'],
  SUSPENDED: ['ACTIVE', 'DORMANT', 'PROBATION', 'LEFT'],
  LEFT: ['PENDING', 'PROBATION', 'ACTIVE'],
} as const;

/**
 * Category for why a member left the club.
 * Required when transitioning to LEFT status.
 * REJECTED is used when a pending application is denied.
 */
export const LeftCategorySchema = z.enum(['VOLUNTARY', 'EXCLUSION', 'REJECTED', 'DEATH', 'OTHER']);
export type LeftCategory = z.infer<typeof LeftCategorySchema>;

/**
 * Metadata for a named status transition - human-readable action label,
 * destructiveness flag, and optional auto-assigned left category.
 */
export interface NamedTransition {
  /** German action label for UI display */
  action: string;
  /** Whether this transition is destructive (requires confirmation) */
  destructive: boolean;
  /** Auto-assigned left category when transitioning to LEFT */
  autoLeftCategory?: LeftCategory;
}

/**
 * Named transitions map. Key format: "FROM-TO".
 * Provides German action labels, destructiveness flags,
 * and optional auto-assigned left categories for the 22 valid transitions.
 */
export const NAMED_TRANSITIONS: Record<string, NamedTransition> = {
  'PENDING-ACTIVE': { action: 'Annehmen', destructive: false },
  'PENDING-PROBATION': { action: 'Auf Probe aufnehmen', destructive: false },
  'PENDING-LEFT': { action: 'Ablehnen', destructive: true, autoLeftCategory: 'REJECTED' },
  'PROBATION-ACTIVE': { action: 'Probezeit bestaetigen', destructive: false },
  'PROBATION-DORMANT': { action: 'Ruhend stellen', destructive: false },
  'PROBATION-SUSPENDED': { action: 'Sperren', destructive: false },
  'PROBATION-LEFT': { action: 'Probezeit beenden', destructive: true },
  'ACTIVE-DORMANT': { action: 'Ruhend stellen', destructive: false },
  'ACTIVE-SUSPENDED': { action: 'Suspendieren', destructive: false },
  'ACTIVE-LEFT': { action: 'Austritt erfassen', destructive: true },
  'DORMANT-ACTIVE': { action: 'Reaktivieren', destructive: false },
  'DORMANT-PROBATION': { action: 'Probezeit fortsetzen', destructive: false },
  'DORMANT-SUSPENDED': { action: 'Sperren', destructive: false },
  'DORMANT-LEFT': { action: 'Austritt erfassen', destructive: true },
  'SUSPENDED-ACTIVE': { action: 'Sperre aufheben', destructive: false },
  'SUSPENDED-DORMANT': { action: 'Ruhend stellen', destructive: false },
  'SUSPENDED-PROBATION': { action: 'Probezeit fortsetzen', destructive: false },
  'SUSPENDED-LEFT': { action: 'Ausschliessen', destructive: true, autoLeftCategory: 'EXCLUSION' },
  'LEFT-PENDING': { action: 'Wiedereintritt erfassen', destructive: false },
  'LEFT-PROBATION': { action: 'Auf Probe aufnehmen', destructive: false },
  'LEFT-ACTIVE': { action: 'Wiederaufnehmen', destructive: false },
};

/**
 * Primary (default/recommended) action for each status.
 * Used by UI to highlight the most common transition.
 */
export const PRIMARY_STATUS_ACTION: Partial<Record<MemberStatus, MemberStatus>> = {
  PENDING: 'ACTIVE',
  PROBATION: 'ACTIVE',
  DORMANT: 'ACTIVE',
  SUSPENDED: 'ACTIVE',
  LEFT: 'ACTIVE',
};

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
