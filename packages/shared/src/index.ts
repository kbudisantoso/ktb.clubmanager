// @ktb/shared - Shared types, schemas, and utilities

export const VERSION = '0.0.1';

// Schemas (Zod is source of truth, types are inferred)
export * from './schemas/index.ts';

// Utilities
export * from './utils/slug.ts';
export * from './utils/invite-code.ts';
