import { hashPassword } from 'better-auth/crypto';

/**
 * Resolve a password field pair into a hash suitable for auth_accounts.password.
 *
 * Uses Better Auth's own hashPassword to guarantee identical hashing
 * (scrypt via @noble/hashes, N=16384, r=16, p=1, dkLen=64).
 *
 * Rules:
 * - passwordHash set  → return as-is (already hashed)
 * - password set       → hash with Better Auth's scrypt and return
 * - both set           → throw (ambiguous)
 * - neither set        → return null (no account will be created)
 */
export async function resolvePassword(
  password?: string,
  passwordHash?: string
): Promise<string | null> {
  if (password && passwordHash) {
    throw new Error('Sowohl password als auch passwordHash gesetzt — nur eines erlaubt.');
  }
  if (passwordHash) return passwordHash;
  if (password) return hashPassword(password);
  return null;
}
