import { z } from 'zod';

/**
 * Member status enum - tracks lifecycle of club membership.
 * Used across API and frontend for consistent status handling.
 */
export const MemberStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'PENDING']);

/**
 * TypeScript type inferred from Zod schema.
 * This is the pattern for all shared types - schema is source of truth.
 */
export type MemberStatus = z.infer<typeof MemberStatusSchema>;

/**
 * Default member status for new members.
 */
export const DEFAULT_MEMBER_STATUS: MemberStatus = 'PENDING';
