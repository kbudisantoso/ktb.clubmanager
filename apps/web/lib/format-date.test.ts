import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatDate, formatDateTime, calculateDuration, getTodayISO } from './format-date';

describe('formatDate', () => {
  it('formats YYYY-MM-DD to DD.MM.YYYY', () => {
    expect(formatDate('2025-01-15')).toBe('15.01.2025');
  });

  it('formats ISO datetime string (strips time)', () => {
    expect(formatDate('2025-06-01T14:30:00.000Z')).toBe('01.06.2025');
  });

  it('returns input for malformed date', () => {
    expect(formatDate('invalid')).toBe('invalid');
  });

  it('handles single-digit months and days', () => {
    expect(formatDate('2025-03-05')).toBe('05.03.2025');
  });
});

describe('formatDateTime', () => {
  it('formats ISO datetime to DD.MM.YYYY HH:mm', () => {
    expect(formatDateTime('2025-01-15T14:30:00.000Z')).toBe('15.01.2025 14:30');
  });

  it('falls back to date-only for date strings without time', () => {
    expect(formatDateTime('2025-01-15')).toBe('15.01.2025');
  });

  it('handles malformed time part gracefully', () => {
    expect(formatDateTime('2025-01-15Tinvalid')).toBe('15.01.2025');
  });
});

describe('calculateDuration', () => {
  it('returns null for null joinDate', () => {
    expect(calculateDuration(null, null)).toBeNull();
  });

  it('calculates years and months', () => {
    expect(calculateDuration('2023-01-15', '2025-06-15')).toBe('2 Jahre, 5 Monate');
  });

  it('calculates single year', () => {
    expect(calculateDuration('2024-01-01', '2025-01-01')).toBe('1 Jahr');
  });

  it('calculates single month', () => {
    expect(calculateDuration('2025-01-01', '2025-02-01')).toBe('1 Monat');
  });

  it('calculates days when less than a month', () => {
    expect(calculateDuration('2025-01-01', '2025-01-16')).toBe('15 Tage');
  });

  it('calculates single day', () => {
    expect(calculateDuration('2025-01-01', '2025-01-02')).toBe('1 Tag');
  });

  it('uses today when leaveDate is null (open period)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-07-15T00:00:00'));

    expect(calculateDuration('2025-01-15', null)).toBe('6 Monate');

    vi.useRealTimers();
  });

  it('handles year boundary correctly', () => {
    expect(calculateDuration('2024-11-01', '2025-02-01')).toBe('3 Monate');
  });
});

describe('getTodayISO', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns today as YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:30:00'));

    expect(getTodayISO()).toBe('2025-06-15');
  });

  it('pads single-digit month and day with zeros', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-05T10:30:00'));

    expect(getTodayISO()).toBe('2025-03-05');
  });
});
