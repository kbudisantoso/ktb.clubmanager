import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = new RateLimiter(3, 60_000);
    expect(limiter.isRateLimited('key1')).toBe(false);
    expect(limiter.isRateLimited('key1')).toBe(false);
    expect(limiter.isRateLimited('key1')).toBe(false);
  });

  it('blocks requests over the limit', () => {
    const limiter = new RateLimiter(2, 60_000);
    expect(limiter.isRateLimited('key1')).toBe(false);
    expect(limiter.isRateLimited('key1')).toBe(false);
    expect(limiter.isRateLimited('key1')).toBe(true);
  });

  it('tracks keys independently', () => {
    const limiter = new RateLimiter(1, 60_000);
    expect(limiter.isRateLimited('a')).toBe(false);
    expect(limiter.isRateLimited('a')).toBe(true);
    expect(limiter.isRateLimited('b')).toBe(false);
  });

  it('allows requests again after window expires', () => {
    const limiter = new RateLimiter(1, 60_000);
    expect(limiter.isRateLimited('key1')).toBe(false);
    expect(limiter.isRateLimited('key1')).toBe(true);

    vi.advanceTimersByTime(60_001);

    expect(limiter.isRateLimited('key1')).toBe(false);
  });

  it('reset() clears attempts for a key', () => {
    const limiter = new RateLimiter(1, 60_000);
    expect(limiter.isRateLimited('key1')).toBe(false);
    expect(limiter.isRateLimited('key1')).toBe(true);

    limiter.reset('key1');
    expect(limiter.isRateLimited('key1')).toBe(false);
  });

  it('cleanup() removes expired entries', () => {
    const limiter = new RateLimiter(1, 60_000);
    limiter.isRateLimited('key1');

    vi.advanceTimersByTime(60_001);
    limiter.cleanup();

    // After cleanup + window expiry, key should be fully removed
    // and a new attempt should be allowed
    expect(limiter.isRateLimited('key1')).toBe(false);
  });

  it('cleanup() retains valid entries within window', () => {
    const limiter = new RateLimiter(1, 60_000);
    limiter.isRateLimited('key1');

    vi.advanceTimersByTime(30_000); // Half the window
    limiter.cleanup();

    expect(limiter.isRateLimited('key1')).toBe(true); // Still blocked
  });
});
