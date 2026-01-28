import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnDePackage from "@zxcvbn-ts/language-de";

// Initialize zxcvbn with German dictionary
const options = {
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnDePackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnDePackage.translations,
};
zxcvbnOptions.setOptions(options);

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: number; // 0-4 (zxcvbn score)
  warning?: string;
  suggestions: string[];
}

export interface PasswordValidationOptions {
  minScore?: number; // zxcvbn score 0-4, default 3
  minLength?: number; // absolute floor, default 8
  maxLength?: number; // default 128
}

/**
 * Validate password using strength-based approach (NIST SP 800-63B-4 aligned).
 *
 * - Minimum zxcvbn score (default: 3 = "safely unguessable")
 * - Absolute minimum length floor (default: 8 chars)
 * - Maximum 128 characters (support passphrases)
 * - NO composition rules (no uppercase/number/symbol requirements)
 * - Blocklist check (compromised passwords via HaveIBeenPwned)
 *
 * @param password The password to validate
 * @param userInputs Context words to penalize (email, name)
 * @param options Validation options
 */
export async function validatePassword(
  password: string,
  userInputs: string[] = [],
  options: PasswordValidationOptions = {}
): Promise<PasswordValidationResult> {
  const { minScore = 3, minLength = 8, maxLength = 128 } = options;
  const errors: string[] = [];

  // Length checks (absolute floor, not strength-based)
  if (password.length < minLength) {
    errors.push(`Passwort muss mindestens ${minLength} Zeichen lang sein`);
  }
  if (password.length > maxLength) {
    errors.push(`Passwort darf maximal ${maxLength} Zeichen lang sein`);
  }

  // Strength analysis (zxcvbn) - PRIMARY CHECK
  const result = zxcvbn(password, userInputs);

  // Require minimum strength score
  if (result.score < minScore) {
    errors.push(
      "Passwort ist zu schwach. Bitte wähle ein stärkeres Passwort."
    );
  }

  // Blocklist check (HaveIBeenPwned API - k-anonymity)
  const isCompromised = await checkPwnedPassword(password);
  if (isCompromised) {
    errors.push(
      "Dieses Passwort wurde in einem Datenleck gefunden. Bitte wähle ein anderes."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    strength: result.score,
    warning: result.feedback.warning || undefined,
    suggestions: result.feedback.suggestions,
  };
}

/**
 * Check password strength without async blocklist check.
 * Use for real-time UI feedback.
 */
export function checkPasswordStrength(
  password: string,
  userInputs: string[] = []
): { score: number; warning?: string; suggestions: string[] } {
  const result = zxcvbn(password, userInputs);
  return {
    score: result.score,
    warning: result.feedback.warning || undefined,
    suggestions: result.feedback.suggestions,
  };
}

/**
 * Check if password appears in HaveIBeenPwned database.
 * Uses k-anonymity model (only first 5 chars of SHA-1 hash sent).
 * Fails open on network error (returns false, doesn't block user).
 */
async function checkPwnedPassword(password: string): Promise<boolean> {
  try {
    // SHA-1 hash of password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const hashUpper = hashHex.toUpperCase();

    // Send only first 5 chars (k-anonymity)
    const prefix = hashUpper.substring(0, 5);
    const suffix = hashUpper.substring(5);

    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          "Add-Padding": "true", // Reduce info leakage
        },
      }
    );

    if (!response.ok) {
      // API error - fail open (don't block user)
      console.error("HaveIBeenPwned API error:", response.status);
      return false;
    }

    const text = await response.text();
    const hashes = text.split("\n");

    // Check if suffix appears in response
    return hashes.some((line) => line.startsWith(suffix));
  } catch (error) {
    // Network error - fail open
    console.error("HaveIBeenPwned API error:", error);
    return false;
  }
}
