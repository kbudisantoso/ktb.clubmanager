# 9. Upgrade to Prisma 7

Date: 2026-01-22

## Status

Accepted

## Context

During Phase 4 (Architecture Documentation), the initial Prisma setup used version 6.x because Prisma 7.x had just been released (November 19, 2025) and required a new configuration approach.

Now evaluating whether to stay on Prisma 6.x or upgrade to 7.x.

**Prisma 7 changes:**

1. New `prisma-client` provider (replaces `prisma-client-js`)
2. Requires `prisma.config.ts` configuration file
3. Requires adapter or accelerateUrl when creating PrismaClient
4. ESM module format (default)
5. ~90% smaller bundle sizes
6. Up to 3x faster queries
7. Node.js 20.19+ minimum

**Current state:**

- Project is in Milestone 0 (pre-MVP), no production users
- Schema has only 3 models (Club, Member, Account)
- No application code using Prisma yet
- PostgreSQL is fully supported in Prisma 7

**Trade-offs:**

| Factor               | Upgrade Now        | Upgrade Later                  |
| -------------------- | ------------------ | ------------------------------ |
| Migration effort     | ~30 min (3 models) | Hours (full schema + services) |
| Technical debt       | Avoided            | Accumulated                    |
| Performance benefits | Immediate          | Delayed                        |
| Risk                 | Low (minimal code) | Medium (production code)       |

## Decision

We will upgrade to Prisma 7 immediately.

The project is at the optimal point for this migration: minimal schema, zero application code using Prisma, and no production considerations. The cost of upgrading now is trivial compared to upgrading later when the full domain model and services exist.

## Consequences

**Positive:**

- 90% smaller bundle sizes benefit the NestJS API
- Up to 3x faster queries improve application performance
- ESM-first aligns with our modern stack (Next.js, NestJS)
- No technical debt from deferred migration
- Every future line of code benefits from v7 patterns

**Negative:**

- Requires `prisma.config.ts` file (minor complexity)
- Some documentation still references v6 patterns
- 2-month-old release (less battle-tested than v6)

**Neutral:**

- New mental model for PrismaClient instantiation (adapter pattern)
- Different generated client output path configuration
