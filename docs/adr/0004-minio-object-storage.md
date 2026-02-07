# 4. MinIO Object Storage

Date: 2026-01-20

## Status

Accepted

## Context

ktb.clubmanager needs to store files including:

- Member profile photos
- Receipt and invoice images
- Document attachments (PDF contracts, membership forms)
- Exported reports

Requirements:

1. **S3-compatible API:** Industry standard for object storage
2. **Self-hosted option:** Data sovereignty for German clubs
3. **Development parity:** Same API locally and in production
4. **Future cloud migration:** Easy path to AWS S3 or compatible services

We evaluated:

**Local filesystem:**

- Simple to implement
- No S3 API compatibility
- Harder to scale or migrate to cloud

**AWS S3:**

- Industry standard
- Not self-hostable
- Costs at scale

**MinIO:**

- S3-compatible API
- Self-hosted, open source
- Can run locally for development
- Easy migration path to cloud S3

## Decision

We will use MinIO for object storage.

MinIO provides an S3-compatible API that works identically in development (Docker) and can be replaced with AWS S3 or any S3-compatible service in production.

## Consequences

**Positive:**

- S3-compatible API: code works with AWS S3, Cloudflare R2, etc.
- Self-hosted: clubs maintain data sovereignty
- Development/production parity: same API locally and deployed
- Open source with strong community
- Built-in console UI for browsing files

**Negative:**

- Additional service to run in Docker Compose
- Requires configuration for buckets and access policies
- Operational overhead for self-hosted production deployments

**Neutral:**

- Learning curve for S3 SDK/API if unfamiliar
- Must configure proper access controls for public/private buckets
- Backup strategy needed for production data
