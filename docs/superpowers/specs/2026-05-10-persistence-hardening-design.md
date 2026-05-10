# Sprint 4: Persistence Hardening Design

## Scope

Sprint 4 moves ContribRadar from seed-backed runtime services toward DB-backed production behavior.

Included:

- Watchlist services become Prisma-backed CRUD.
- Discovery repository queries become Prisma-backed by default.
- Development can still use seed data as a fallback.
- Production must not silently depend on seed data.
- Migration and cutover strategy is documented.

Excluded:

- Email, Slack, scheduler, or delivery adapters.
- Live GitHub sync.
- Billing checkout.
- Background import workers.

## Architecture

Persistence hardening introduces repository adapters rather than replacing UI components directly:

- `src/server/repository-mappers.ts` maps Prisma records into domain types.
- `src/server/discovery-db.ts` owns DB-backed repository discovery.
- `src/server/watchlists-db.ts` owns DB-backed watchlist CRUD.
- Existing seed-backed services stay available for development fallback.
- API routes choose DB-backed services in production and DB-first behavior in development.

## Environment Behavior

- `NODE_ENV=production`: DB-backed services only. Missing DB data returns empty results or not found; seed fallback is disabled.
- `NODE_ENV=development`: DB-backed services are preferred where a Prisma client is available, but seed-backed services can remain useful for local UI work.
- Tests use fake Prisma-compatible clients where possible.

## Migration Strategy

Production cutover:

1. Run `prisma migrate deploy`.
2. Run controlled import or seed for initial repository data.
3. Verify repository, issue, score log, user, settings, watchlist, and watchlist repo tables.
4. Run API smoke checks against DB-backed discovery and watchlist routes.
5. Disable reliance on in-memory watchlists for production.

## Success Criteria

- Watchlist create/read APIs persist through Prisma-compatible clients.
- Discovery queries can return repository results from Prisma records.
- Tests cover DB mappers, DB discovery filters, and DB watchlist CRUD.
- Existing seed-backed unit tests continue to pass.
