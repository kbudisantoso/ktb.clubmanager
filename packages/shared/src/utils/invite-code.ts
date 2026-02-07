import { customAlphabet } from 'nanoid';

/**
 * Alphabet for invite codes - excludes ambiguous characters.
 * Removed: 0 (zero), O, 1, I, L (easily confused)
 */
const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generator function for 8-character codes.
 * Using nanoid for cryptographic randomness.
 */
const generateCode = customAlphabet(INVITE_ALPHABET, 8);

/**
 * Generates a new invite code.
 * 8 characters from unambiguous alphabet.
 *
 * @returns 8-character uppercase code (e.g., "HXNK4P9M")
 */
export function generateInviteCode(): string {
  return generateCode();
}

/**
 * Formats an invite code for display.
 * Adds hyphen in the middle: HXNK4P9M -> HXNK-4P9M
 *
 * @param code - 8-character code
 * @returns Formatted code with hyphen
 */
export function formatInviteCode(code: string): string {
  const normalized = code.replace(/[\s-]/g, '').toUpperCase();
  if (normalized.length !== 8) {
    return normalized; // Return as-is if wrong length
  }
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

/**
 * Normalizes user input to match stored code format.
 * Removes spaces and hyphens, converts to uppercase.
 *
 * @param input - User-entered code (e.g., "hxnk-4p9m" or "HXNK 4P9M")
 * @returns Normalized 8-character uppercase code
 */
export function normalizeInviteCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Validates invite code format.
 *
 * @param code - Normalized code to validate
 * @returns true if code matches expected format
 */
export function isInviteCodeValid(code: string): boolean {
  const normalized = normalizeInviteCode(code);
  // Must be exactly 8 characters from allowed alphabet
  return normalized.length === 8 && /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(normalized);
}
