# ContribRadar

ContribRadar is a contribution intelligence layer for GitHub repositories. It helps contributors discover high-readiness repositories, track watchlists, generate Pro AI recommendations, and monitor smart contribution alerts.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS
- Vitest
- Prisma with PostgreSQL provider
- Zod
- Auth.js v5 with GitHub OAuth
- shadcn/ui-compatible components

## Local Setup

Prerequisites:

- Node.js with npm installed and available on `PATH`.

Install dependencies:

```powershell
npm install
```

Run the test suite:

```powershell
bun test
```

Validate the Prisma schema:

Copy the example environment file and set `DATABASE_URL` to a PostgreSQL connection string first:

```powershell
Copy-Item .env.example .env
```

```powershell
bunx prisma validate
```

Run the local development server:

```powershell
bun run dev
```

Open `http://localhost:3000`.

## Environment

Copy the example environment file and fill in the values:

```powershell
Copy-Item .env.example .env
```

Required for production:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`

Required for AI recommendations:

- `OPENAI_API_KEY`

Validate required production variables:

```powershell
bun run qa:env
```

## Data Sources

Production API routes use Prisma-backed persistence for repository discovery and watchlist CRUD. Development and test runs may fall back to in-repo seed data in `src/data/seed.ts` so the UI remains usable without a local database.

PostgreSQL and Prisma provide the production schema for users, alerts, usage logs, settings, contributions, repositories, issues, and score logs.

Persistence mode:

- `NODE_ENV=production`: database-backed services only.
- non-production: database-backed services with seed fallback where needed.

Production migration:

```powershell
bunx prisma migrate deploy
bunx prisma generate
```

Optional staging seed:

```powershell
bunx tsx prisma/seed.ts
```

## Useful Verification Commands

Run type checking:

```powershell
bun run typecheck
```

Build the app:

```powershell
bun run build
```

Production readiness checklist:

```text
docs/qa/sprint-3-production-readiness.md
```

## Current Scope

Included:

- Repository discovery with filters.
- Deterministic repository readiness scoring.
- Deterministic issue readiness scoring.
- Explainability breakdowns for scoring signals.
- Watchlist APIs with Free/Pro limits.
- GitHub OAuth foundation.
- Pro feature gates.
- AI recommendations with monthly usage tracking.
- Smart alerts and notification center.
- Advanced discovery comparison and filters.
- Score trend API and panel.
- Seed-backed service boundaries for the first product flow using in-repo data.
- PostgreSQL Prisma schema for core and Pro entities.
- Local UI for browsing discovery results, issues, and score details.

Out of scope:

- Billing checkout.
- Team dashboards and organization workflows.
- Live GitHub repository sync.
- Slack, Discord, email, and webhook delivery.
- Background alert scheduler.
- Bounty and hackathon modules.
- Public API key management.
