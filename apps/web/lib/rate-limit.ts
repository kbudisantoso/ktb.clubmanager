/**
 * In-memory sliding window rate limiter for auth endpoints.
 * Tracks attempts per key (IP, email, or combined) with configurable window and max attempts.
 *
 * NOTE: This is a per-process limiter. In multi-process deployments,
 * use Redis-backed rate limiting instead.
 */
export class RateLimiter {
  private attempts = new Map<string, number[]>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number
  ) {}

  /**
   * Check if the key is rate limited. If not, record the attempt.
   * @returns true if the request should be BLOCKED
   */
  isRateLimited(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get and clean up old entries
    const timestamps = (this.attempts.get(key) || []).filter((t) => t > windowStart);
    this.attempts.set(key, timestamps);

    if (timestamps.length >= this.maxAttempts) {
      return true; // BLOCKED
    }

    timestamps.push(now);
    return false; // ALLOWED
  }

  /** Reset attempts for a key (e.g., after successful login) */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /** Periodic cleanup of expired entries (call on interval) */
  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.attempts.entries()) {
      const valid = timestamps.filter((t) => t > now - this.windowMs);
      if (valid.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, valid);
      }
    }
  }
}

// Pre-configured limiters for auth endpoints
const FIFTEEN_MIN = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/** Login: 5 attempts per 15 min per account */
export const loginAccountLimiter = new RateLimiter(5, FIFTEEN_MIN);
/** Login: 10 attempts per 15 min per IP */
export const loginIpLimiter = new RateLimiter(10, FIFTEEN_MIN);
/** Registration: 3 signups per hour per IP */
export const registrationIpLimiter = new RateLimiter(3, ONE_HOUR);
/** Password reset: 3 per hour per email */
export const resetEmailLimiter = new RateLimiter(3, ONE_HOUR);
/** Password reset: 5 per hour per IP */
export const resetIpLimiter = new RateLimiter(5, ONE_HOUR);

// Cleanup expired entries every 5 minutes
setInterval(
  () => {
    loginAccountLimiter.cleanup();
    loginIpLimiter.cleanup();
    registrationIpLimiter.cleanup();
    resetEmailLimiter.cleanup();
    resetIpLimiter.cleanup();
  },
  5 * 60 * 1000
).unref();
