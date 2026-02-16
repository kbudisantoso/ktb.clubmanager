import { describe, it, expect } from 'vitest';
import {
  MemberStatusSchema,
  DEFAULT_MEMBER_STATUS,
  VALID_TRANSITIONS,
  LeftCategorySchema,
  PersonTypeSchema,
  SalutationSchema,
  HouseholdRoleSchema,
  DeletionReasonSchema,
  type MemberStatus,
} from './member-status.js';

describe('MemberStatusSchema', () => {
  it('should validate all 6 status values', () => {
    expect(MemberStatusSchema.parse('PENDING')).toBe('PENDING');
    expect(MemberStatusSchema.parse('PROBATION')).toBe('PROBATION');
    expect(MemberStatusSchema.parse('ACTIVE')).toBe('ACTIVE');
    expect(MemberStatusSchema.parse('DORMANT')).toBe('DORMANT');
    expect(MemberStatusSchema.parse('SUSPENDED')).toBe('SUSPENDED');
    expect(MemberStatusSchema.parse('LEFT')).toBe('LEFT');
  });

  it('should reject old INACTIVE status', () => {
    expect(() => MemberStatusSchema.parse('INACTIVE')).toThrow();
  });

  it('should reject invalid status values', () => {
    expect(() => MemberStatusSchema.parse('UNKNOWN')).toThrow();
    expect(() => MemberStatusSchema.parse('')).toThrow();
    expect(() => MemberStatusSchema.parse(123)).toThrow();
  });

  it('should provide safeParse for non-throwing validation', () => {
    const validResult = MemberStatusSchema.safeParse('ACTIVE');
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data).toBe('ACTIVE');
    }

    const invalidResult = MemberStatusSchema.safeParse('UNKNOWN');
    expect(invalidResult.success).toBe(false);
  });

  it('should have PENDING as default status', () => {
    expect(DEFAULT_MEMBER_STATUS).toBe('PENDING');
  });

  it('should allow type inference', () => {
    const status: MemberStatus = 'ACTIVE';
    expect(MemberStatusSchema.parse(status)).toBe(status);
  });
});

describe('VALID_TRANSITIONS', () => {
  it('should allow PENDING -> PROBATION, ACTIVE, LEFT', () => {
    expect(VALID_TRANSITIONS.PENDING).toEqual(['PROBATION', 'ACTIVE', 'LEFT']);
  });

  it('should allow PROBATION -> ACTIVE, LEFT', () => {
    expect(VALID_TRANSITIONS.PROBATION).toEqual(['ACTIVE', 'LEFT']);
  });

  it('should allow ACTIVE -> DORMANT, SUSPENDED, LEFT', () => {
    expect(VALID_TRANSITIONS.ACTIVE).toEqual(['DORMANT', 'SUSPENDED', 'LEFT']);
  });

  it('should allow DORMANT -> ACTIVE, LEFT', () => {
    expect(VALID_TRANSITIONS.DORMANT).toEqual(['ACTIVE', 'LEFT']);
  });

  it('should allow SUSPENDED -> ACTIVE, DORMANT, LEFT', () => {
    expect(VALID_TRANSITIONS.SUSPENDED).toEqual(['ACTIVE', 'DORMANT', 'LEFT']);
  });

  it('should make LEFT terminal (no transitions)', () => {
    expect(VALID_TRANSITIONS.LEFT).toEqual([]);
  });
});

describe('LeftCategorySchema', () => {
  it('should validate all left categories', () => {
    const categories = ['VOLUNTARY', 'EXCLUSION', 'DEATH', 'OTHER'];
    for (const c of categories) {
      expect(LeftCategorySchema.parse(c)).toBe(c);
    }
  });

  it('should reject invalid values', () => {
    expect(() => LeftCategorySchema.parse('UNKNOWN')).toThrow();
  });
});

describe('PersonTypeSchema', () => {
  it('should validate NATURAL and LEGAL_ENTITY', () => {
    expect(PersonTypeSchema.parse('NATURAL')).toBe('NATURAL');
    expect(PersonTypeSchema.parse('LEGAL_ENTITY')).toBe('LEGAL_ENTITY');
  });

  it('should reject invalid values', () => {
    expect(() => PersonTypeSchema.parse('COMPANY')).toThrow();
  });
});

describe('SalutationSchema', () => {
  it('should validate HERR, FRAU, DIVERS', () => {
    expect(SalutationSchema.parse('HERR')).toBe('HERR');
    expect(SalutationSchema.parse('FRAU')).toBe('FRAU');
    expect(SalutationSchema.parse('DIVERS')).toBe('DIVERS');
  });
});

describe('HouseholdRoleSchema', () => {
  it('should validate all household roles', () => {
    const roles = ['HEAD', 'SPOUSE', 'CHILD', 'OTHER'];
    for (const r of roles) {
      expect(HouseholdRoleSchema.parse(r)).toBe(r);
    }
  });
});

describe('DeletionReasonSchema', () => {
  it('should validate all deletion reasons', () => {
    const reasons = ['AUSTRITT', 'AUSSCHLUSS', 'DATENSCHUTZ', 'SONSTIGES'];
    for (const r of reasons) {
      expect(DeletionReasonSchema.parse(r)).toBe(r);
    }
  });
});
