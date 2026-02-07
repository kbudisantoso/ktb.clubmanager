# 7. Vitest Testing Framework

Date: 2026-01-20

## Status

Accepted

## Context

ktb.clubmanager needs a testing framework for:

- Unit tests (functions, utilities, services)
- Component tests (React components via Testing Library)
- Integration tests (API endpoints, database operations)

Requirements:

1. **TypeScript native:** No separate compilation step
2. **Fast execution:** Quick feedback during development
3. **Jest-compatible API:** Familiar `describe`, `it`, `expect`
4. **Monorepo support:** Run tests across multiple packages

We evaluated:

**Jest:**

- Industry standard
- Excellent ecosystem
- Requires configuration for TypeScript and ESM
- Slower than modern alternatives

**Vitest:**

- Vite-powered, extremely fast
- Native TypeScript and ESM support
- Jest-compatible API (drop-in replacement)
- Projects feature for monorepo orchestration
- Watch mode with HMR

## Decision

We will use Vitest as the testing framework.

Configuration uses Vitest's "projects" feature to orchestrate tests across workspace packages from a single root configuration.

## Consequences

**Positive:**

- Fast test execution via Vite's transform pipeline
- Native TypeScript support (no separate `ts-jest` config)
- Jest-compatible API: `describe`, `it`, `expect` work as expected
- Projects feature handles monorepo test orchestration
- Excellent watch mode with HMR
- Built-in code coverage via c8/v8

**Negative:**

- Newer ecosystem than Jest (fewer plugins, less documentation)
- Some Jest-specific features may not exist
- Teams familiar only with Jest need minor adjustment

**Neutral:**

- Uses `vitest.config.ts` instead of `jest.config.js`
- Same testing patterns (AAA, mocking, assertions)
- React Testing Library works identically
