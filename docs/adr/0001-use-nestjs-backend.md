# 1. Use NestJS Backend

Date: 2026-01-20

## Status

Accepted

## Context

ktb.clubmanager needs a backend framework for club management with integrated double-entry bookkeeping. The system handles financial data including membership fees, transactions, and bank imports, where accuracy and type safety are critical.

We evaluated three options:

**Laravel + Filament (PHP):**

- Pros: Rapid admin UI development (2-4 weeks faster), mature ecosystem, excellent documentation
- Cons: No type sharing with TypeScript frontend, PHP/JS context switching, weaker compile-time safety for financial calculations

**FastAPI (Python):**

- Pros: Modern async Python, good type hints, excellent for data science
- Cons: No type sharing with frontend, Decimal handling requires care, smaller ecosystem for full-stack web apps

**NestJS (TypeScript):**

- Pros: End-to-end TypeScript (frontend + backend share types), Prisma ORM with native Decimal type, compile-time type safety, modular architecture
- Cons: Slower admin UI development than Laravel/Filament

For financial software handling accounting data, type safety is more important than development speed. A bug in fee calculations or bank reconciliation could cause real problems for clubs.

## Decision

We will use NestJS with TypeScript as the backend framework.

We accept the trade-off that building admin UIs will take longer compared to Laravel + Filament, but gain compile-time safety for financial calculations and full-stack type sharing.

## Consequences

**Positive:**

- End-to-end TypeScript: frontend and backend share types via `packages/shared`
- Prisma ORM with native Decimal type for currency calculations
- Compile-time type checking catches errors before runtime
- Modular architecture scales well as features grow
- Strong NestJS ecosystem (auth, validation, documentation)

**Negative:**

- Admin dashboard requires manual implementation (no Filament equivalent)
- Development velocity slower for CRUD operations compared to Laravel
- Learning curve for developers unfamiliar with NestJS decorators

**Neutral:**

- Need to build custom components that Laravel/Filament provides out-of-box
- Team must maintain TypeScript discipline for benefits to materialize
