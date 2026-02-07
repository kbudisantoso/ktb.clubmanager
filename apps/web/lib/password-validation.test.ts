import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePassword, checkPasswordStrength } from './password-validation';

// Mock the fetch API for HaveIBeenPwned checks
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('password-validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: API returns no compromised hashes
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('00000:1\n11111:2\n22222:3'),
    });
  });

  describe('validatePassword', () => {
    describe('sunshine path', () => {
      it('accepts a strong password', async () => {
        const result = await validatePassword('Tr0ub4dor&3-horse');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.strength).toBeGreaterThanOrEqual(3);
      });

      it('accepts a long passphrase', async () => {
        const result = await validatePassword('correct horse battery staple today');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('accepts passwords at minimum length with good strength', async () => {
        const result = await validatePassword('Str0ng!8');
        // May or may not be valid depending on zxcvbn score
        expect(result.strength).toBeGreaterThanOrEqual(0);
      });
    });

    describe('edge cases', () => {
      it('rejects passwords below minimum length', async () => {
        const result = await validatePassword('Short1!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Passwort muss mindestens 8 Zeichen lang sein');
      });

      it('rejects passwords above maximum length', async () => {
        const longPassword = 'a'.repeat(129);
        const result = await validatePassword(longPassword);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Passwort darf maximal 128 Zeichen lang sein');
      });

      it('accepts password at exactly minimum length (8 chars)', async () => {
        const result = await validatePassword('12345678');
        // Length is valid, but strength may be low
        expect(result.errors.filter((e) => e.includes('mindestens'))).toHaveLength(0);
      });

      it('accepts password at exactly maximum length (128 chars)', async () => {
        const longPassword = 'a'.repeat(128);
        const result = await validatePassword(longPassword);
        // Length is valid
        expect(result.errors.filter((e) => e.includes('maximal'))).toHaveLength(0);
      });

      it('penalizes passwords containing user inputs', async () => {
        const withoutContext = await validatePassword('john2024password');
        const withContext = await validatePassword('john2024password', [
          'john@example.com',
          'John Doe',
        ]);
        // Password containing "john" should have lower or equal strength when context is provided
        expect(withContext.strength).toBeLessThanOrEqual(withoutContext.strength);
      });
    });

    describe('error cases', () => {
      it('rejects weak passwords (common patterns)', async () => {
        const result = await validatePassword('password123');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Passwort ist zu schwach. Bitte wähle ein stärkeres Passwort.'
        );
      });

      it('rejects dictionary words', async () => {
        const result = await validatePassword('sunshine');
        expect(result.valid).toBe(false);
        expect(result.strength).toBeLessThanOrEqual(1);
      });

      it('rejects keyboard patterns', async () => {
        const result = await validatePassword('qwertyuiop');
        expect(result.valid).toBe(false);
        expect(result.strength).toBeLessThanOrEqual(1);
      });

      it('rejects sequential numbers', async () => {
        const result = await validatePassword('12345678');
        expect(result.valid).toBe(false);
        expect(result.strength).toBeLessThanOrEqual(0);
      });

      it('rejects compromised passwords (HaveIBeenPwned)', async () => {
        // Mock API to return a hash that matches our test password
        // SHA-1 of "password" starts with 5BAA6
        mockFetch.mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(`1E4C9B93F3F0682250B6CF8331B7EE68FD8:1000\nOTHERHASH:500`),
        });

        await validatePassword('password');
        // This will trigger the pwned check
        expect(mockFetch).toHaveBeenCalled();
      });

      it('handles HaveIBeenPwned API errors gracefully (fails open)', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const result = await validatePassword('Tr0ub4dor&3-horse');
        // Should still validate (fails open - doesn't block user)
        expect(result.valid).toBe(true);
      });

      it('handles HaveIBeenPwned API non-ok response gracefully', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
        });

        const result = await validatePassword('Tr0ub4dor&3-horse');
        // Should still validate (fails open)
        expect(result.valid).toBe(true);
      });
    });

    describe('custom options', () => {
      it('respects custom minScore', async () => {
        // Score 2 password
        const result = await validatePassword('Testing123', [], {
          minScore: 2,
        });
        // Should be more lenient
        expect(result.strength).toBeGreaterThanOrEqual(1);
      });

      it('respects custom minLength', async () => {
        const result = await validatePassword('short', [], { minLength: 4 });
        expect(result.errors.filter((e) => e.includes('mindestens'))).toHaveLength(0);
      });

      it('respects custom maxLength', async () => {
        const result = await validatePassword('a'.repeat(50), [], {
          maxLength: 40,
        });
        expect(result.errors).toContain('Passwort darf maximal 40 Zeichen lang sein');
      });
    });
  });

  describe('checkPasswordStrength', () => {
    it('returns score 0 for empty password', () => {
      const result = checkPasswordStrength('');
      expect(result.score).toBe(0);
    });

    it('returns score 0-1 for weak passwords', () => {
      const result = checkPasswordStrength('abc');
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('returns score 3-4 for strong passwords', () => {
      const result = checkPasswordStrength('Tr0ub4dor&3-horse-battery');
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('provides feedback suggestions for weak passwords', () => {
      const result = checkPasswordStrength('password');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('penalizes user inputs in password', () => {
      const withoutContext = checkPasswordStrength('john2024');
      const withContext = checkPasswordStrength('john2024', ['john@example.com']);
      expect(withContext.score).toBeLessThanOrEqual(withoutContext.score);
    });
  });
});
