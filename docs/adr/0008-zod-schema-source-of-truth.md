# 8. Zod Schema as Source of Truth

Date: 2026-01-20

## Status

Accepted

## Context

ktb.clubmanager needs validation for:

- API request bodies (member creation, transaction posting)
- Form inputs (frontend validation)
- Configuration objects
- Data transfers between frontend and backend

Challenge: Avoid duplicating validation logic between TypeScript types and runtime validation.

We evaluated approaches:

**Separate TypeScript types + manual validation:**

- Types and validation can drift apart
- Duplication of field definitions
- No runtime type safety

**class-validator (decorators):**

- Common in NestJS
- Requires classes (not plain objects)
- Types and validation separate

**Zod (schema-first):**

- Define schema once, infer TypeScript type
- Runtime validation from same source
- Works with plain objects
- Excellent TypeScript integration

## Decision

We will use Zod schemas as the single source of truth.

TypeScript types are inferred via `z.infer<typeof schema>`. This ensures validation and types never drift apart.

```typescript
// Schema is source of truth
const MemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
});

// Type is derived, always matches schema
type Member = z.infer<typeof MemberSchema>;
```

## Consequences

**Positive:**

- Single source of truth: schema defines both type and validation
- Runtime validation from compile-time type definitions
- Excellent error messages for invalid data
- Composable: schemas can extend other schemas
- Works on frontend and backend (shared package)
- No class requirement (works with plain objects)

**Negative:**

- Learning curve for Zod API
- Schemas can become verbose for complex types
- Different syntax than TypeScript type definitions

**Neutral:**

- Schemas live in `packages/shared` for cross-package use
- Must import schema and call `.parse()` or `.safeParse()` for validation
- Error formatting may need customization for user-facing messages
