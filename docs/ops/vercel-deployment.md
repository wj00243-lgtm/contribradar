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

`AUTH_URL` must exactly match the deployed origin. The GitHub OAuth callback must be:

```text
<AUTH_URL>/api/auth/callback/github
```

## Cron

`vercel.json` schedules this endpoint daily at 08:00 UTC:

```text
GET /api/cron/deliver-alerts
```

The route uses DB-backed smart alerts and delivery preferences. When `CRON_SECRET` is set, manual calls must include:

```text
Authorization: Bearer <CRON_SECRET>
```

When the Vercel project has a `CRON_SECRET` environment variable, Vercel automatically sends it as the bearer `Authorization` header for cron invocations. Cron schedules run in UTC.

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
