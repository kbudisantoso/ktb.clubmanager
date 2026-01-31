import slugify from '@sindresorhus/slugify';

/**
 * Reserved slugs that cannot be used for clubs.
 * Includes system paths, common routes, and static paths.
 */
export const RESERVED_SLUGS = [
  // System routes
  'admin',
  'api',
  'auth',
  'login',
  'register',
  'logout',
  'signup',
  'signin',
  // App routes
  'join',
  'invite',
  'settings',
  'profile',
  'help',
  'support',
  'clubs',
  'dashboard',
  'users',
  'members',
  'system',
  'notifications',
  // Static/technical
  'static',
  'assets',
  'public',
  '_next',
  'favicon',
  'robots',
  'sitemap',
  'health',
  'status',
  'metrics',
  'docs',
  'swagger',
  // Legal
  'impressum',
  'datenschutz',
  'nutzungsbedingungen',
  'agb',
  'privacy',
  'terms',
  // Common words that shouldn't be club names
  'test',
  'demo',
  'example',
  'sample',
  'www',
  'mail',
  'email',
] as const;

/**
 * Generates a URL-safe slug from a club name.
 * Handles German umlauts with proper transliteration (ae, oe, ue, ss).
 *
 * @param name - Club name to convert to slug
 * @returns URL-safe slug
 *
 * @example
 * generateSlug('Munchener Sportverein') // 'muenchener-sportverein'
 * generateSlug('TSV Grun-Weiss 1908')    // 'tsv-gruen-weiss-1908'
 */
export function generateSlug(name: string): string {
  return slugify(name, {
    lowercase: true,
    separator: '-',
    // Custom replacements for German characters
    customReplacements: [
      ['ae', 'ae'],
      ['oe', 'oe'],
      ['ue', 'ue'],
    ],
  });
}

/**
 * Validates that a slug meets format requirements.
 *
 * Rules:
 * - 3-50 characters
 * - Lowercase letters, numbers, and hyphens only
 * - Cannot start or end with hyphen
 * - No consecutive hyphens
 *
 * @param slug - Slug to validate
 * @returns true if valid
 */
export function isSlugValid(slug: string): boolean {
  // Must be 3-50 characters
  if (slug.length < 3 || slug.length > 50) {
    return false;
  }

  // Pattern: starts/ends with alphanumeric, no consecutive hyphens
  const pattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/;
  if (!pattern.test(slug)) {
    return false;
  }

  // No consecutive hyphens
  if (slug.includes('--')) {
    return false;
  }

  return true;
}

/**
 * Checks if a slug is reserved (system paths, common routes).
 *
 * @param slug - Slug to check
 * @returns true if reserved
 */
export function isSlugReserved(slug: string): boolean {
  return RESERVED_SLUGS.includes(
    slug.toLowerCase() as (typeof RESERVED_SLUGS)[number],
  );
}

/**
 * Validates slug is both valid format and not reserved.
 *
 * @param slug - Slug to validate
 * @returns { valid: boolean, reason?: string }
 */
export function validateSlug(slug: string): { valid: boolean; reason?: string } {
  if (!isSlugValid(slug)) {
    return {
      valid: false,
      reason: 'Slug must be 3-50 lowercase letters, numbers, and hyphens',
    };
  }

  if (isSlugReserved(slug)) {
    return {
      valid: false,
      reason: 'This slug is reserved',
    };
  }

  return { valid: true };
}
