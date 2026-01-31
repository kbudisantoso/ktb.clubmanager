import { describe, it, expect } from 'vitest';
import {
  generateInviteCode,
  formatInviteCode,
  normalizeInviteCode,
  isInviteCodeValid,
} from './invite-code.js';

describe('generateInviteCode', () => {
  it('should generate 8-character code', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
  });

  it('should generate uppercase code', () => {
    const code = generateInviteCode();
    expect(code).toBe(code.toUpperCase());
  });

  it('should only use unambiguous characters', () => {
    const code = generateInviteCode();
    // Should not contain: 0, O, 1, I, L
    expect(code).not.toMatch(/[01OIL]/);
  });

  it('should generate unique codes', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    expect(codes.size).toBe(100);
  });
});

describe('formatInviteCode', () => {
  it('should add hyphen in the middle', () => {
    expect(formatInviteCode('ABCD1234')).toBe('ABCD-1234');
  });

  it('should handle lowercase input', () => {
    expect(formatInviteCode('abcd1234')).toBe('ABCD-1234');
  });

  it('should remove existing hyphens', () => {
    expect(formatInviteCode('AB-CD-12-34')).toBe('ABCD-1234');
  });

  it('should remove spaces', () => {
    expect(formatInviteCode('ABCD 1234')).toBe('ABCD-1234');
  });

  it('should return as-is for wrong length', () => {
    expect(formatInviteCode('ABC')).toBe('ABC');
    expect(formatInviteCode('ABCDE12345')).toBe('ABCDE12345');
  });
});

describe('normalizeInviteCode', () => {
  it('should remove hyphens', () => {
    expect(normalizeInviteCode('ABCD-1234')).toBe('ABCD1234');
  });

  it('should remove spaces', () => {
    expect(normalizeInviteCode('ABCD 1234')).toBe('ABCD1234');
  });

  it('should convert to uppercase', () => {
    expect(normalizeInviteCode('abcd-1234')).toBe('ABCD1234');
  });

  it('should handle mixed input', () => {
    expect(normalizeInviteCode('ab cd-12 34')).toBe('ABCD1234');
  });
});

describe('isInviteCodeValid', () => {
  it('should return true for valid codes', () => {
    expect(isInviteCodeValid('ABCD1234')).toBe(false); // Contains 1
    expect(isInviteCodeValid('HXNK4P9M')).toBe(true);
    expect(isInviteCodeValid('ABCDEFGH')).toBe(true);
    expect(isInviteCodeValid('23456789')).toBe(true);
  });

  it('should handle formatted codes', () => {
    expect(isInviteCodeValid('HXNK-4P9M')).toBe(true);
    expect(isInviteCodeValid('hxnk-4p9m')).toBe(true);
  });

  it('should reject codes with ambiguous characters', () => {
    expect(isInviteCodeValid('0000AAAA')).toBe(false); // 0 is excluded
    expect(isInviteCodeValid('1111AAAA')).toBe(false); // 1 is excluded
    expect(isInviteCodeValid('OOOOAAAA')).toBe(false); // O is excluded
    expect(isInviteCodeValid('IIIIAAAA')).toBe(false); // I is excluded
    expect(isInviteCodeValid('LLLLAAAA')).toBe(false); // L is excluded
  });

  it('should reject wrong length codes', () => {
    expect(isInviteCodeValid('ABC')).toBe(false);
    expect(isInviteCodeValid('ABCDEFGHIJ')).toBe(false);
  });
});
