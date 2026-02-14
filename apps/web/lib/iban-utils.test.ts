import { describe, it, expect } from 'vitest';
import { validateAndLookupIBAN, formatIBAN } from './iban-utils';

describe('validateAndLookupIBAN', () => {
  // Happy path
  it('should validate a correct German IBAN and return bank data', () => {
    // Deutsche Bank Frankfurt
    const result = validateAndLookupIBAN('DE89 3704 0044 0532 0130 00');

    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
    expect(result.electronic).toBe('DE89370400440532013000');
    expect(result.bankName).toBeTruthy();
    expect(result.bic).toBeTruthy();
  });

  it('should validate a correct non-German IBAN without bank lookup', () => {
    // Austrian IBAN
    const result = validateAndLookupIBAN('AT611904300234573201');

    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
    expect(result.bankName).toBeNull();
    expect(result.bic).toBeNull();
  });

  // Edge cases
  it('should return neutral result for empty input', () => {
    const result = validateAndLookupIBAN('');

    expect(result.valid).toBe(false);
    expect(result.error).toBeNull();
    expect(result.electronic).toBe('');
  });

  it('should return neutral result for whitespace-only input', () => {
    const result = validateAndLookupIBAN('   ');

    expect(result.valid).toBe(false);
    expect(result.error).toBeNull();
    expect(result.electronic).toBe('');
  });

  it('should return neutral result for input shorter than 5 chars', () => {
    const result = validateAndLookupIBAN('DE89');

    expect(result.valid).toBe(false);
    expect(result.error).toBeNull();
  });

  it('should handle electronic format input (no spaces)', () => {
    const result = validateAndLookupIBAN('DE89370400440532013000');

    expect(result.valid).toBe(true);
    expect(result.electronic).toBe('DE89370400440532013000');
  });

  it('should handle lowercase input', () => {
    const result = validateAndLookupIBAN('de89370400440532013000');

    expect(result.valid).toBe(true);
    expect(result.electronic).toBe('DE89370400440532013000');
  });

  // Error cases
  it('should reject an IBAN with invalid checksum', () => {
    const result = validateAndLookupIBAN('DE00370400440532013000');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Ungueltige IBAN');
  });

  it('should reject a malformed IBAN', () => {
    const result = validateAndLookupIBAN('INVALIDIBAN12345');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Ungueltige IBAN');
  });
});

describe('formatIBAN', () => {
  it('should format electronic IBAN with spaces every 4 characters', () => {
    expect(formatIBAN('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
  });

  it('should normalize already-formatted input', () => {
    expect(formatIBAN('DE89 3704 0044 0532 0130 00')).toBe('DE89 3704 0044 0532 0130 00');
  });

  it('should uppercase the input', () => {
    expect(formatIBAN('de89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
  });
});
