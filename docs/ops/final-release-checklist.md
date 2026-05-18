# Final Release Checklist

Use this checklist before the first production launch and before major Pro feature releases.

## Code Verification

- [ ] `bun test`
- [ ] `bun run typecheck`
- [ ] `bun run build`
- [ ] `bun run qa:env`
- [ ] `bun run qa:launch`
- [ ] `bunx prisma validate`
- [ ] `bunx prisma generate`

## Environment

- [ ] `DATABASE_URL` points to production PostgreSQL.
- [ ] `AUTH_SECRET` is a strong generated secret.
- [ ] `AUTH_URL` exactly matches the production origin.
- [ ] GitHub OAuth callback is `<AUTH_URL>/api/auth/callback/github`.
- [ ] `GEMINI_API_KEY` is set for AI recommendations.
- [ ] `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set for email delivery.
- [ ] `SLACK_WEBHOOK_URL` is set for Slack alert delivery.
- [ ] `CRON_SECRET` is set and at least 16 random characters.
- [ ] `OPS_API_KEY` is set and stored only in the operator password manager / Vercel env.
- [ ] `GITHUB_TOKEN` is set if scheduled ingestion will call GitHub regularly.
- [ ] `GITHUB_INGEST_REPOS` is set to 10 or fewer `owner/repo` values, or intentionally left empty for no-op scheduled ingestion.
- [ ] `SENTRY_DSN` is set if Sentry is enabled.

## Database

- [ ] Run `bunx prisma migrate deploy`.
- [ ] Run `bunx prisma generate`.
- [ ] Import or seed initial repository, issue, score log, and staging user data.
- [ ] Confirm demo users are not present in production unless explicitly intended.
- [ ] Confirm `users`, `repositories`, `issues`, `watchlists`, `alerts`, `usage_logs`, `user_settings`, `contributions`, and `score_logs` exist.

## Product Smoke

- [ ] GitHub login succeeds.
- [ ] Repository discovery returns DB-backed results.
- [ ] Issue discovery returns DB-backed results.
- [ ] GitHub ingestion QA passes for at least one launch repository: `bun run qa:github:ingest -- --base-url <production-url> --repo <owner/repo> --ops-api-key <OPS_API_KEY>`.
- [ ] Watchlist create requires authentication.
- [ ] AI recommendations work for a Pro user and are blocked for Free users.
- [ ] Smart alerts create DB-backed alert rows.
- [ ] Score trends load for Pro users.
- [ ] Resend and Slack delivery attempts are reported by the cron endpoint.

## Deployment Smoke

- [ ] Run `bun run qa:smoke -- --base-url <production-url> --cron-secret <CRON_SECRET>`.
- [ ] Vercel Cron is visible in Project Settings.
- [ ] Vercel Cron logs show `GET /api/cron/deliver-alerts`.
- [ ] Vercel Cron logs show `GET /api/cron/ingest-github` or the route returns `skipped: true` when `GITHUB_INGEST_REPOS` is empty.
- [ ] Runtime logs contain structured JSON events for cron failures.
- [ ] `OPS_API_KEY` is set and `GET /api/ops/cron-runs` returns recent cron history.
- [ ] `/ops` loads recent cron history with the current `OPS_API_KEY`.
- [ ] Vercel Web Analytics is enabled and records a production page view.
- [ ] Log Drain or Sentry integration is configured if required for launch.
- [ ] Error tracking test event is visible in the monitoring provider if Sentry is enabled.
- [ ] Review `docs/ops/security-hardening.md` before changing auth, JSON write paths, or external API adapters.
- [ ] Review `docs/ops/private-beta.md` before inviting private beta users.

## Release Tag

- [ ] Confirm this checklist is complete.
- [ ] Confirm production smoke passes.
- [ ] Create and push `v1.0.0` from updated `master`.
- [ ] Confirm GitHub shows the `v1.0.0` tag.

## Rollback

- [ ] Know the previous stable deployment id.
- [ ] Confirm Prisma migrations are backward compatible before rollback.
- [ ] If rollback is required, use Vercel Instant Rollback and then re-check active cron settings.
- [ ] Re-run deploy smoke after rollback.
