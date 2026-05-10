# Private Beta Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal private beta ops dashboard and beta readiness runbook.

**Architecture:** Reuse the existing protected ops API and keep the browser dashboard read-only. Formatting logic lives in a small testable module; the client component handles token input and fetch state.

**Tech Stack:** Next.js 15 App Router, TypeScript, shadcn/ui primitives, Tailwind v4, Vitest.

---

### Task 1: Ops Formatting Utilities

**Files:**
- Create: `src/components/ops/cron-runs-formatting.ts`
- Create: `src/components/ops/cron-runs-formatting.test.ts`

- [ ] Define `CronRunView` and `DeliveryAttemptView` types matching the ops API payload.
- [ ] Add pure helpers for status labels, badge variants, timestamps, durations, and aggregate counts.
- [ ] Unit-test helper output for succeeded, failed, running, missing timestamps, and attempt counts.

### Task 2: Ops Dashboard UI

**Files:**
- Create: `src/components/ops/cron-runs-dashboard.tsx`
- Create: `src/app/ops/page.tsx`

- [ ] Build a client component with an `OPS_API_KEY` password input.
- [ ] Fetch `/api/ops/cron-runs` with `Authorization: Bearer <key>`.
- [ ] Render summary cards and a recent-run table.
- [ ] Render recent delivery attempts inside each run row.
- [ ] Show clear empty, loading, and unauthorized states.

### Task 3: Private Beta Runbook

**Files:**
- Create: `docs/ops/private-beta.md`
- Modify: `docs/ops/monitoring.md`
- Modify: `docs/ops/final-release-checklist.md`

- [ ] Document private beta entry criteria.
- [ ] Document `/ops` usage and required `OPS_API_KEY`.
- [ ] Document smoke, rollback, and go/no-go checks.

### Task 4: Verification

**Files:**
- No source edits expected.

- [ ] Run `bun test`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run build`.
- [ ] Fix any failures before PR.
