# Final Release Checklist

Use this checklist before the first production launch and before major Pro feature releases.

## Code Verification

- [ ] `bun test`
- [ ] `bun run typecheck`
- [ ] `bun run build`
- [ ] `bun run qa:env`
- [ ] `bunx prisma validate`
- [ ] `bunx prisma generate`

## Environment

- [ ] `DATABASE_URL` points to production PostgreSQL.
- [ ] `AUTH_SECRET` is a strong generated secret.
- [ ] `AUTH_URL` exactly matches the production origin.
- [ ] GitHub OAuth callback is `<AUTH_URL>/api/auth/callback/github`.
- [ ] `OPENAI_API_KEY` is set for AI recommendations.
- [ ] `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set for email delivery.
- [ ] `SLACK_WEBHOOK_URL` is set for Slack alert delivery.
- [ ] `CRON_SECRET` is set and at least 16 random characters.

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
- [ ] Watchlist create requires authentication.
- [ ] AI recommendations work for a Pro user and are blocked for Free users.
- [ ] Smart alerts create DB-backed alert rows.
- [ ] Score trends load for Pro users.
- [ ] Resend and Slack delivery attempts are reported by the cron endpoint.

## Deployment Smoke

- [ ] Run `bun run qa:smoke -- --base-url <production-url> --cron-secret <CRON_SECRET>`.
- [ ] Vercel Cron is visible in Project Settings.
- [ ] Vercel Cron logs show `GET /api/cron/deliver-alerts`.
- [ ] Runtime logs contain structured JSON events for cron failures.

## Rollback

- [ ] Know the previous stable deployment id.
- [ ] Confirm Prisma migrations are backward compatible before rollback.
- [ ] If rollback is required, use Vercel Instant Rollback and then re-check active cron settings.
- [ ] Re-run deploy smoke after rollback.
