# Score Trends and Watchlist Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sprint 3B-3B score trend API/UI and polish watchlist limits.

**Architecture:** Add focused trend service/API/UI files and keep watchlist limit logic inside the existing in-memory watchlist service.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, shadcn/ui, Prisma-compatible service typing, Vitest.

---

### Task 1: Score Trend Service

**Files:**
- Create: `src/server/score-trends.ts`
- Test: `src/server/score-trends.test.ts`

- [ ] Add failing tests for trend ordering, 30-day window, annotation, and missing repo.
- [ ] Implement `getRepositoryScoreTrend`.
- [ ] Run service tests.

### Task 2: Score Trend API

**Files:**
- Create: `src/app/api/v1/discover/repos/[owner]/[repo]/score/trend/route-handler.ts`
- Create: `src/app/api/v1/discover/repos/[owner]/[repo]/score/trend/route.ts`
- Create: `src/app/api/v1/discover/repos/[owner]/[repo]/score/trend/route.test.ts`

- [ ] Add GET handler with auth and ProGate plan enforcement.
- [ ] Map not found to 404.
- [ ] Run route tests.

### Task 3: Score Trend UI

**Files:**
- Create: `src/components/discovery/score-trend-panel.tsx`
- Modify: `src/components/discovery/discovery-dashboard.tsx`

- [ ] Add Pro-only panel.
- [ ] Fetch trend for selected repo.
- [ ] Render points and annotations without new chart dependency.
- [ ] Verify build.

### Task 4: Watchlist Limits

**Files:**
- Modify: `src/server/watchlists.ts`
- Modify: `src/server/watchlists.test.ts`
- Modify: `src/app/api/v1/watchlists/route.ts`

- [ ] Add failing tests for free list limit.
- [ ] Add failing tests for free repo cap.
- [ ] Add user plan to create watchlist input/API schema.
- [ ] Implement free/pro limit behavior.

### Task 5: Full Verification

Commands:

```powershell
bun test
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma validate
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma generate
bun run typecheck
bun run build
```
