# ContribRadar Core MVP Design

Date: 2026-05-06
Source: `C:\Users\ferit\Desktop\ContribRadar_OpenHub_Pro_Stratejik_Plan.pdf`

## Summary

ContribRadar starts as a contribution intelligence layer on top of GitHub. The first release focuses on helping developers decide which open source repositories and issues are worth their time by combining discovery, deterministic readiness scoring, and clear explanations.

The MVP deliberately covers the first product layer only: repo discovery, issue discovery, readiness scoring, explainability, and basic watchlists. Pro, Team, bounty, hackathon, and monetization modules remain future expansion points, not first-sprint implementation scope.

## Product Goal

The product should reduce the time required to choose a contribution target. A developer should be able to filter repositories, inspect a score, understand why the score exists, and save promising repos or issues into a personal watchlist.

The first user journey is the beginner and early intermediate contributor:

- Selects interests such as language, topics, experience level, and weekly hours.
- Finds repos with high readiness scores and recent maintainer activity.
- Opens a score explanation instead of guessing from stars and labels.
- Saves repos and issues for later review.

## Non-Goals For MVP

- Team dashboards, mentor matching, SSO, and org-wide analytics.
- Stripe subscriptions and billing gates.
- AI-generated recommendations or AI digests.
- Slack, Discord, email, and webhook alert delivery.
- Bounty board, hackathon hub, sponsor matching, and public API key management.
- Full PR tracking and resume export.

These features should not be modeled into the first database migration unless they are required by the Core MVP. Keeping them out avoids locking early assumptions into the schema.

## Recommended Approach

Use a Core MVP with production-shaped boundaries:

- Next.js 15 App Router with TypeScript.
- Tailwind for styling.
- Prisma with PostgreSQL for persistent data.
- Deterministic scoring functions in a separate domain module.
- API routes or server actions for discovery and watchlist operations.
- Seeded GitHub-like data first, then GitHub API ingestion behind an adapter.

This approach keeps the system small enough to build correctly while preserving clear extension paths for Pro and Team modules.

## Architecture

The application has five main units:

1. Web UI
   - Discovery list and filters.
   - Repo score detail panel.
   - Issue discovery view.
   - Watchlist management.

2. API Layer
   - Validates query parameters and request bodies.
   - Calls services instead of embedding business logic in route handlers.
   - Returns stable response shapes that match the public API direction in the strategy document.

3. Domain Services
   - Discovery service for repository and issue search.
   - Scoring service for repo readiness and issue readiness.
   - Explainability service for turning scoring inputs into user-facing reasons.
   - Watchlist service for saved collections.

4. Data Layer
   - Prisma models for core entities only.
   - Repository functions or service-level Prisma access, depending on project size after scaffolding.
   - Seed data that resembles GitHub API payloads.

5. Ingestion Boundary
   - A GitHub adapter interface prepares for real GitHub API calls.
   - MVP can start with seeded data through the same normalized shape.
   - Background sync jobs are planned after the initial UI and scoring are stable.

## Core Domain Model

Initial tables:

- `users`: local user profile, GitHub identity fields, skill vector, experience level, weekly hours, and a simple plan enum without billing behavior.
- `repositories`: GitHub repo identity, metadata, topics, activity metrics, cached score fields, raw scoring metrics.
- `issues`: GitHub issue identity, labels, assignees, stale state, issue score inputs, cached issue readiness score.
- `watchlists`: user-owned saved search collections with JSON filters and digest preference.
- `watchlist_repos`: join table with notes.
- `alerts`: stored product alerts, initially read-only/generated internally.
- `score_logs`: score audit trail for explanation and trend history.

Deferred tables:

- `teams`, `team_members`, `subscriptions`, `bounties`, `hackathons`, `api_keys`, `webhooks`, `usage_logs`.

## Scoring Design

Scoring must be deterministic and explainable. AI must not decide the score.

Repository readiness score:

```text
readiness_score =
  0.30 * maintainer_responsiveness_score +
  0.25 * newcomer_friendly_score +
  0.20 * code_health_score +
  0.15 * community_activity_score +
  0.10 * documentation_score
```

Issue readiness score:

```text
issue_score =
  0.35 * clarity_score +
  0.25 * engagement_score +
  0.20 * recency_score +
  0.15 * assignee_score +
  0.05 * label_score
```

The scoring module should return both numeric output and explanation parts:

- Final score.
- Confidence value.
- Weighted breakdown.
- Raw evidence for each metric.
- Short explanation string.
- Warning flags such as stale issue, slow maintainer response, or weak documentation.

## API Surface

MVP endpoints should mirror the strategy document but stay narrow:

- `GET /api/v1/discover/repos`
  - Query: `language`, `topics`, `min_score`, `has_good_first_issue`, `last_active_within_days`, `sort`, `page`, `limit`.
  - Response: repo list, total, facets.

- `GET /api/v1/discover/repos/{owner}/{repo}/score`
  - Response: readiness score, confidence, breakdown, explanation, warnings.

- `GET /api/v1/discover/issues`
  - Query: `repo_id`, `labels`, `min_issue_score`, `is_stale`, `has_no_assignee`, `difficulty`, `page`, `limit`.
  - Response: issue list and total.

- `POST /api/v1/watchlists`
  - Creates a user watchlist from a name and filter set.

- `GET /api/v1/watchlists/{id}/repos`
  - Returns saved repos with applied filters.

Authentication can begin with a simple local user assumption in development. The app should keep the user boundary explicit so Auth.js GitHub OAuth can be added without rewriting domain logic.

## UI Design

The first UI should be an operational product screen, not a marketing landing page.

Primary screens:

- Discovery dashboard with filter controls and a sortable repo table or dense card list.
- Repo detail panel with readiness score, confidence, metric breakdown, explanation, and issues.
- Issue discovery view with issue readiness scores and labels.
- Watchlists view for saved collections.

The interface should feel like a focused developer tool: scan-friendly, restrained, and information-dense. Visual polish and richer mockups can be added after the core flow is working.

## Data Flow

1. Seed or ingest repository and issue data.
2. Normalize raw GitHub-like fields into database records.
3. Run scoring functions from raw metrics.
4. Save cached score values on repositories and issues.
5. Save score changes into `score_logs`.
6. Discovery endpoints query cached scores and filters.
7. UI renders score summaries and explanation details.
8. User saves repos into watchlists.

## Error Handling

- API routes return structured errors with stable `code`, `message`, and optional `details`.
- Invalid filters produce 400 responses with field-level detail.
- Missing repositories or watchlists produce 404 responses.
- Scoring functions must tolerate incomplete metrics and lower confidence rather than crashing.
- GitHub ingestion failures should be isolated from the user-facing discovery reads.

## Testing Strategy

Initial tests should cover high-risk logic:

- Repository readiness scoring with complete and incomplete metric sets.
- Issue readiness scoring with stale, assigned, and beginner-friendly examples.
- Explanation output includes the same weighted components used by the score.
- Discovery API response shape and filtering behavior.
- Watchlist creation validation.

UI tests can begin after the first screens exist. The first UI verification should ensure filters, score panel rendering, and watchlist save actions work.

## First Implementation Plan Scope

The next implementation plan should cover:

1. Scaffold Next.js, TypeScript, Tailwind, Prisma, and test tooling.
2. Add Prisma schema for core MVP tables.
3. Add seed data for representative repositories and issues.
4. Implement scoring domain functions and tests.
5. Implement discovery and score API routes.
6. Implement watchlist API routes.
7. Build the first discovery dashboard and score detail panel.
8. Add focused verification commands and document how to run locally.

## Open Decisions

- Whether development starts with PostgreSQL immediately or a local SQLite-compatible Prisma setup before switching to PostgreSQL.
- Whether GitHub OAuth is included in the first implementation plan or deferred until the core scoring flow is visible.
- Whether the initial UI uses shadcn/ui from the start or plain Tailwind components until component patterns stabilize.

Recommended defaults:

- Use PostgreSQL if a local database is already available; otherwise start with Prisma and a local development database path that can be switched cleanly.
- Defer full Auth.js until after the discovery and scoring flow works.
- Use plain Tailwind first unless shadcn/ui is required for the desired visual baseline.
