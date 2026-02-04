/**
 * Generates a new invite code.
 * 8 characters from unambiguous alphabet.
 *
 * @returns 8-character uppercase code (e.g., "HXNK4P9M")
 */
export declare function generateInviteCode(): string;
/**
 * Formats an invite code for display.
 * Adds hyphen in the middle: HXNK4P9M -> HXNK-4P9M
 *
 * @param code - 8-character code
 * @returns Formatted code with hyphen
 */
export declare function formatInviteCode(code: string): string;
/**
 * Normalizes user input to match stored code format.
 * Removes spaces and hyphens, converts to uppercase.
 *
 * @param input - User-entered code (e.g., "hxnk-4p9m" or "HXNK 4P9M")
 * @returns Normalized 8-character uppercase code
 */
export declare function normalizeInviteCode(input: string): string;
/**
 * Validates invite code format.
 *
 * @param code - Normalized code to validate
 * @returns true if code matches expected format
 */
export declare function isInviteCodeValid(code: string): boolean;
//# sourceMappingURL=invite-code.d.ts.map