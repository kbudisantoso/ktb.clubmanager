# 10. Row-Level Tenant Isolation

Date: 2026-01-22

## Status

Accepted

## Context

ktb.clubmanager is a multi-tenant application where each club (Verein) represents a tenant. Financial and membership data must be isolated between clubs to ensure data privacy and comply with BDSG/DSGVO requirements.

Three approaches were evaluated:

### Option 1: Row-Level Isolation (via Foreign Key)

Single database schema with a `clubId` foreign key on all tenant-scoped tables.

| Pros | Cons |
|------|------|
| Simple queries with WHERE clause | Risk of data leak if WHERE forgotten |
| Single migration path | Shared indexes affect all tenants |
| Efficient connection pooling | No physical data separation |
| Cross-tenant reporting possible | |
| Excellent Prisma support | |

### Option 2: Schema-per-Tenant

Separate PostgreSQL schemas per club within the same database.

| Pros | Cons |
|------|------|
| Physical separation | Complex migrations (N schemas) |
| Per-tenant backup/restore | Limited Prisma support |
| Customizable per tenant | Connection pool per schema |
| | No built-in cross-tenant queries |

### Option 3: Database-per-Tenant

Completely isolated database instances per club.

| Pros | Cons |
|------|------|
| Maximum isolation | High operational overhead |
| Independent scaling | One connection pool per DB |
| Easy tenant data export | No cross-tenant queries |
| Compliance-friendly | Cost increases linearly with tenants |

### Evaluation for Club Management

German Vereine typically have 10-5,000 members. Data volumes are manageable in single tables. Consultants often manage multiple clubs and need cross-club reporting. The regulatory environment (BDSG/DSGVO) does not require physical separation for this use case.

## Decision

We will use **row-level tenant isolation** with `clubId` foreign keys on all tenant-scoped entities.

This approach provides the right balance of simplicity, performance, and security for a club management application. The data leak risk will be mitigated through mandatory technical controls.

## Risk Mitigation Requirements

The following measures MUST be implemented to prevent accidental data leakage:

### 1. Prisma Middleware for Automatic Tenant Filtering

**Priority:** High (Phase 5 or earlier)

```typescript
// Example: Prisma middleware that auto-injects clubId
prisma.$use(async (params, next) => {
  if (tenantScopedModels.includes(params.model)) {
    params.args.where = {
      ...params.args.where,
      clubId: getCurrentClubId(),
    };
  }
  return next(params);
});
```

This ensures every query automatically includes the tenant filter, eliminating the risk of forgotten WHERE clauses.

### 2. PostgreSQL Row-Level Security (RLS)

**Priority:** Medium (before production)

```sql
-- Enable RLS on tenant tables
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;

-- Policy that filters by clubId from session variable
CREATE POLICY tenant_isolation ON "Member"
  USING (club_id = current_setting('app.current_club_id')::text);
```

RLS provides a database-level safety net even if application code has bugs.

### 3. Audit Logging

**Priority:** Medium (before production)

All tenant data access must be logged with:
- User ID performing the action
- Club ID being accessed
- Timestamp
- Operation type (read/write/delete)

### 4. Integration Tests for Tenant Isolation

**Priority:** High (with Prisma middleware)

Every repository/service must have tests verifying:
- Cannot read other tenant's data
- Cannot write to other tenant's data
- Middleware correctly injects clubId

## Consequences

**Positive:**

- Simple data model and queries
- Single migration path for all tenants
- Cross-club reporting for consultants/admins
- Efficient PostgreSQL connection pooling
- Works seamlessly with Prisma 7

**Negative:**

- Requires discipline in query patterns (mitigated by middleware)
- All tenant data in same tables (mitigated by RLS)
- Shared indexes may affect performance at scale

**Neutral:**

- Every tenant-scoped entity needs `clubId` field
- Cannot easily extract single tenant's data (must filter by clubId)

## When to Reconsider

- If a club contractually requires physical data separation
- If regulatory requirements change to mandate isolation
- If tenant count exceeds 10,000 with performance issues
- If a tenant requires independent scaling

## References

- [Prisma Multi-Tenancy Guide](https://www.prisma.io/docs/guides/other/multi-tenancy)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- CONV-006 in CLAUDE.md (soft deletion pattern uses same approach)
