# DB Issues and Auth Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Sprint 4 persistence hardening by moving issue discovery to Prisma and removing anonymous/user_demo watchlist behavior from API routes.

**Architecture:** Add DB-backed issue discovery inside `discovery-db.ts`, split route handlers for testability, and require Auth.js session identity for watchlist APIs. Production no longer falls back to seed issue discovery for the API route.

**Tech Stack:** Next.js 15 App Router, Auth.js v5, Prisma-compatible services, TypeScript strict, Vitest.

---

### Task 1: DB-backed Issue Discovery

**Files:**
- Modify: `src/server/discovery-db.ts`
- Modify: `src/server/discovery-db.test.ts`

- [x] Add failing tests for issue filters: repo, labels, min score, stale, no assignee, difficulty.
- [x] Implement `discoverIssuesFromDb(client, query)`.
- [x] Map Prisma issue records with `mapIssueRecord`.
- [x] Run `bun test src/server/discovery-db.test.ts`.

### Task 2: Issue Route Handler

**Files:**
- Create: `src/app/api/v1/discover/issues/route-handler.ts`
- Modify: `src/app/api/v1/discover/issues/route.ts`
- Modify: `src/app/api/v1/discover/issues/route.test.ts`

- [x] Move query parsing into a handler factory.
- [x] Wire default route to `discoverIssuesFromDb(prisma, query)`.
- [x] Remove seed fallback from issue API route.
- [x] Keep validation errors unchanged.

### Task 3: Watchlist Auth Route Handlers

**Files:**
- Create: `src/app/api/v1/watchlists/route-handler.ts`
- Modify: `src/app/api/v1/watchlists/route.ts`
- Create: `src/app/api/v1/watchlists/route.test.ts`
- Create: `src/app/api/v1/watchlists/[id]/repos/route-handler.ts`
- Modify: `src/app/api/v1/watchlists/[id]/repos/route.ts`
- Create: `src/app/api/v1/watchlists/[id]/repos/route.test.ts`

- [x] Require session for watchlist create and read.
- [x] Use `session.user.id`, never request body `userId`.
- [x] Use `session.user.plan` for limits.
- [x] Return `401 AUTH_REQUIRED` for anonymous requests.
- [x] Remove `user_demo` route fallback.

### Task 4: Verification and Docs

**Files:**
- Modify: `README.md`
- Modify: `docs/qa/sprint-3-production-readiness.md`

- [x] Document anonymous watchlist API behavior.
- [x] Run full verification.

### Task 5: Full Verification

Commands:

```powershell
bun test
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma validate
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma generate
bun run typecheck
bun run build
```
