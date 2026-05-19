# Vercel Deployment Runbook

## Required Environment

Set these variables in the Vercel project before deploying production:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SLACK_WEBHOOK_URL`
- `CRON_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `OPS_API_KEY`

Optional for scheduled GitHub ingestion:

- `GITHUB_TOKEN`
- `GITHUB_INGEST_REPOS`

`AUTH_URL` must exactly match the deployed origin. The GitHub OAuth callback must be:

```text
<AUTH_URL>/api/auth/callback/github
```

## Cron

`vercel.json` schedules alert delivery daily at 08:00 UTC:

```text
GET /api/cron/deliver-alerts
```

The route uses DB-backed smart alerts and delivery preferences. When `CRON_SECRET` is set, manual calls must include:

`vercel.json` also schedules GitHub ingestion daily at 09:00 UTC:

```text
GET /api/cron/ingest-github
```

This route is a no-op unless `GITHUB_INGEST_REPOS` is set.

```text
Authorization: Bearer <CRON_SECRET>
```

When the Vercel project has a `CRON_SECRET` environment variable, Vercel automatically sends it as the bearer `Authorization` header for cron invocations. Cron schedules run in UTC.

Cron endpoints fail closed in production when `CRON_SECRET` is missing. Set the variable before relying on Vercel Cron or production smoke checks.

References:

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs/)
- [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

## Deploy Order

1. Set production environment variables.
2. Run `bunx prisma migrate deploy`.
3. Run `bunx prisma generate`.
4. Deploy the app.
5. Run `bun run qa:smoke -- --base-url <production-url> --cron-secret <CRON_SECRET>`.
6. Complete `docs/ops/final-release-checklist.md`.
