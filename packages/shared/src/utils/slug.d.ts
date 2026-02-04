/**
 * Reserved slugs that cannot be used for clubs.
 * Includes system paths, common routes, and static paths.
 */
export declare const RESERVED_SLUGS: readonly ["admin", "api", "auth", "login", "register", "logout", "signup", "signin", "join", "invite", "settings", "profile", "help", "support", "clubs", "dashboard", "users", "members", "system", "notifications", "static", "assets", "public", "_next", "favicon", "robots", "sitemap", "health", "status", "metrics", "docs", "swagger", "impressum", "datenschutz", "nutzungsbedingungen", "agb", "privacy", "terms", "test", "demo", "example", "sample", "www", "mail", "email"];
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
export declare function generateSlug(name: string): string;
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
export declare function isSlugValid(slug: string): boolean;
/**
 * Checks if a slug is reserved (system paths, common routes).
 *
 * @param slug - Slug to check
 * @returns true if reserved
 */
export declare function isSlugReserved(slug: string): boolean;
/**
 * Validates slug is both valid format and not reserved.
 *
 * @param slug - Slug to validate
 * @returns { valid: boolean, reason?: string }
 */
export declare function validateSlug(slug: string): {
    valid: boolean;
    reason?: string;
};
//# sourceMappingURL=slug.d.ts.map