# Launch Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare ContribRadar v1.0.0 launch operations, monitoring, production deploy execution, and release tagging without introducing product behavior changes.

**Architecture:** Keep all external-account operations as explicit runbooks because Vercel, database provider, GitHub OAuth, Gemini, Resend, Slack, Sentry, and tag publishing require owner credentials. Add local validation scripts and docs that make the launch path reproducible after credentials are available.

**Tech Stack:** Next.js 15, Prisma, Vercel, PostgreSQL, Vercel Analytics/Log Drains, optional Sentry, Git tags, Node.js ops scripts.

---

### Task 1: Version and Launch Plan

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `docs/ops/launch-plan.md`

- [x] Set package version to `1.0.0`.
- [x] Document launch sequence from Vercel project creation through deploy smoke.
- [x] Include external account owner steps for Vercel, DB provider, OAuth, Gemini, Resend, Slack, and monitoring.

### Task 2: Monitoring Runbook

**Files:**
- Create: `docs/ops/monitoring.md`
- Modify: `.env.example`
- Modify: `scripts/check-env.mjs`
- Modify: `docs/ops/final-release-checklist.md`

- [x] Document Vercel Web Analytics enablement.
- [x] Document Vercel Log Drains and optional Sentry setup.
- [x] Add `SENTRY_DSN` as an optional error tracking env var.
- [x] Add monitoring verification items to the final release checklist.

### Task 3: Launch Readiness Script

**Files:**
- Create: `scripts/launch-readiness.mjs`
- Modify: `package.json`

- [x] Add local checks for package version, required ops docs, `vercel.json`, and launch env placeholders.
- [x] Add `qa:launch` npm script.
- [x] Verify `bun run qa:launch` passes locally.

### Task 4: Release Tag Runbook

**Files:**
- Create: `docs/ops/release-tagging.md`
- Modify: `docs/ops/final-release-checklist.md`

- [x] Document when to create `v1.0.0`: after PR merge to master and production smoke passes.
- [x] Provide exact non-interactive git commands for local tag and push.
- [x] Avoid tagging the feature branch before merge.

### Task 5: Full Verification

Commands:

```powershell
bun test
bun run typecheck
bun run build
bun run qa:env
bun run qa:launch
node scripts/deploy-smoke.mjs --help
```
