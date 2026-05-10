# Private Beta Readiness Design

## Goal

Prepare ContribRadar for private beta by giving operators a readable production health surface and a concrete beta acceptance checklist.

## Scope

- Add an `/ops` page for operators to inspect recent alert delivery cron runs.
- Keep `OPS_API_KEY` as the authorization boundary; operators enter it in the browser and it is sent only to the existing protected ops API.
- Show run status, timing, duration, counts, failures, and recent delivery attempts.
- Document private beta entry criteria, smoke checks, and rollback steps.

## Non-Goals

- Billing integration.
- New visual design tooling.
- New GitHub ingestion pipeline.
- Sentry or log-drain provider setup.

## Architecture

The existing `GET /api/ops/cron-runs` endpoint remains the source of truth. A client-side `/ops` dashboard asks the operator for `OPS_API_KEY`, fetches recent runs with a bearer token, and renders shadcn/ui-compatible cards and tables.

No secret is embedded in the page. The dashboard has no write actions.

## Testing

- Unit-test formatting helpers for statuses, dates, durations, and summary counts.
- Keep existing ops API tests as the authorization contract.
- Run full unit tests, typecheck, and production build before PR.
