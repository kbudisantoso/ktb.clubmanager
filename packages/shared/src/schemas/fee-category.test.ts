import { describe, expect, it } from 'vitest';
import { CreateFeeCategorySchema, FeeCategoryResponseSchema } from './fee-category.ts';

describe('CreateFeeCategorySchema', () => {
  const base = { name: 'Spartenbeitrag', amount: '50.00' };

  describe('proRataEligible', () => {
    it('defaults to false when omitted', () => {
      const result = CreateFeeCategorySchema.safeParse(base);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.proRataEligible).toBe(false);
      }
    });

    it('accepts true', () => {
      const result = CreateFeeCategorySchema.safeParse({ ...base, proRataEligible: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.proRataEligible).toBe(true);
      }
    });

    it('rejects non-boolean values', () => {
      const result = CreateFeeCategorySchema.safeParse({ ...base, proRataEligible: 'yes' });
      expect(result.success).toBe(false);
    });
  });
});

describe('FeeCategoryResponseSchema', () => {
  it('requires proRataEligible', () => {
    const valid = {
      id: 'fc-1',
      clubId: 'club-1',
      name: 'Spartenbeitrag',
      description: null,
      amount: '50.00',
      billingInterval: 'ANNUALLY',
      isActive: true,
      isOneTime: false,
      proRataEligible: true,
      sortOrder: 0,
      scope: 'ALL_MEMBERS',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(FeeCategoryResponseSchema.safeParse(valid).success).toBe(true);

    const { proRataEligible: _omitted, ...withoutFlag } = valid;
    expect(FeeCategoryResponseSchema.safeParse(withoutFlag).success).toBe(false);
  });
});
