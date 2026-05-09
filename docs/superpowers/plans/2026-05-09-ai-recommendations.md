# AI Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Sprint 3B-1 Pro AI recommendations backend/API/UI shell.

**Architecture:** Keep OpenAI transport, recommendation orchestration, API routing, and UI shell separate. The service accepts Prisma-compatible clients for fast tests and uses Sprint 3A quota/feature helpers.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Prisma, Auth.js v5, shadcn/ui, Vitest, OpenAI Chat Completions via `fetch`.

---

### Task 1: OpenAI JSON Client

**Files:**
- Create: `src/server/openai.ts`
- Test: `src/server/openai.test.ts`

- [ ] Write tests for request payload, missing key, and invalid JSON.
- [ ] Implement `OpenAiConfigurationError`, `OpenAiResponseError`, `generateJsonWithOpenAi`.
- [ ] Verify with `bun test src/server/openai.test.ts`.
- [ ] Commit with `feat: add openai json client`.

### Task 2: Recommendation Service

**Files:**
- Create: `src/server/recommendations.ts`
- Test: `src/server/recommendations.test.ts`

- [ ] Write tests for context building from skills, contributions, watchlists, and candidate repos.
- [ ] Write tests for quota blocking and successful usage increment.
- [ ] Implement typed context builder and `generateAiRepoRecommendations`.
- [ ] Verify with `bun test src/server/recommendations.test.ts`.
- [ ] Commit with `feat: add ai recommendation service`.

### Task 3: API Route and Prisma Singleton

**Files:**
- Create: `src/server/db.ts`
- Create: `src/app/api/v1/recommendations/route.ts`
- Test: `src/app/api/v1/recommendations/route.test.ts`

- [ ] Add Prisma singleton.
- [ ] Add POST route with auth, feature gate, quota errors, and OpenAI errors.
- [ ] Add route tests using injectable handlers where possible.
- [ ] Verify route tests.
- [ ] Commit with `feat: expose ai recommendations api`.

### Task 4: Pro Recommendation UI Shell

**Files:**
- Create: `src/components/recommendations/ai-recommendations-panel.tsx`
- Modify: `src/app/page.tsx`

- [ ] Add client panel with generate button, quota meter, loading, error, empty, and result states.
- [ ] Wrap it in `ProGate`.
- [ ] Render it on the dashboard page without changing discovery behavior.
- [ ] Verify build and typecheck.
- [ ] Commit with `feat: add ai recommendations panel`.

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
