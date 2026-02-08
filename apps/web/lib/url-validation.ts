/**
 * URL validation utilities to prevent open redirect attacks.
 *
 * Only allows relative URLs starting with a single slash.
 * Rejects external URLs, protocol-relative URLs, javascript: URIs, and data: URIs.
 */

/**
 * Check if a callback URL is safe to redirect to.
 *
 * Valid: /dashboard, /clubs/my-club/members
 * Invalid: //evil.com, javascript:alert(1), https://evil.com, \evil.com, data:text/html,...
 */
export function isValidCallbackUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  // Must start with exactly one forward slash (not //)
  if (!url.startsWith('/') || url.startsWith('//')) return false;

  // Reject backslash URLs (browsers may interpret \ as /)
  if (url.includes('\\')) return false;

  // Reject dangerous URI schemes
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return false;

  return true;
}

/**
 * Sanitize a callback URL, returning the fallback if the URL is invalid.
 */
export function sanitizeCallbackUrl(
  url: string | null | undefined,
  fallback = '/dashboard'
): string {
  return isValidCallbackUrl(url) ? url! : fallback;
}
