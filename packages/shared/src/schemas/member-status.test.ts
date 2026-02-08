import { describe, it, expect } from 'vitest';
import {
  MemberStatusSchema,
  DEFAULT_MEMBER_STATUS,
  VALID_TRANSITIONS,
  PersonTypeSchema,
  SalutationSchema,
  MembershipTypeSchema,
  HouseholdRoleSchema,
  DeletionReasonSchema,
  type MemberStatus,
} from './member-status';

describe('MemberStatusSchema', () => {
  it('should validate valid status values', () => {
    expect(MemberStatusSchema.parse('ACTIVE')).toBe('ACTIVE');
    expect(MemberStatusSchema.parse('INACTIVE')).toBe('INACTIVE');
    expect(MemberStatusSchema.parse('PENDING')).toBe('PENDING');
    expect(MemberStatusSchema.parse('LEFT')).toBe('LEFT');
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
  it('should allow PENDING -> ACTIVE and LEFT', () => {
    expect(VALID_TRANSITIONS.PENDING).toEqual(['ACTIVE', 'LEFT']);
  });

  it('should allow ACTIVE -> INACTIVE and LEFT', () => {
    expect(VALID_TRANSITIONS.ACTIVE).toEqual(['INACTIVE', 'LEFT']);
  });

  it('should allow INACTIVE -> ACTIVE and LEFT', () => {
    expect(VALID_TRANSITIONS.INACTIVE).toEqual(['ACTIVE', 'LEFT']);
  });

  it('should make LEFT terminal (no transitions)', () => {
    expect(VALID_TRANSITIONS.LEFT).toEqual([]);
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

describe('MembershipTypeSchema', () => {
  it('should validate all membership types', () => {
    const types = ['ORDENTLICH', 'PASSIV', 'EHREN', 'FOERDER', 'JUGEND'];
    for (const t of types) {
      expect(MembershipTypeSchema.parse(t)).toBe(t);
    }
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
