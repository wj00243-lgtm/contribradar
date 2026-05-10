# Delivery Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver DB-backed smart alerts through email and Slack with preference gates, retries, and a scheduler-safe cron entrypoint.

**Architecture:** Keep alert creation in `src/server/alerts.ts` and add a focused delivery layer under `src/server/delivery.ts`. Channel adapters are dependency-injected so tests can use mock senders while production route wiring uses `fetch` against Resend and Slack webhooks. A cron route checks Pro users with alert-enabled watchlists, creates alerts through the existing DB-backed smart alert service, then delivers only newly created alerts according to `UserSettings.alertPreferences`.

**Tech Stack:** Next.js 15 App Router, Auth.js-adjacent server routes, Prisma, TypeScript strict, Vitest, native `fetch`, Vercel Cron-compatible API route.

---

### Task 1: Delivery Domain and Retry Service

**Files:**
- Create: `src/server/delivery.ts`
- Create: `src/server/delivery.test.ts`

- [x] Write failing tests for `deliverAlerts`:
  - sends email only when `preferences.email === true`
  - sends Slack only when `preferences.slack === true`
  - retries transient adapter failures up to the configured attempt count
  - returns per-channel delivery statuses without throwing after final failure
- [x] Implement `DeliveryAdapter`, `DeliveryAttempt`, `DeliverAlertsInput`, and `deliverAlerts`.
- [x] Keep delivery payloads plain text for Sprint 5: subject/text for email, text for Slack.
- [x] Run `bun test src/server/delivery.test.ts`.

### Task 2: Resend Email Adapter

**Files:**
- Create: `src/server/delivery-resend.ts`
- Create: `src/server/delivery-resend.test.ts`

- [x] Write failing tests using a mocked `fetch`.
- [x] Implement `createResendEmailAdapter({ apiKey, from, fetch })`.
- [x] POST to `https://api.resend.com/emails` with `Authorization: Bearer <apiKey>`.
- [x] Return `skipped` when api key, from, or recipient email is missing.
- [x] Throw on non-2xx responses so retry logic owns retries.
- [x] Run `bun test src/server/delivery-resend.test.ts`.

### Task 3: Slack Webhook Adapter

**Files:**
- Create: `src/server/delivery-slack.ts`
- Create: `src/server/delivery-slack.test.ts`

- [x] Write failing tests using a mocked `fetch`.
- [x] Implement `createSlackWebhookAdapter({ webhookUrl, fetch })`.
- [x] POST `{ text }` to the configured webhook URL.
- [x] Return `skipped` when webhook URL is missing.
- [x] Throw on non-2xx responses so retry logic owns retries.
- [x] Run `bun test src/server/delivery-slack.test.ts`.

### Task 4: Alert Preference Integration

**Files:**
- Modify: `src/server/alerts.ts`
- Modify: `src/server/alerts.test.ts`

- [x] Preserve `checkSmartAlerts` as the DB-backed alert creator.
- [x] Ensure returned `created` alerts include user/repository/issue data needed for delivery when Prisma include data is available.
- [x] Keep `normalizeAlertPreferences(user.settings?.alertPreferences)` as the only preference source.
- [x] Add tests proving `checkSmartAlerts` returns normalized email/slack toggles.

### Task 5: Scheduler/Cron Entrypoint

**Files:**
- Create: `src/app/api/cron/deliver-alerts/route-handler.ts`
- Create: `src/app/api/cron/deliver-alerts/route.ts`
- Create: `src/app/api/cron/deliver-alerts/route.test.ts`

- [x] Write failing route tests:
  - rejects requests when `CRON_SECRET` is configured and bearer token is wrong
  - allows local/test requests when `CRON_SECRET` is missing
  - finds Pro users with alert-enabled watchlists
  - calls `checkSmartAlerts` and `deliverAlerts` for each user
  - reports per-user created/delivered counts
- [x] Implement route handler factory with injected `client`, `checkSmartAlerts`, `deliverAlerts`, and `now`.
- [x] Wire production route to Prisma, Resend adapter, Slack adapter, and native fetch.
- [x] Keep seed/live separation: cron route uses Prisma only; no seed fallback.

### Task 6: Env and Production Checklist

**Files:**
- Modify: `.env.example`
- Modify: `scripts/check-env.mjs`
- Modify: `README.md`
- Modify: `docs/qa/sprint-3-production-readiness.md`
- Modify: `docs/superpowers/plans/2026-05-10-delivery-layer.md`

- [x] Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SLACK_WEBHOOK_URL`, and `CRON_SECRET` to `.env.example`.
- [x] Treat delivery env vars as optional feature vars in `scripts/check-env.mjs`.
- [x] Document Sprint 5 delivery behavior and deploy checks.
- [x] Mark plan tasks complete after verification.

### Task 7: Full Verification

Commands:

```powershell
bun test
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma validate
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma generate
bun run typecheck
bun run build
```
