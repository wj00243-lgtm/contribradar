# Sprint 3A: Pro Platform Foundation Implementation Plan

Owner: Codex
Branch: `feat/intelligence-layer`
Scope: Faz 3A only. Intelligence features in Faz 3B are intentionally excluded.

## Goal

Establish the foundation required for Pro-tier intelligence features without implementing AI recommendations, smart alert generation, repo comparison, or score trend UI yet.

The end state must include:

- shadcn/ui-compatible primitives and project config.
- Auth.js v5 GitHub OAuth wiring with JWT sessions.
- Prisma schema additions for usage, settings, and contributions.
- Feature gate utility and quota service.
- Reusable ProGate UI shell with blur overlay and optional fallback.
- Tests for pure business logic and quota boundaries.

## Non-Goals

- No OpenAI API calls.
- No Resend email delivery.
- No Slack webhook delivery.
- No billing or Stripe integration.
- No DB migration execution against a live production database.
- No visual design tooling or generated imagery.

## Step 1: Branch and Dependency Foundation

Files:

- `package.json`
- `package-lock.json`
- `components.json`
- `src/lib/utils.ts`

Actions:

1. Install runtime dependencies:

   ```powershell
   npm install next-auth@beta @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-scroll-area @radix-ui/react-tooltip class-variance-authority clsx tailwind-merge lucide-react
   ```

2. Add `components.json` for shadcn/ui conventions:

   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "style": "new-york",
     "rsc": true,
     "tsx": true,
     "tailwind": {
       "config": "",
       "css": "src/app/globals.css",
       "baseColor": "zinc",
       "cssVariables": true,
       "prefix": ""
     },
     "aliases": {
       "components": "@/components",
       "utils": "@/lib/utils",
       "ui": "@/components/ui",
       "lib": "@/lib",
       "hooks": "@/hooks"
     },
     "iconLibrary": "lucide"
   }
   ```

3. Add `src/lib/utils.ts`:

   ```ts
   import { clsx, type ClassValue } from "clsx";
   import { twMerge } from "tailwind-merge";

   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }
   ```

Verification:

- `npm install` completes.
- `npm run lint` can resolve `@/lib/utils`.

## Step 2: shadcn/ui Component Primitives

Files:

- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/tooltip.tsx`

Actions:

1. Add shadcn-compatible primitives using Radix where needed.
2. Keep classes compatible with the existing Tailwind v4 setup and avoid requiring a separate Tailwind config.
3. Export component APIs in the standard shadcn naming style.

Implementation notes:

- `button.tsx` uses `cva` variants: `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`.
- `card.tsx` exports `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- `badge.tsx` uses `cva` variants: `default`, `secondary`, `outline`, `destructive`.
- `dialog.tsx`, `dropdown-menu.tsx`, `scroll-area.tsx`, and `tooltip.tsx` wrap Radix primitives.
- `skeleton.tsx` is a simple animated block component.

Verification:

- TypeScript compiles.
- Components import cleanly from `@/components/ui/*`.

## Step 3: Auth.js v5 GitHub OAuth

Files:

- `.env.example`
- `src/auth.ts`
- `src/types/next-auth.d.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/components/auth/auth-buttons.tsx`
- `src/app/page.tsx`

Actions:

1. Extend `.env.example` with:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/contribradar?schema=public"
   AUTH_SECRET="replace-with-openssl-rand-base64-32"
   AUTH_URL="http://localhost:3000"
   AUTH_GITHUB_ID=""
   AUTH_GITHUB_SECRET=""
   OPENAI_API_KEY=""
   ```

2. Add `src/auth.ts`:

   - Exports `handlers`, `auth`, `signIn`, and `signOut`.
   - Uses GitHub provider only when credentials are present.
   - Uses JWT sessions.
   - Adds `githubId` and `plan` to JWT/session.
   - Defaults `plan` to `free`.

3. Add type augmentation in `src/types/next-auth.d.ts`.
4. Add API route:

   ```ts
   import { handlers } from "@/auth";

   export const { GET, POST } = handlers;
   ```

5. Add `AuthButtons` server component with GitHub sign-in and sign-out forms.
6. Render `AuthButtons` in the page shell without changing discovery behavior.

Verification:

- `npm run lint`
- `npm run build`
- Missing OAuth env does not break import/build.

## Step 4: Prisma Schema Extensions

Files:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/migrations/<timestamp>_add_pro_platform_foundation/migration.sql`

Actions:

1. Add `UsageLog`:

   - `id`
   - `userId`
   - `feature`
   - `count`
   - `period`
   - timestamps
   - unique `[userId, feature, period]`
   - indexes for user/period lookup

2. Add `UserSettings`:

   - `id`
   - `userId`
   - `alertPreferences Json`
   - `aiQuota Int @default(20)`
   - `maxAlerts Int @default(10)`
   - timestamps

3. Add `Contribution`:

   - `id`
   - `userId`
   - `repoId`
   - optional `issueId`
   - `type`
   - `status`
   - optional GitHub URL and contribution metrics
   - `openedAt`, optional `mergedAt`, optional `closedAt`
   - timestamps and query indexes

4. Add relations:

   - `User.contributions`
   - `User.usageLogs`
   - `User.settings`
   - `Repository.contributions`
   - `Issue.contributions`

5. Seed default user settings for demo users where appropriate.
6. Generate a SQL migration with Prisma after the schema is valid.

Verification:

- `npx prisma validate`
- `npx prisma generate`
- Migration SQL is present and reviewable.

## Step 5: Feature Gate Utility

Files:

- `src/lib/features.ts`
- `src/lib/features.test.ts`

Actions:

1. Add plan hierarchy:

   ```ts
   export type UserPlan = "free" | "pro" | "team";
   ```

2. Add feature definitions:

   ```ts
   export type FeatureName =
     | "aiRecommendations"
     | "smartAlerts"
     | "repoComparison"
     | "scoreTrends"
     | "unlimitedWatchlists"
     | "teamDashboard";
   ```

3. Implement:

   ```ts
   export function hasFeature(userPlan: string | null | undefined, featureName: FeatureName): boolean;
   export function meetsRequiredPlan(userPlan: string | null | undefined, requiredPlan: UserPlan): boolean;
   export function normalizePlan(plan: string | null | undefined): UserPlan;
   ```

Rules:

- Missing/unknown plan is `free`.
- `free` has MVP features only and returns `false` for Pro features.
- `pro` has all Sprint 3A/3B Pro features except `teamDashboard`.
- `team` has all Pro features and `teamDashboard`.
- Unknown feature returns `false`.

Tests:

- Free users cannot access Pro features.
- Pro users can access intelligence/discovery Pro features.
- Team users can access all features.
- Unknown plan downgrades to free.
- Unknown feature returns false.

Verification:

- `npm test -- src/lib/features.test.ts`

## Step 6: Plan and Quota Service

Files:

- `src/server/usage.ts`
- `src/server/usage.test.ts`

Actions:

1. Implement `getUsagePeriod(date = new Date())` returning strict `YYYY-MM`.
2. Implement AI usage helpers:

   ```ts
   export async function getAiRecommendationUsage(client, userId, date?)
   export async function canUseAiRecommendations(client, userId, date?)
   export async function incrementAiRecommendationUsage(client, userId, amount?, date?)
   ```

3. Implement alert limit helper:

   ```ts
   export async function canCreateAlert(client, userId)
   ```

4. Keep the service Prisma-compatible but test it with a fake client to avoid a live DB requirement.

Rules:

- AI default quota is `20` per `YYYY-MM`.
- UserSettings `aiQuota` overrides the default.
- Usage increments are recorded in `usage_logs` with feature `ai_recommendation`.
- Alert default max active count is `10`.
- UserSettings `maxAlerts` overrides the default.

Tests:

- `getUsagePeriod(new Date("2026-05-09T10:00:00Z")) === "2026-05"`
- Missing log returns used `0`.
- Existing count returns correct remaining quota.
- At quota returns `canUse: false`.
- Increment uses upsert with `increment`.
- Alert checker blocks at max count.

Verification:

- `npm test -- src/server/usage.test.ts`

## Step 7: ProGate UI Shell

Files:

- `src/components/pro/pro-gate.tsx`

Actions:

1. Implement:

   ```tsx
   type ProGateProps = {
     userPlan?: string | null;
     requiredPlan?: "pro" | "team";
     featureName?: FeatureName;
     fallback?: React.ReactNode;
     children: React.ReactNode;
   };
   ```

2. Use `hasFeature` when `featureName` is provided.
3. Use `meetsRequiredPlan` when only `requiredPlan` is provided.
4. Render children directly when allowed.
5. Render optional `fallback` when blocked and provided.
6. Otherwise render a shadcn-style card shell:

   - Blurred/disabled preview area.
   - Overlay with required plan badge.
   - Upgrade CTA button.

Verification:

- Component compiles.
- Uses existing `Button`, `Badge`, and `Card`.

## Step 8: Final Verification

Commands:

```powershell
npm test
npx prisma validate
npx prisma generate
npm run lint
npm run build
```

Expected result:

- All unit tests pass.
- Prisma schema validates and client generation succeeds.
- Next lint/build complete without type errors.

## Implementation Order

1. Create plan and commit it.
2. Install dependencies.
3. Add failing feature/usage tests.
4. Implement feature and usage services.
5. Add shadcn/ui primitives.
6. Add Auth.js files and environment template updates.
7. Extend Prisma schema and generate migration.
8. Add ProGate.
9. Run full verification.
10. Commit implementation.
