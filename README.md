# ContribRadar Core MVP

ContribRadar is a contribution intelligence layer for GitHub repositories. This MVP focuses on deterministic readiness scoring, explainable repository discovery, issue discovery, and basic watchlist APIs.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS
- Vitest
- Prisma with PostgreSQL provider
- Zod

## Local Setup

Prerequisites:

- Node.js with npm installed and available on `PATH`.

Install dependencies:

```powershell
npm install
```

Run the test suite:

```powershell
npm test
```

Validate the Prisma schema:

Copy the example environment file and set `DATABASE_URL` to a PostgreSQL connection string first:

```powershell
Copy-Item .env.example .env
```

```powershell
npm run prisma:validate
```

Run the local development server:

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Data Sources

The current UI and API discovery flow reads from in-repo seed data in `src/data/seed.ts`. Watchlists are stored in memory for the running process.

PostgreSQL and Prisma are included in this MVP for schema validation and optional seed support, but the local dashboard does not require seeded PostgreSQL data yet.

## Useful Verification Commands

Run type checking:

```powershell
npm run typecheck
```

Build the app:

```powershell
npm run build
```

## MVP Scope

Included:

- Repository discovery with filters.
- Deterministic repository readiness scoring.
- Deterministic issue readiness scoring.
- Explainability breakdowns for scoring signals.
- Basic watchlist APIs.
- Seed-backed service boundaries for the first product flow using in-repo data.
- PostgreSQL Prisma schema for core entities and optional seed support.
- Local UI for browsing discovery results, issues, and score details.

Out of scope:

- Billing and plan enforcement.
- Team dashboards and organization workflows.
- AI recommendations.
- Live GitHub sync or OAuth.
- Slack, Discord, email, and webhook alert delivery.
- Bounty and hackathon modules.
- Public API key management.
