# Observability Durable Ops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add durable operational visibility for alert delivery cron runs and per-channel delivery attempts.

**Architecture:** Persist cron run summaries and delivery attempts in PostgreSQL through Prisma. Keep the existing cron response shape compatible while adding a `runId`; expose a read-only ops API gated by `OPS_API_KEY` for launch troubleshooting and future admin UI work.

**Tech Stack:** Next.js 15 App Router, Prisma/PostgreSQL, TypeScript strict, Vitest.

---

### Task 1: Prisma Ops Models

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260510140000_add_ops_observability/migration.sql`

- [x] Add `CronRun` model for cron name, status, counts, timestamps, duration, and error summary.
- [x] Add `DeliveryAttemptLog` model for run id, user id, alert id, channel, status, attempts, provider id, reason, and error.
- [x] Add indexes for newest cron runs and per-user delivery lookups.

### Task 2: Ops Service

**Files:**
- Create: `src/server/ops-observability.ts`
- Create: `src/server/ops-observability.test.ts`

- [x] Write tests for starting a cron run, completing it, failing it, logging delivery attempts, and listing recent runs.
- [x] Implement client-shaped Prisma helpers with dependency injection.
- [x] Keep service resilient: missing optional Prisma methods should not crash cron execution.

### Task 3: Cron Integration

**Files:**
- Modify: `src/app/api/cron/deliver-alerts/route-handler.ts`
- Modify: `src/app/api/cron/deliver-alerts/route.ts`
- Modify: `src/app/api/cron/deliver-alerts/route.test.ts`

- [x] Start a durable cron run at route start.
- [x] Log every delivery attempt returned by `deliverAlerts`.
- [x] Mark run succeeded with counts and duration at the end.
- [x] Mark run failed if user discovery fails before per-user loop.
- [x] Preserve existing response fields and add `runId`.

### Task 4: Read-only Ops API

**Files:**
- Create: `src/app/api/ops/cron-runs/route-handler.ts`
- Create: `src/app/api/ops/cron-runs/route.ts`
- Create: `src/app/api/ops/cron-runs/route.test.ts`
- Modify: `.env.example`
- Modify: `scripts/check-env.mjs`

- [x] Add `OPS_API_KEY` optional env var.
- [x] Add bearer-auth gated route for recent cron runs.
- [x] Return `401 OPS_UNAUTHORIZED` when key is configured and wrong.
- [x] Return recent runs and attempts for operational debugging.

### Task 5: Docs and Verification

**Files:**
- Modify: `docs/ops/monitoring.md`
- Modify: `docs/ops/final-release-checklist.md`
- Modify: `docs/superpowers/plans/2026-05-10-observability-durable-ops.md`

- [x] Document durable cron run history and ops API usage.
- [x] Run full verification:

```powershell
bun test
bun run typecheck
$env:DATABASE_URL='postgresql://user:password@localhost:5432/contribradar'; bunx prisma validate
bun run build
bun run qa:launch
```
