import { describe, it, expect } from 'vitest';
import {
  MemberStatusSchema,
  DEFAULT_MEMBER_STATUS,
  type MemberStatus,
} from './member-status';

describe('MemberStatusSchema', () => {
  it('should validate valid status values', () => {
    expect(MemberStatusSchema.parse('ACTIVE')).toBe('ACTIVE');
    expect(MemberStatusSchema.parse('INACTIVE')).toBe('INACTIVE');
    expect(MemberStatusSchema.parse('PENDING')).toBe('PENDING');
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
    // TypeScript will catch this at compile time, but we verify runtime behavior
    const status: MemberStatus = 'ACTIVE';
    expect(MemberStatusSchema.parse(status)).toBe(status);
  });
});
