import { describe, expect, it } from 'vitest';
import { UpdateClubSettingsSchema } from './club-settings.ts';

describe('UpdateClubSettingsSchema', () => {
  describe('email', () => {
    it('accepts valid email', () => {
      const result = UpdateClubSettingsSchema.safeParse({ email: 'test@example.com' });
      expect(result.success).toBe(true);
    });

    it('accepts empty string (cleared field)', () => {
      const result = UpdateClubSettingsSchema.safeParse({ email: '' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = UpdateClubSettingsSchema.safeParse({ email: 'not-an-email' });
      expect(result.success).toBe(false);
    });
  });

  describe('website', () => {
    it('accepts valid URL', () => {
      const result = UpdateClubSettingsSchema.safeParse({ website: 'https://example.com' });
      expect(result.success).toBe(true);
    });

    it('accepts empty string (cleared field)', () => {
      const result = UpdateClubSettingsSchema.safeParse({ website: '' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid URL', () => {
      const result = UpdateClubSettingsSchema.safeParse({ website: 'not-a-url' });
      expect(result.success).toBe(false);
    });
  });

  describe('foundedAt', () => {
    it('accepts valid date string', () => {
      const result = UpdateClubSettingsSchema.safeParse({ foundedAt: '2020-01-15' });
      expect(result.success).toBe(true);
    });

    it('accepts empty string (cleared field)', () => {
      const result = UpdateClubSettingsSchema.safeParse({ foundedAt: '' });
      expect(result.success).toBe(true);
    });
  });

  describe('probationPeriodDays', () => {
    it('accepts valid number', () => {
      const result = UpdateClubSettingsSchema.safeParse({ probationPeriodDays: 90 });
      expect(result.success).toBe(true);
    });

    it('transforms NaN to null (cleared number input)', () => {
      const result = UpdateClubSettingsSchema.safeParse({ probationPeriodDays: NaN });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.probationPeriodDays).toBeNull();
      }
    });

    it('rejects negative number', () => {
      const result = UpdateClubSettingsSchema.safeParse({ probationPeriodDays: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects number over 365', () => {
      const result = UpdateClubSettingsSchema.safeParse({ probationPeriodDays: 400 });
      expect(result.success).toBe(false);
    });
  });

  describe('shortCode', () => {
    it('accepts 2-character code', () => {
      const result = UpdateClubSettingsSchema.safeParse({ shortCode: 'SC' });
      expect(result.success).toBe(true);
    });

    it('accepts 4-character code', () => {
      const result = UpdateClubSettingsSchema.safeParse({ shortCode: 'WDCK' });
      expect(result.success).toBe(true);
    });

    it('accepts empty string (cleared field)', () => {
      const result = UpdateClubSettingsSchema.safeParse({ shortCode: '' });
      expect(result.success).toBe(true);
    });

    it('rejects 1-character code', () => {
      const result = UpdateClubSettingsSchema.safeParse({ shortCode: 'A' });
      expect(result.success).toBe(false);
    });

    it('rejects 5-character code', () => {
      const result = UpdateClubSettingsSchema.safeParse({ shortCode: 'ABCDE' });
      expect(result.success).toBe(false);
    });
  });

  describe('legalName', () => {
    it('accepts valid legal name', () => {
      const result = UpdateClubSettingsSchema.safeParse({
        legalName: 'Sportverein Musterstadt 1920 e.V.',
      });
      expect(result.success).toBe(true);
    });

    it('accepts null (clearable)', () => {
      const result = UpdateClubSettingsSchema.safeParse({ legalName: null });
      expect(result.success).toBe(true);
    });
  });
});
