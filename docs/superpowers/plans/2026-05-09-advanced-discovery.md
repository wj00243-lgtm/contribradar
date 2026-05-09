# Advanced Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sprint 3B-3A repository comparison and advanced discovery filters.

**Architecture:** Extend the existing seed-backed discovery model and client-side dashboard filtering. Keep comparison UI in a dedicated component and guard Pro controls with `ProGate`.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, shadcn/ui, Tailwind v4, Vitest.

---

### Task 1: Domain Data Fields

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/data/seed.ts`
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

- [ ] Add repository `license` and `contributorCount` fields.
- [ ] Populate all seed repositories.
- [ ] Pass values through Prisma seed.
- [ ] Verify typecheck.

### Task 2: Advanced Filtering

**Files:**
- Modify: `src/components/discovery/discovery-filtering.ts`
- Modify: `src/components/discovery/discovery-filtering.test.ts`

- [ ] Add failing tests for license, last commit, and contributor range filters.
- [ ] Extend `DiscoveryFilters`.
- [ ] Implement filtering against existing repo fields and metrics.
- [ ] Run `bun test src/components/discovery/discovery-filtering.test.ts`.

### Task 3: Repo Comparison UI

**Files:**
- Create: `src/components/discovery/repo-comparison.tsx`
- Modify: `src/components/discovery/discovery-dashboard.tsx`

- [ ] Add comparison component with 2-3 repo columns.
- [ ] Add compare toggles to repository list area.
- [ ] Use existing metrics and readiness fields.
- [ ] Guard with `ProGate featureName="repoComparison"`.

### Task 4: Advanced Filter Controls

**Files:**
- Modify: `src/components/discovery/discovery-dashboard.tsx`

- [ ] Add license select.
- [ ] Add last commit within days input.
- [ ] Add contributor min/max numeric inputs.
- [ ] Guard controls with `ProGate featureName="repoComparison"`.

### Task 5: Full Verification

Commands:

```powershell
bun test
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma validate
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma generate
bun run typecheck
bun run build
```
