# Database Schema Documentation

This document provides an overview of the ktb.clubmanager database schema. The schema is designed for multi-tenant club management with integrated double-entry bookkeeping.

## Entity Relationship Diagram

See [er-diagram.md](./er-diagram.md) for a visual representation of the data model.

## Models

The database schema is defined in [`prisma/schema.prisma`](../../prisma/schema.prisma) at the repository root. Each model includes comprehensive inline documentation using Prisma's triple-slash (`///`) comment syntax.

### Club

The tenant entity. Each club is completely isolated - all other entities belong to exactly one club.

### Member

Club members with contact information and membership details. Members are scoped to a single club via `clubId`.

### Account

Chart of accounts (Kontenrahmen) based on SKR42 for German non-profit organizations. Each account has a code, name, and type (asset, liability, income, expense).

## Enums

### MemberStatus

Tracks the lifecycle of club membership:

- `ACTIVE` - Currently active member
- `INACTIVE` - Temporarily inactive (e.g., sabbatical)
- `PENDING` - Application pending approval
- `LEFT` - Left the club (historical record)

### AccountType

Categories for the chart of accounts (SKR42):

- `ASSET` - Aktivkonten (Class 0-1)
- `LIABILITY` - Passivkonten (Class 2-3)
- `INCOME` - Ertragskonten (Class 4)
- `EXPENSE` - Aufwandskonten (Class 5-8)

## Conventions

### Soft Deletion

All domain entities use soft deletion (per CONV-006):

```prisma
deletedAt   DateTime?  // Timestamp when deleted (null if not deleted)
deletedBy   String?    // User ID who performed deletion
```

Soft deletion preserves data integrity for historical records and allows recovery.

### Tenant Isolation

All entities except `Club` have a `clubId` foreign key for tenant isolation:

```prisma
clubId  String
club    Club    @relation(fields: [clubId], references: [id])
```

This ensures data is completely isolated between clubs.

### Primary Keys

All entities use CUID (Collision-resistant Unique Identifier) format:

```prisma
id  String  @id @default(cuid())
```

CUIDs are URL-safe, sortable by creation time, and avoid sequential ID enumeration attacks.

### SKR42 Account Codes

The Account model uses SKR42 (Kontenrahmen 42) codes for German non-profit organizations:

- Unique within each club: `@@unique([clubId, code])`
- Example codes: "1200" (Bank), "4000" (Membership Fees Income)

## Future Models

This is the foundation schema. Additional models will be added in later phases:

- **Transaction** - Double-entry bookkeeping transactions
- **TransactionLine** - Debit/credit lines for each transaction
- **Fee** - Membership fee definitions and assignments
- **Household** - Grouping members with shared address/billing

## Prisma Commands

From the `apps/api` directory:

```bash
# Generate Prisma Client
pnpm db:generate

# Run migrations in development
pnpm db:migrate

# Open Prisma Studio (database browser)
pnpm db:studio
```

---

_Schema documentation for ktb.clubmanager_
_See prisma/schema.prisma for authoritative definitions_
