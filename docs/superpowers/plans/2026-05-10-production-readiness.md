# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden ContribRadar for production deployment without changing product behavior or public API contracts.

**Architecture:** Add deployment configuration and ops scripts around the existing Next.js/Prisma app, keep runtime behavior backward compatible, and standardize production logging for operational routes. Vercel Cron will call the existing DB-backed delivery endpoint, while a deploy smoke script validates the most important public and cron surfaces after deployment.

**Tech Stack:** Next.js 15 App Router, Prisma, Vercel Cron, Node.js scripts, TypeScript strict, Vitest.

---

### Task 1: Vercel Cron Config

**Files:**
- Create: `vercel.json`
- Create: `docs/ops/vercel-deployment.md`

- [x] Add `vercel.json` with a daily cron for `/api/cron/deliver-alerts`.
- [x] Document Vercel project env vars and cron bearer auth expectations.
- [x] Verify JSON syntax with `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"`.

### Task 2: Deployment Smoke Script

**Files:**
- Create: `scripts/deploy-smoke.mjs`
- Modify: `package.json`
- Create: `docs/ops/deploy-smoke.md`

- [x] Add a Node script that accepts `--base-url`, optional `--cron-secret`, and optional `--skip-cron`.
- [x] Smoke GET `/api/v1/discover/repos`, GET `/api/v1/discover/issues`, and GET `/api/cron/deliver-alerts`.
- [x] Treat 2xx public responses and protected cron responses as expected.
- [x] Add `qa:smoke` npm script.
- [x] Verify script help and dry path with local URL arguments.

### Task 3: Production Logging Standard

**Files:**
- Create: `src/server/logger.ts`
- Create: `src/server/logger.test.ts`
- Modify: `src/app/api/cron/deliver-alerts/route-handler.ts`
- Modify: `src/app/api/cron/deliver-alerts/route.test.ts`

- [x] Add structured JSON logging helpers for info, warn, and error.
- [x] Catch per-user cron delivery failures, log them with user id and route context, and continue processing remaining users.
- [x] Preserve existing successful cron response shape for users without failures.
- [x] Add tests for logger formatting and cron partial failure behavior.

### Task 4: Final Release Checklist

**Files:**
- Create: `docs/ops/final-release-checklist.md`
- Modify: `README.md`
- Modify: `docs/qa/sprint-3-production-readiness.md`

- [x] Add final release checklist covering env, migration, seed/import, auth, AI, alerts, delivery, and rollback.
- [x] Link ops docs from README.
- [x] Update QA checklist to reference Vercel Cron and deploy smoke script.

### Task 5: Full Verification

Commands:

```powershell
bun test
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma validate
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma generate
bun run typecheck
bun run build
bun run qa:env
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json valid')"
node scripts/deploy-smoke.mjs --help
```
