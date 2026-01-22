# 3. PostgreSQL 17 with pgvector

Date: 2026-01-20

## Status

Accepted

## Context

ktb.clubmanager needs a database that:

1. **ACID compliance:** Accounting transactions require strong consistency guarantees
2. **Mature and reliable:** Club financial data cannot be at risk
3. **Rich data types:** Support for DECIMAL, JSONB, arrays
4. **Future AI capabilities:** Semantic search over documents, receipts, and member data

We evaluated:

**PostgreSQL:**
- Industry standard for transactional applications
- Excellent ACID compliance
- Rich extension ecosystem
- pgvector extension enables vector embeddings for AI/ML

**MySQL/MariaDB:**
- Good general-purpose database
- Less powerful extension ecosystem
- Vector support less mature

**SQLite:**
- Excellent for embedded use
- Not suitable for multi-user web application

For AI/semantic search, we plan to use vector embeddings to:
- Match bank transactions to members based on payment reference text
- Search documents by semantic meaning
- Auto-categorize receipts and expenses

## Decision

We will use PostgreSQL 17 (latest stable) with the pgvector extension.

PostgreSQL 17 provides the newest features and security updates. pgvector is installed but not actively used until AI features are implemented post-MVP.

## Consequences

**Positive:**
- ACID compliance ensures accounting integrity
- Native DECIMAL type for precise financial calculations
- pgvector enables future semantic search capabilities
- Strong ecosystem of tools (pgAdmin, pgweb, pg_dump)
- Well-understood by most developers
- Latest PostgreSQL version with newest features and fixes

**Negative:**
- pgvector extension requires management (installed in Docker image)
- Vector index maintenance has performance considerations
- More complex than SQLite for local development

**Neutral:**
- Standard PostgreSQL operational knowledge applies
- Backup and restore procedures well-documented
- pgvector unused until AI features are prioritized
