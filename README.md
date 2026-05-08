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

Install dependencies:

```powershell
npm install
```

Run the test suite:

```powershell
npm test
```

Validate the Prisma schema:

```powershell
npm run prisma:validate
```

Run the local development server:

```powershell
npm run dev
```

Open `http://localhost:3000`.

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
- Seed-backed service boundaries for the first product flow.
- PostgreSQL Prisma schema for core entities.
- Local UI for browsing discovery results, issues, and score details.

Out of scope:

- Billing and plan enforcement.
- Team dashboards and organization workflows.
- AI recommendations.
- Live GitHub sync or OAuth.
- Slack, Discord, email, and webhook alert delivery.
- Bounty and hackathon modules.
- Public API key management.
