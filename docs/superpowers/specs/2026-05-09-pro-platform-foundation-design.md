# Pro Platform Foundation Design

Date: 2026-05-09
Branch target: `feat/intelligence-layer`

## Summary

Faz 3A prepares ContribRadar for Pro-tier intelligence features without implementing the intelligence features themselves. The work adds UI system foundations, authentication, Prisma schema extensions, feature gates, quota services, and a reusable Pro gate shell.

The current Core MVP still uses seed-backed discovery and in-memory watchlists. This phase does not migrate those runtime services to PostgreSQL. It only adds the platform boundaries needed for later Pro features.

## Goals

- Install and configure shadcn/ui conventions for future Pro UI.
- Add Auth.js v5 with GitHub OAuth and JWT sessions.
- Extend Prisma schema for `Contribution`, `UsageLog`, and `UserSettings`.
- Add feature gating with `hasFeature(userPlan, featureName)`.
- Add quota services for AI recommendation usage and alert limits.
- Add a reusable `<ProGate requiredPlan="pro">` component with blur overlay and upgrade CTA.

## Non-Goals

- AI recommendations.
- Smart alert creation/delivery.
- Repo comparison.
- Score trend charts.
- Email, Slack, or Resend integration.
- DB-backed discovery/watchlists.
- Billing or Stripe checkout.
- Production OAuth app provisioning.

## Architecture

### UI System

Add shadcn/ui-style configuration and components:

- `components.json`
- `src/lib/utils.ts`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/tooltip.tsx`

The implementation should use Radix primitives where appropriate and Tailwind utility classes consistent with shadcn conventions. Existing custom dashboard components may continue to work unchanged.

### Authentication

Add Auth.js v5 using GitHub OAuth:

- `src/auth.ts` exports `auth`, `handlers`, `signIn`, and `signOut`.
- `src/app/api/auth/[...nextauth]/route.ts` wires the Auth.js handlers.
- `src/components/auth/auth-buttons.tsx` provides login/logout controls through server actions or server form actions.
- Sessions use JWT strategy.
- Session token contains the user's GitHub id when available and the user's plan when available.

Environment variables:

- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `AUTH_URL`
- `DATABASE_URL`

No production OAuth credentials are committed.

### Prisma Schema

Extend the schema with:

- `Contribution`
- `UsageLog`
- `UserSettings`

Relationships:

- `User` has many `contributions`.
- `User` has many `usageLogs`.
- `User` has optional `settings`.
- `Repository` has many `contributions`.
- `Issue` has optional/many `contributions`, depending on relation fit.

`UsageLog` tracks per-user, per-feature, per-period counts with a unique key:

```prisma
@@unique([userId, feature, period])
```

`UserSettings` stores Pro platform defaults:

- alert preferences JSON
- `aiQuota` default 20
- `maxAlerts` default 10

`Contribution` stores imported or tracked contribution activity for future recommendations.

### Feature Gates

Add `src/lib/features.ts`:

- Defines supported feature names.
- Defines plan hierarchy: `free < pro < team`.
- Exports `hasFeature(userPlan, featureName)`.

Initial feature map:

- `aiRecommendations`: pro+
- `smartAlerts`: pro+
- `repoComparison`: pro+
- `scoreTrends`: pro+
- `unlimitedWatchlists`: pro+
- `teamDashboard`: team only

Unknown features should return `false`.

### Quota Services

Add `src/server/usage.ts`:

- `getUsagePeriod(date)` returns `YYYY-MM`.
- `getAiRecommendationUsage(userId, period?)`.
- `incrementAiRecommendationUsage(userId, amount?)`.
- `canUseAiRecommendations(userId)`.
- `canCreateAlert(userId)`.

Because the current app does not yet have a database connection helper pattern, the service should accept an injectable Prisma-like client for tests or expose pure helpers plus a thin Prisma implementation. Tests should not require a live database.

### Pro Gate UI

Add `src/components/pro/pro-gate.tsx`:

- Props: `userPlan`, `requiredPlan`, `featureName`, `children`.
- If allowed, render `children`.
- If blocked, render blurred/disabled content and overlay with upgrade CTA.
- Must be reusable for AI recommendations, alerts, comparison, and trends in Faz 3B.

## Data Flow

1. Auth establishes a session and exposes user identity/plan.
2. Feature gate checks plan access before rendering Pro UI.
3. Quota service checks usage logs/settings before allowing metered actions.
4. ProGate protects UI surfaces even before full backend enforcement exists.
5. Later Faz 3B features consume these utilities.

## Error Handling

- Missing Auth env values should fail only when OAuth is used, not during static imports/tests.
- Feature gate unknown feature names return denied.
- Quota service treats missing settings as defaults: AI quota 20, max alerts 10.
- Usage increments should be idempotent per user/feature/period through upsert when backed by Prisma.

## Testing

Add focused tests:

- Feature gate plan matrix.
- Usage period formatting.
- AI quota allowed/blocked behavior with fake client.
- Alert limit allowed/blocked behavior with fake client.
- ProGate access helper or render-adjacent logic if practical without adding heavy test dependencies.

Verification commands:

- `bun test`
- `bun .\node_modules\typescript\bin\tsc --noEmit --incremental false`
- `DATABASE_URL=... bun .\node_modules\prisma\build\index.js validate`
- `bun .\node_modules\next\dist\bin\next build`

## Open Decisions

- Auth user persistence will be minimal in Faz 3A; full DB-backed user sync can be refined in the persistence phase.
- Billing is not implemented, so plan values are read from existing user data/session defaults rather than Stripe.
- ProGate is UI enforcement; backend services must still enforce quotas and feature access when Faz 3B actions are added.
