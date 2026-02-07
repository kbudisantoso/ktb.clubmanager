# 6. ESLint Flat Config

Date: 2026-01-20

## Status

Accepted

## Context

ktb.clubmanager needs linting configuration for TypeScript code quality. ESLint has two configuration formats:

**Legacy format (.eslintrc.js/.json/.yaml):**

- Widely documented
- Uses `extends` and cascading configuration
- Being deprecated in favor of flat config
- Some ESM compatibility issues

**Flat config (eslint.config.js):**

- New default in ESLint 9+
- Native ESM support
- Explicit configuration (no hidden extends)
- Cleaner, more predictable behavior

## Decision

We will use ESLint flat config (`eslint.config.js`) instead of legacy `.eslintrc` format.

The configuration lives at the repository root and applies to all workspace packages.

## Consequences

**Positive:**

- Modern ESM-compatible configuration
- No hidden configuration from `extends` chains
- Cleaner, more explicit configuration
- Future-proof as ESLint moves away from legacy format
- Single config file at repo root (not per-package)

**Negative:**

- Some ESLint plugins may not yet support flat config
- Less documentation and Stack Overflow answers (newer format)
- Different mental model from legacy config

**Neutral:**

- Must use `eslint.config.js` (not `.eslintrc`)
- TypeScript-ESLint and other core plugins support flat config
- Can incrementally adopt stricter rules over time
