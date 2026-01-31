// @ktb/shared - Shared types, schemas, and utilities

export const VERSION = '0.0.1';

// Schemas (Zod is source of truth, types are inferred)
export * from './schemas/member-status.js';

// Utilities
export * from './utils/slug.js';
export * from './utils/invite-code.js';
