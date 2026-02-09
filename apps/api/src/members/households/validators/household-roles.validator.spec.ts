import { describe, it, expect } from 'vitest';
import { IsHouseholdRoleMapConstraint } from './household-roles.validator';

describe('IsHouseholdRoleMapConstraint', () => {
  const validator = new IsHouseholdRoleMapConstraint();

  describe('valid inputs', () => {
    it('accepts valid role map', () => {
      expect(validator.validate({ memberId1: 'HEAD', memberId2: 'SPOUSE' })).toBe(true);
    });

    it('accepts all valid roles', () => {
      expect(validator.validate({ a: 'HEAD', b: 'SPOUSE', c: 'CHILD', d: 'OTHER' })).toBe(true);
    });

    it('accepts single entry', () => {
      expect(validator.validate({ id: 'HEAD' })).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects null', () => {
      expect(validator.validate(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(validator.validate(undefined)).toBe(false);
    });

    it('rejects arrays', () => {
      expect(validator.validate(['HEAD', 'SPOUSE'])).toBe(false);
    });

    it('rejects empty object', () => {
      expect(validator.validate({})).toBe(false);
    });

    it('rejects invalid role values', () => {
      expect(validator.validate({ id: 'ADMIN' })).toBe(false);
    });

    it('rejects non-string role values', () => {
      expect(validator.validate({ id: 123 })).toBe(false);
    });
  });

  describe('prototype pollution protection', () => {
    it('rejects __proto__ key', () => {
      expect(validator.validate({ __proto__: 'HEAD' })).toBe(false);
    });

    it('rejects constructor key', () => {
      expect(validator.validate({ constructor: 'HEAD' })).toBe(false);
    });

    it('rejects prototype key', () => {
      expect(validator.validate({ prototype: 'HEAD' })).toBe(false);
    });

    it('rejects dangerous key mixed with valid entries (via JSON.parse)', () => {
      // Object literal { __proto__: ... } sets prototype, not an enumerable key.
      // JSON.parse creates a real __proto__ property, as would malicious input.
      const malicious = JSON.parse('{"validId":"HEAD","__proto__":"SPOUSE"}');
      expect(validator.validate(malicious)).toBe(false);
    });
  });

  describe('size limits', () => {
    it('accepts 500 entries', () => {
      const map: Record<string, string> = {};
      for (let i = 0; i < 500; i++) map[`id-${i}`] = 'HEAD';
      expect(validator.validate(map)).toBe(true);
    });

    it('rejects 501 entries', () => {
      const map: Record<string, string> = {};
      for (let i = 0; i < 501; i++) map[`id-${i}`] = 'HEAD';
      expect(validator.validate(map)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('returns German error message', () => {
      expect(validator.defaultMessage()).toBe(
        'Jeder Rollenwert muss HEAD, SPOUSE, CHILD oder OTHER sein'
      );
    });
  });
});
