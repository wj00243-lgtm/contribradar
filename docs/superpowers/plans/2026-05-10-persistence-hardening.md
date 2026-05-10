# Persistence Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move watchlist and discovery services from seed/in-memory runtime behavior toward Prisma-backed production behavior.

**Architecture:** Add DB-backed service modules alongside existing seed-backed modules, then wire API routes to the DB-backed versions. Keep seed fallback available for development and tests where useful.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Prisma, PostgreSQL schema, Vitest.

---

### Task 1: Prisma Domain Mappers

**Files:**
- Create: `src/server/repository-mappers.ts`
- Test: `src/server/repository-mappers.test.ts`

- [ ] Add tests for mapping repository, issue, readiness score, and JSON arrays.
- [ ] Implement mapper helpers from Prisma-like records to domain `RepoWithScore` and `IssueWithScore`.
- [ ] Run mapper tests.

### Task 2: DB-backed Discovery

**Files:**
- Create: `src/server/discovery-db.ts`
- Test: `src/server/discovery-db.test.ts`
- Modify: `src/app/api/v1/discover/repos/route.ts`
- Modify: `src/app/api/v1/discover/issues/route.ts`

- [ ] Add tests for language/topic/score/good-first/recent filters using fake Prisma client.
- [ ] Add DB-backed repository discovery and issue discovery.
- [ ] Preserve seed-backed service for development fallback.
- [ ] Wire API routes to async DB-backed handlers.

### Task 3: DB-backed Watchlists

**Files:**
- Create: `src/server/watchlists-db.ts`
- Test: `src/server/watchlists-db.test.ts`
- Modify: `src/app/api/v1/watchlists/route.ts`
- Modify: `src/app/api/v1/watchlists/[id]/repos/route.ts`

- [ ] Add tests for create watchlist, repo join rows, free limits, pro unlimited, and not found.
- [ ] Implement Prisma-backed watchlist create/list repo functions.
- [ ] Wire API routes to DB-backed services.

### Task 4: Environment Strategy

**Files:**
- Create: `src/server/persistence-mode.ts`
- Test: `src/server/persistence-mode.test.ts`
- Modify: `docs/qa/sprint-3-production-readiness.md`
- Modify: `README.md`

- [ ] Add explicit production/development persistence mode helper.
- [ ] Document seed fallback behavior.
- [ ] Document production migration and cutover commands.

### Task 5: Full Verification

Commands:

```powershell
bun test
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma validate
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma generate
bun run typecheck
bun run build
```
