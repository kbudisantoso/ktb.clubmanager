# 2. Use Prisma ORM

Date: 2026-01-20

## Status

Accepted

## Context

ktb.clubmanager requires an ORM for database operations, with specific requirements:

1. **Decimal type support:** Financial calculations (membership fees, account balances, transactions) require precise decimal arithmetic, not floating-point
2. **Type safety:** Database queries should be type-checked at compile time
3. **Migration tooling:** Database schema changes need version control and reproducible migrations
4. **PostgreSQL compatibility:** Works with our chosen database

We evaluated several ORMs:

**TypeORM:**

- Widely used in NestJS projects
- Uses decorators for schema definition
- Decimal support exists but can be error-prone
- Migration tooling works but can be complex

**MikroORM:**

- Modern, well-designed ORM
- Good TypeScript support
- Smaller community than alternatives

**Prisma:**

- Schema-first approach with `schema.prisma` file
- Native Decimal type maps directly to PostgreSQL DECIMAL
- Excellent TypeScript code generation
- Clean, intuitive query API
- Built-in migration system with version control
- Strong documentation and community

## Decision

We will use Prisma ORM for database access.

The schema.prisma file becomes the single source of truth for database structure, and Prisma Client provides fully-typed database access.

## Consequences

**Positive:**

- Native Decimal type with proper precision for financial calculations
- Compile-time type safety for all database queries
- Schema-first approach provides clear documentation
- Migrations are version-controlled and reproducible
- Prisma Studio provides convenient data browsing during development
- Excellent TypeScript integration with inferred types

**Negative:**

- Learning curve for developers used to raw SQL
- Some complex queries may require raw SQL fallback (`$queryRaw`)
- Generated client adds to `node_modules` size
- Schema changes require `prisma generate` step

**Neutral:**

- Different mental model than traditional ORMs (schema-first vs code-first)
- Must run `prisma db push` or `prisma migrate` after schema changes
