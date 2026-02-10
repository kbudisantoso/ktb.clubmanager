import { describe, it, expect } from 'vitest';
import { generateSlug, isSlugValid, isSlugReserved, validateSlug } from './slug.ts';

describe('generateSlug', () => {
  it('should convert name to lowercase slug', () => {
    expect(generateSlug('FC Test')).toBe('fc-test');
  });

  it('should handle spaces and special characters', () => {
    expect(generateSlug('TSV Gruen-Weiss 1908')).toBe('tsv-gruen-weiss-1908');
  });

  it('should handle club names with umlauts', () => {
    // The slugify library should handle these properly
    expect(generateSlug('Muenchener Sportverein')).toBe('muenchener-sportverein');
  });
});

describe('isSlugValid', () => {
  it('should accept valid slugs', () => {
    expect(isSlugValid('abc')).toBe(true);
    expect(isSlugValid('my-club')).toBe(true);
    expect(isSlugValid('fc-1908')).toBe(true);
    expect(isSlugValid('tsv-test-club-1234')).toBe(true);
  });

  it('should reject too short slugs', () => {
    expect(isSlugValid('ab')).toBe(false);
    expect(isSlugValid('a')).toBe(false);
    expect(isSlugValid('')).toBe(false);
  });

  it('should reject too long slugs', () => {
    expect(isSlugValid('a'.repeat(51))).toBe(false);
  });

  it('should accept edge case lengths', () => {
    expect(isSlugValid('abc')).toBe(true); // 3 chars min
    expect(isSlugValid('a'.repeat(50))).toBe(true); // 50 chars max
  });

  it('should reject slugs starting or ending with hyphen', () => {
    expect(isSlugValid('-abc')).toBe(false);
    expect(isSlugValid('abc-')).toBe(false);
    expect(isSlugValid('-abc-')).toBe(false);
  });

  it('should reject consecutive hyphens', () => {
    expect(isSlugValid('my--club')).toBe(false);
    expect(isSlugValid('test---name')).toBe(false);
  });

  it('should reject uppercase letters', () => {
    expect(isSlugValid('ABC')).toBe(false);
    expect(isSlugValid('MyClub')).toBe(false);
  });
});

describe('isSlugReserved', () => {
  it('should return true for reserved slugs', () => {
    expect(isSlugReserved('admin')).toBe(true);
    expect(isSlugReserved('api')).toBe(true);
    expect(isSlugReserved('auth')).toBe(true);
    expect(isSlugReserved('login')).toBe(true);
    expect(isSlugReserved('impressum')).toBe(true);
    expect(isSlugReserved('dashboard')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isSlugReserved('ADMIN')).toBe(true);
    expect(isSlugReserved('Admin')).toBe(true);
  });

  it('should return false for non-reserved slugs', () => {
    expect(isSlugReserved('my-club')).toBe(false);
    expect(isSlugReserved('tsv-test')).toBe(false);
    expect(isSlugReserved('fc-1908')).toBe(false);
  });
});

describe('validateSlug', () => {
  it('should return valid for good slugs', () => {
    const result = validateSlug('my-club');
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should return invalid for reserved slugs', () => {
    const result = validateSlug('admin');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('This slug is reserved');
  });

  it('should return invalid for invalid format', () => {
    const result = validateSlug('ab');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('3-50');
  });
});
