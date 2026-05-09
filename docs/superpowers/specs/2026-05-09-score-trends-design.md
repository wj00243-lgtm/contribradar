# Sprint 3B-3B: Score Trends and Watchlist Limits Design

## Scope

This slice completes Sprint 3B discovery polish with score trends and watchlist limit enforcement.

Included:

- 30-day score trend service from `score_logs`-style data.
- Significant score change annotation when delta is greater than 5 points.
- Pro-only score trend API and dashboard panel.
- Free watchlist limits:
  - 3 watchlists per user.
  - 20 repos per watchlist.
- Pro users keep unlimited watchlists in the MVP in-memory service.

Excluded:

- Charting library dependency.
- Background score recalculation.
- DB-backed watchlist rewrite.
- Billing upgrade flow.

## Architecture

The score trend slice uses a server service with a Prisma-compatible client and fake-client tests. The API uses route-handler files to satisfy Next App Router export rules. The UI shell renders a lightweight line-style trend with CSS and text annotations rather than adding Recharts in this PR.

Watchlist limit enforcement stays inside `src/server/watchlists.ts`, preserving the existing seed-data MVP architecture.

## Behavior

- `GET /api/v1/discover/repos/[owner]/[repo]/score/trend` returns repo metadata, 30-day points, and annotations.
- Free users can create at most 3 watchlists.
- Free watchlists store at most 20 repository ids.
- Pro/team users are not limited by the free watchlist count or repo cap.

## Testing

Tests cover:

- score trend point ordering and 30-day filtering.
- annotation for score delta greater than 5.
- not-found response.
- free watchlist count limit.
- free repo cap and pro unlimited behavior.
