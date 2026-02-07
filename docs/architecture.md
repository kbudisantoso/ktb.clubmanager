# System Architecture

This document describes the ktb.clubmanager system architecture for developers and operators.

## Overview

ktb.clubmanager uses a **Backend-for-Frontend (BFF)** pattern with two main services:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Browser                                     │
│                    (http://localhost:3000 / your-domain.com)            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     apps/web (Next.js - Port 3000)                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Request Router                                │    │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │    │
│  │  │ /api/auth/*     │    │ /api/users/me   │    │ /api/*      │  │    │
│  │  │ → Better Auth   │    │ → Next.js Route │    │ → Proxy to  │  │    │
│  │  │ (local handler) │    │ (local handler) │    │   NestJS    │  │    │
│  │  └─────────────────┘    └─────────────────┘    └──────┬──────┘  │    │
│  └───────────────────────────────────────────────────────┼─────────┘    │
│                                                          │              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Frontend Pages                                │    │
│  │  app/(auth)/* - Login, Register                                 │    │
│  │  app/(main)/* - Dashboard, Settings                             │    │
│  │  app/clubs/*  - Club-specific pages                             │    │
│  │  app/admin/*  - Admin panel                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                          (fallback rewrite)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     apps/api (NestJS - Port 3001)                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    API Modules                                   │    │
│  │  /api/clubs/*     → ClubsModule (CRUD, members, access)         │    │
│  │  /api/admin/*     → AdminModule (tiers, system settings)        │    │
│  │  /api/health      → HealthModule (public health check)          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Auth (Session Validation)                     │    │
│  │  SessionAuthGuard reads better-auth.session_token cookie        │    │
│  │  Validates against shared database session table                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL + Redis                                   │
│  Shared database: users, sessions, clubs, members, transactions, etc.  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Folder Structure

| Path                      | Responsibility                                           |
| ------------------------- | -------------------------------------------------------- |
| `apps/web/`               | Next.js frontend + BFF layer                             |
| `apps/web/app/api/auth/`  | Better Auth routes (login, register, session, OAuth)     |
| `apps/web/app/api/users/` | User-related Next.js API routes                          |
| `apps/web/app/(auth)/`    | Public auth pages (login, register)                      |
| `apps/web/app/(main)/`    | Authenticated pages with shared layout                   |
| `apps/web/app/clubs/`     | Club-scoped pages                                        |
| `apps/web/app/admin/`     | Super-admin panel                                        |
| `apps/web/lib/`           | Client utilities (api.ts, auth-client.ts, club-store.ts) |
| `apps/api/`               | NestJS backend API                                       |
| `apps/api/src/auth/`      | Auth guards and decorators (not auth flow)               |
| `apps/api/src/clubs/`     | Club business logic                                      |
| `apps/api/src/admin/`     | Admin business logic                                     |
| `apps/api/src/health/`    | Health check endpoint                                    |
| `packages/shared/`        | Shared TypeScript types and Zod schemas                  |
| `prisma/`                 | Database schema and migrations                           |

## Request Flow

### Authentication (Login)

```
1. Browser → POST /api/auth/sign-in/email
2. Next.js API route handles request (apps/web/app/api/auth/[...all]/route.ts)
3. Better Auth validates credentials, creates session in database
4. Response with Set-Cookie: better-auth.session_token=<token>
5. Browser stores cookie (same-origin, SameSite=Lax)
```

### Authenticated API Request

```
1. Browser → GET /api/clubs/my (with cookie)
2. Next.js checks for local API route → not found
3. Fallback rewrite proxies to http://localhost:3001/api/clubs/my
4. Cookie forwarded in proxy request
5. NestJS cookie-parser extracts cookies
6. SessionAuthGuard reads better-auth.session_token
7. Guard validates token against database session table
8. ClubsController handles request, returns data
9. Response proxied back through Next.js to browser
```

### Public Endpoints

Routes decorated with `@Public()` bypass `SessionAuthGuard`:

- `GET /api/health` - Health check
- `GET /api/clubs/check-slug` - Slug availability check

## Configuration

### Environment Variables

**apps/web/.env.local:**

```bash
# Internal API URL for server-side proxy (not exposed to browser)
API_URL=http://localhost:3001

# Only set if you need direct API access (bypasses proxy)
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

**apps/api/.env.local:**

```bash
# Database
DATABASE_URL=postgresql://...

# CORS origins (for direct API access, optional)
CORS_ORIGINS=http://localhost:3000,http://localhost:33000
```

### Why Proxy Instead of Direct API Calls?

1. **Same-Origin Cookies**: Session cookies with `SameSite=Lax` work without HTTPS
2. **No CORS Complexity**: All requests appear same-origin to the browser
3. **Single Entry Point**: One domain simplifies DNS, certificates, load balancing
4. **Environment Parity**: Same architecture in dev and production

### Production Deployment

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Load Balancer │────▶│   Next.js Pod   │────▶│   NestJS Pod    │
│  (HTTPS term.)  │     │  (port 3000)    │     │  (port 3001)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       └───────────────────────┘
        │                              ▼
        │                       ┌─────────────────┐
        └──────────────────────▶│   PostgreSQL    │
                                └─────────────────┘
```

In Kubernetes/Docker Compose:

- `API_URL=http://api-service:3001` (internal service DNS)
- Browser only knows about the Next.js domain

## Server State Management

We use **TanStack Query** for all server state (data from APIs). See [ADR-0015](adr/0015-tanstack-query-server-state.md) for details.

### Architecture

```
Component → useQuery() ─┐
Component → useQuery() ─┼→ QueryClient → apiFetch() → API (single request)
Component → useQuery() ─┘              ↓
                                   Cache (shared)
```

### Key Files

| File                             | Purpose                            |
| -------------------------------- | ---------------------------------- |
| `apps/web/app/providers.tsx`     | QueryClientProvider setup          |
| `apps/web/hooks/use-clubs.ts`    | Club-related queries and mutations |
| `apps/web/hooks/use-debounce.ts` | Debounce hook for search inputs    |

### Query Key Convention

```typescript
['clubs', 'my'][('clubs', 'detail', slug)][('clubs', 'check-slug', slug)]; // User's clubs // Single club // Slug availability
```

### Usage Pattern

```tsx
// Read data
const { data: clubs, isLoading } = useMyClubsQuery();

// Mutate data (auto-invalidates cache)
const createClub = useCreateClubMutation();
await createClub.mutateAsync({ name: 'My Club', visibility: 'PRIVATE' });
```

## Key Design Decisions

| Decision                          | Rationale                                                    |
| --------------------------------- | ------------------------------------------------------------ |
| Better Auth in Next.js            | Native integration with App Router, handles OAuth flows      |
| Session validation in NestJS      | Shared database allows NestJS to validate sessions directly  |
| Fallback rewrites                 | Next.js API routes checked first, then proxy to NestJS       |
| cookie-parser in NestJS           | Required to read session cookie from proxied requests        |
| No NEXT_PUBLIC_API_URL by default | Proxy approach doesn't need it, keeps architecture simple    |
| TanStack Query for server state   | Automatic request deduplication, caching, background refetch |
| Zustand for UI state only         | activeClub selection, modals - not server data               |
| Debounced queries                 | Prevent rate limiting on search/typeahead inputs             |

## Related ADRs

- [ADR-0001: Use NestJS Backend](adr/0001-use-nestjs-backend.md)
- [ADR-0013: User-Club-Member Model](adr/0013-user-club-member-model.md)
- [ADR-0015: TanStack Query for Server State](adr/0015-tanstack-query-server-state.md)

## Health Check

The health endpoint is available at:

- Via proxy: `GET /api/health` (through Next.js)
- Direct: `GET http://localhost:3001/api/health`

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```
