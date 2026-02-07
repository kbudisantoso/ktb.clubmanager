# 11. External Service Adapter Pattern

Date: 2026-01-26

## Status

Accepted

## Context

ktb.clubmanager integrates with multiple external services for authentication, storage, caching, and AI capabilities. These integrations create dependencies on specific providers:

- **Authentication:** OIDC providers (Google, Microsoft)
- **Object Storage:** MinIO (S3-compatible)
- **Cache/Queue:** Redis
- **Vector Search:** pgvector (PostgreSQL)
- **AI/LLM:** Multiple providers (Gemini, Mistral, OpenAI)

Direct coupling to provider-specific APIs would make the application difficult to:

1. Test (requires mocked external services)
2. Deploy in different environments (different providers per environment)
3. Migrate to alternative providers (vendor lock-in)
4. Maintain when providers change their APIs

The strategy document "OSS Core and Commercial SaaS Ideas" proposes a "Portable Core / Pluggable Edges" architecture where business logic never directly calls external services.

## Decision

We will implement an **adapter pattern** for all external service integrations:

### 1. Define Provider-Agnostic Interfaces

```typescript
// packages/shared/interfaces/storage.interface.ts
interface IStorageAdapter {
  upload(key: string, data: Buffer, metadata?: Record<string, string>): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

// packages/shared/interfaces/llm.interface.ts
interface ILLMAdapter {
  complete(prompt: string, options?: LLMOptions): Promise<string>;
  extractStructured<T>(prompt: string, schema: ZodSchema<T>): Promise<T>;
}

// packages/shared/interfaces/auth.interface.ts
interface IAuthAdapter {
  validateToken(token: string): Promise<AuthUser>;
  getUserInfo(accessToken: string): Promise<UserInfo>;
}
```

### 2. Implement Provider-Specific Adapters

```
apps/api/src/adapters/
├── storage/
│   ├── minio.adapter.ts      # MinIO/S3 implementation
│   └── local.adapter.ts      # Local filesystem for testing
├── llm/
│   ├── gemini.adapter.ts     # Vertex AI Gemini
│   ├── mistral.adapter.ts    # Mistral AI
│   └── openai.adapter.ts     # OpenAI (fallback)
└── auth/
    ├── google.adapter.ts     # Google OIDC
    └── microsoft.adapter.ts  # Microsoft OIDC
```

### 3. Inject via NestJS DI

```typescript
// Module configuration
@Module({
  providers: [
    {
      provide: 'IStorageAdapter',
      useClass: process.env.STORAGE_PROVIDER === 'local'
        ? LocalStorageAdapter
        : MinioStorageAdapter,
    },
  ],
})
```

### 4. Internal User ID Mapping

For authentication specifically, we store the OIDC `sub` claim mapped to an internal UUID:

```prisma
model User {
  id        String   @id @default(uuid())
  // ... other fields

  identities UserIdentity[]
}

model UserIdentity {
  id         String   @id @default(uuid())
  provider   String   // "google", "microsoft"
  sub        String   // OIDC subject claim
  userId     String
  user       User     @relation(fields: [userId], references: [id])

  @@unique([provider, sub])
}
```

This ensures:

- Domain logic only uses internal `User.id`, never provider-specific IDs
- Users can link multiple OIDC providers
- Provider migration doesn't break referential integrity

## Consequences

**Positive:**

- Business logic is testable with mock adapters
- Can swap providers without changing domain code
- Environment-specific configuration via DI
- Clearer separation of concerns
- Easier compliance (can use EU-only providers in production)

**Negative:**

- Additional abstraction layer (more interfaces to maintain)
- Some provider-specific features may not fit generic interface
- Initial overhead to define interfaces before implementation

**Neutral:**

- Adapters live in `apps/api/src/adapters/` directory
- Interfaces defined in `packages/shared/interfaces/`
- Testing can use lightweight in-memory implementations

## Implementation Notes

### When to Create Adapters

- **Always:** Authentication, storage, LLM/AI providers
- **Optional:** Cache (Redis is stable, abstraction may be premature)
- **Not needed:** Database (Prisma already provides abstraction)

### Provider Selection Priority

1. EU-native providers first (GDPR compliance)
2. Self-hostable options (MinIO, not AWS S3)
3. Standard protocols (OIDC, S3 API) for portability

## References

- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- ADR-0004: MinIO Object Storage
- Strategy document: `docs.archive.gitignore/oss-core-commercial-saas-ideas.md`
