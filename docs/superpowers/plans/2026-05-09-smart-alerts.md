# Smart Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 3B-2 Smart Alerts backend and in-app notification center.

**Architecture:** Use existing `Alert`, `UserSettings`, `Watchlist`, `Issue`, and `ScoreLog` tables. Keep preference parsing, alert detection, route handling, and UI rendering in separate files with fake-client unit tests.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Prisma, Auth.js v5, shadcn/ui, Vitest.

---

### Task 1: Alert Preferences

**Files:**
- Create: `src/server/alert-preferences.ts`
- Test: `src/server/alert-preferences.test.ts`

- [ ] Test defaults for missing JSON.
- [ ] Test boolean email/slack flags and digest values.
- [ ] Implement `normalizeAlertPreferences`.
- [ ] Run `bun test src/server/alert-preferences.test.ts`.

### Task 2: Smart Alert Service

**Files:**
- Create: `src/server/alerts.ts`
- Test: `src/server/alerts.test.ts`

- [ ] Test `listAlerts` ordering and unread count.
- [ ] Test `markAlertRead` ownership enforcement.
- [ ] Test `checkSmartAlerts` creates `new_issue`, `score_change`, and `stale_reminder`.
- [ ] Test active alert limit blocks creation.
- [ ] Implement service functions.
- [ ] Run `bun test src/server/alerts.test.ts`.

### Task 3: Alerts API

**Files:**
- Create: `src/app/api/v1/alerts/route-handler.ts`
- Create: `src/app/api/v1/alerts/route.ts`
- Create: `src/app/api/v1/alerts/route.test.ts`
- Create: `src/app/api/v1/alerts/[id]/route.ts`
- Create: `src/app/api/v1/alerts/[id]/route-handler.ts`
- Create: `src/app/api/v1/alerts/[id]/route.test.ts`

- [ ] Implement GET list route.
- [ ] Implement POST check route.
- [ ] Implement PATCH read/unread route.
- [ ] Keep App Router route files export-safe.
- [ ] Run route tests.

### Task 4: Notification Center UI

**Files:**
- Create: `src/components/alerts/notification-center.tsx`
- Modify: `src/components/discovery/discovery-dashboard.tsx`

- [ ] Add client notification center with loading, empty, error, unread/read states.
- [ ] Add "Check alerts" and "Mark read" actions.
- [ ] Wrap with `ProGate featureName="smartAlerts"`.
- [ ] Render in dashboard side column.

### Task 5: Full Verification

Commands:

```powershell
bun test
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma validate
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma generate
bun run typecheck
bun run build
```

Expected:

- All tests pass.
- Prisma schema remains valid.
- TypeScript and Next build pass.
