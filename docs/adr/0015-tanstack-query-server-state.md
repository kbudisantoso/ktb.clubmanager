# ADR-0015: TanStack Query for Server State Management

## Status

Accepted

## Date

2026-02-01

## Context

The application was experiencing issues with:

1. **Duplicate API requests**: Multiple components (`ClubSwitcher`, `DashboardPage`, settings pages) independently fetching the same data (`/api/clubs/my`), causing 3+ requests within 45ms
2. **React Strict Mode**: Development mode double-invokes effects, amplifying the duplication
3. **Manual cache management**: Using Zustand for both UI state and server state, leading to stale data and complex invalidation logic
4. **No loading/error states**: Inconsistent handling across components

We needed a solution that:
- Deduplicates concurrent requests
- Provides caching with configurable staleness
- Handles loading, error, and success states consistently
- Separates server state from UI state

## Decision

Adopt **TanStack Query** (formerly React Query) for all server state management.

### Why TanStack Query over alternatives?

| Option | Verdict |
|--------|---------|
| **TanStack Query** | Industry standard, feature-complete, excellent devtools |
| **SWR** | Smaller bundle but fewer features (no mutations, less control) |
| **Enhanced Zustand** | DIY approach, error-prone, no deduplication |
| **RTK Query** | Requires Redux, which we don't use |

### Architecture Change

**Before:**
```
Component → apiFetch() → API
Component → apiFetch() → API  (duplicate!)
Component → Zustand store (stale)
```

**After:**
```
Component → useQuery() ─┐
Component → useQuery() ─┼→ QueryClient → apiFetch() → API (single request)
Component → useQuery() ─┘              ↓
                                   Cache (shared)
```

### Implementation

1. **QueryClientProvider** wraps the app in root layout
2. **Custom hooks** encapsulate query logic (e.g., `useMyClubs`)
3. **Zustand** retains only UI state (activeClub selection, not clubs list)
4. **Mutations** use `useMutation` with cache invalidation

### Query Key Convention

```typescript
// Pattern: [resource, ...identifiers, filters?]
['clubs', 'my']                    // User's clubs
['clubs', 'detail', slug]          // Single club
['clubs', 'public']                // Public clubs list
['admin', 'tiers']                 // Admin tier list
```

### Stale Time Guidelines

| Data Type | Stale Time | Rationale |
|-----------|------------|-----------|
| User's clubs | 30s | Changes rarely, user-initiated |
| Club details | 60s | Stable data |
| Admin data | 10s | May change from other admins |
| Real-time data | 0 | Always refetch |

## Consequences

### Positive

- **Automatic deduplication**: Multiple components using same query key share one request
- **Consistent loading states**: `isLoading`, `isError`, `data` available everywhere
- **Background refetching**: Stale-while-revalidate pattern improves UX
- **DevTools**: Debug cache state, queries, mutations in development
- **Optimistic updates**: Instant UI feedback for mutations
- **Automatic retries**: Failed requests retry with exponential backoff

### Negative

- **New dependency**: ~12kb gzipped added to bundle
- **Learning curve**: Team needs to understand query keys, cache invalidation
- **Paradigm shift**: Moving from imperative fetching to declarative hooks

### Neutral

- Zustand remains for UI-only state (active club selection, modals, preferences)
- `apiFetch` helper retained as the underlying fetch function

## References

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Practical React Query](https://tkdodo.eu/blog/practical-react-query)
- [Why You Want React Query](https://tkdodo.eu/blog/why-you-want-react-query)
