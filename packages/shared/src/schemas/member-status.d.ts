import { z } from 'zod';
/**
 * Member status enum - tracks lifecycle of club membership.
 * Used across API and frontend for consistent status handling.
 */
export declare const MemberStatusSchema: z.ZodEnum<{
    ACTIVE: "ACTIVE";
    INACTIVE: "INACTIVE";
    PENDING: "PENDING";
}>;
/**
 * TypeScript type inferred from Zod schema.
 * This is the pattern for all shared types - schema is source of truth.
 */
export type MemberStatus = z.infer<typeof MemberStatusSchema>;
/**
 * Default member status for new members.
 */
export declare const DEFAULT_MEMBER_STATUS: MemberStatus;
//# sourceMappingURL=member-status.d.ts.map