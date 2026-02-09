import { describe, it, expect } from 'vitest';
import { isValidCallbackUrl, sanitizeCallbackUrl } from './url-validation';

describe('url-validation', () => {
  describe('isValidCallbackUrl', () => {
    it.each(['/dashboard', '/clubs/my-club/members', '/settings?tab=profile', '/', '/a'])(
      'accepts valid relative URL: %s',
      (url) => {
        expect(isValidCallbackUrl(url)).toBe(true);
      }
    );

    it.each([null, undefined, ''])('rejects nullish/empty: %s', (url) => {
      expect(isValidCallbackUrl(url)).toBe(false);
    });

    it.each(['//evil.com', '//evil.com/path'])('rejects protocol-relative URL: %s', (url) => {
      expect(isValidCallbackUrl(url)).toBe(false);
    });

    it.each(['\\evil.com', '/path\\evil', '/clubs\\test'])('rejects backslash URLs: %s', (url) => {
      expect(isValidCallbackUrl(url)).toBe(false);
    });

    it.each(['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'JavaScript:void(0)'])(
      'rejects javascript: scheme: %s',
      (url) => {
        expect(isValidCallbackUrl(url)).toBe(false);
      }
    );

    it.each(['data:text/html,<script>alert(1)</script>', 'DATA:text/html,foo'])(
      'rejects data: scheme: %s',
      (url) => {
        expect(isValidCallbackUrl(url)).toBe(false);
      }
    );

    it.each(['https://evil.com', 'http://evil.com', 'ftp://evil.com', 'evil.com'])(
      'rejects absolute/non-slash URLs: %s',
      (url) => {
        expect(isValidCallbackUrl(url)).toBe(false);
      }
    );
  });

  describe('sanitizeCallbackUrl', () => {
    it('returns valid URL unchanged', () => {
      expect(sanitizeCallbackUrl('/clubs/test')).toBe('/clubs/test');
    });

    it('returns /dashboard fallback for invalid URL', () => {
      expect(sanitizeCallbackUrl('//evil.com')).toBe('/dashboard');
    });

    it('returns /dashboard fallback for null', () => {
      expect(sanitizeCallbackUrl(null)).toBe('/dashboard');
    });

    it('uses custom fallback', () => {
      expect(sanitizeCallbackUrl(null, '/')).toBe('/');
    });
  });
});
