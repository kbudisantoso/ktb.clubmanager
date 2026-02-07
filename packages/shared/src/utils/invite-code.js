'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.generateInviteCode = generateInviteCode;
exports.formatInviteCode = formatInviteCode;
exports.normalizeInviteCode = normalizeInviteCode;
exports.isInviteCodeValid = isInviteCodeValid;
const nanoid_1 = require('nanoid');
/**
 * Alphabet for invite codes - excludes ambiguous characters.
 * Removed: 0 (zero), O, 1, I, L (easily confused)
 */
const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/**
 * Generator function for 8-character codes.
 * Using nanoid for cryptographic randomness.
 */
const generateCode = (0, nanoid_1.customAlphabet)(INVITE_ALPHABET, 8);
/**
 * Generates a new invite code.
 * 8 characters from unambiguous alphabet.
 *
 * @returns 8-character uppercase code (e.g., "HXNK4P9M")
 */
function generateInviteCode() {
  return generateCode();
}
/**
 * Formats an invite code for display.
 * Adds hyphen in the middle: HXNK4P9M -> HXNK-4P9M
 *
 * @param code - 8-character code
 * @returns Formatted code with hyphen
 */
function formatInviteCode(code) {
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
function normalizeInviteCode(input) {
  return input.replace(/[\s-]/g, '').toUpperCase();
}
/**
 * Validates invite code format.
 *
 * @param code - Normalized code to validate
 * @returns true if code matches expected format
 */
function isInviteCodeValid(code) {
  const normalized = normalizeInviteCode(code);
  // Must be exactly 8 characters from allowed alphabet
  return normalized.length === 8 && /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(normalized);
}
