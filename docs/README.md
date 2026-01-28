# ktb.clubmanager Documentation

This is the documentation hub for ktb.clubmanager, an open-source club management software with integrated double-entry bookkeeping for German Vereine.

## Contents

### Architecture Decision Records

Architecture Decision Records (ADRs) document the key technical decisions made in this project and the rationale behind them. We use the [Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) with sections for Status, Context, Decision, and Consequences.

**Browse ADRs:** [docs/adr/](adr/)

| ADR | Title | Status |
|-----|-------|--------|
| [0001](adr/0001-use-nestjs-backend.md) | Use NestJS Backend | Accepted |
| [0002](adr/0002-use-prisma-orm.md) | Use Prisma ORM | Accepted |
| [0003](adr/0003-postgresql-17-with-pgvector.md) | PostgreSQL 17 with pgvector | Accepted |
| [0004](adr/0004-minio-object-storage.md) | MinIO Object Storage | Accepted |
| [0005](adr/0005-pnpm-workspaces-monorepo.md) | pnpm Workspaces Monorepo | Accepted |
| [0006](adr/0006-eslint-flat-config.md) | ESLint Flat Config | Accepted |
| [0007](adr/0007-vitest-testing-framework.md) | Vitest Testing Framework | Accepted |
| [0008](adr/0008-zod-schema-source-of-truth.md) | Zod Schema as Source of Truth | Accepted |
| [0009](adr/0009-upgrade-to-prisma-7.md) | Upgrade to Prisma 7 | Accepted |
| [0010](adr/0010-row-level-tenant-isolation.md) | Row-Level Tenant Isolation | Accepted |

### API Documentation

API documentation is available via Swagger UI at `/api/docs` when running the development server.

- **Development:** Start with `pnpm dev`, then visit `http://localhost:3001/api/docs` (or your configured API port)
- **OpenAPI spec:** Available at `/api/docs-json` for client code generation

> **Note:** The API runs on port 3001 by default, or `PORT+1` if you set a custom `PORT`. See [Port Configuration](../README.md#port-configuration) in the main README.

### Schema Documentation

Database schema documentation lives alongside the Prisma schema:

- **Prisma schema:** [`prisma/schema.prisma`](../prisma/schema.prisma) contains model definitions with inline documentation
- **Schema overview:** [`docs/schema/README.md`](schema/README.md) explains conventions and data model
- **ER diagram:** [`docs/schema/er-diagram.md`](schema/er-diagram.md) visual entity-relationship diagram

## Quick Links

- [Main README](../README.md) - Project overview and quick start
- [CONTRIBUTING.md](../CONTRIBUTING.md) - How to contribute
- [CLAUDE.md](../CLAUDE.md) - Development conventions and guidelines

---

*Documentation structure established 2026-01-22*
