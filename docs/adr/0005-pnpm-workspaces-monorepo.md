# 5. pnpm Workspaces Monorepo

Date: 2026-01-20

## Status

Accepted

## Context

ktb.clubmanager has multiple applications and shared code:

- `apps/web` - Next.js frontend
- `apps/api` - NestJS backend
- `packages/shared` - Shared types, Zod schemas, utilities

We need a structure that:

1. **Shares code:** Types and validation schemas used by both frontend and backend
2. **Consistent tooling:** Same linting, formatting, testing across packages
3. **Single repository:** Easier to maintain than multiple repos
4. **Efficient dependencies:** Don't duplicate shared dependencies

We evaluated:

**Multiple repositories:**

- Clear separation of concerns
- Complex cross-repo dependencies
- Version synchronization challenges

**npm/yarn workspaces:**

- Well-known tools
- npm workspaces less mature
- yarn (classic) being deprecated in favor of yarn berry

**pnpm workspaces:**

- Efficient disk space (content-addressable storage)
- Fast installs with hard links
- Strict dependency resolution (no phantom dependencies)
- Mature workspace support

**Turborepo/Nx:**

- Powerful build orchestration
- Additional complexity for small team
- Consider later if build times become issue

## Decision

We will use pnpm workspaces with a monorepo structure.

Structure:

```
ktb.clubmanager/
├── apps/
│   ├── web/      # Next.js frontend
│   └── api/      # NestJS backend
├── packages/
│   └── shared/   # Shared types, schemas
└── pnpm-workspace.yaml
```

## Consequences

**Positive:**

- Shared code in `packages/shared` used by both apps
- Single `pnpm install` for all dependencies
- Consistent tooling via root-level configuration
- Efficient disk usage with pnpm's content-addressable store
- Strict dependency resolution prevents phantom dependencies
- Atomic commits across frontend and backend

**Negative:**

- Workspace configuration complexity (pnpm-workspace.yaml, package references)
- All developers need pnpm (not npm or yarn)
- Large repository over time
- CI must handle monorepo structure

**Neutral:**

- Single git history for entire project
- Root package.json scripts orchestrate workspace commands
- Dependencies can be workspace-specific or shared at root
