# Launch Plan

This is the owner-operated launch sequence for ContribRadar v1.0.0. Steps that require external credentials must be run by the project owner or by an operator with access to the relevant provider accounts.

## 1. Vercel Project

1. Create a Vercel project from the GitHub repository.
2. Set framework preset to Next.js.
3. Confirm production branch is `master`.
4. Confirm `vercel.json` is detected and shows the `/api/cron/deliver-alerts` and `/api/cron/ingest-github` crons.
5. Enable Vercel Web Analytics from the Vercel project dashboard.

Reference: [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)

## 2. Production PostgreSQL

Use one production PostgreSQL provider:

- Vercel Postgres or Vercel Marketplace Postgres integration
- Supabase
- Railway

Required:

- Connection string must be stored as `DATABASE_URL`.
- Database must allow Prisma migrations from the deployment operator environment.
- Production data import must include repositories, issues, score logs, and any launch users/settings needed for smoke tests.

## 3. Environment Variables

Set these on the Vercel production environment:

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
- `OPS_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `GITHUB_TOKEN` if scheduled ingestion will call GitHub regularly
- `GITHUB_INGEST_REPOS` if scheduled ingestion should run against launch repositories
- `SENTRY_DSN` if Sentry is used

`AUTH_URL` must exactly match the production origin.

## 4. GitHub OAuth

In the GitHub OAuth app:

```text
Homepage URL: <AUTH_URL>
Authorization callback URL: <AUTH_URL>/api/auth/callback/github
```

## 5. Migration

Run from a trusted operator machine or CI job with production `DATABASE_URL`:

```powershell
bunx prisma migrate deploy
bunx prisma generate
```

Do not run `prisma db push` in production.

## 6. Deploy

Use Git push trigger or Vercel CLI. Preferred path:

1. Merge the final release PR to `master`.
2. Let Vercel deploy from GitHub.
3. Confirm build success.
4. Confirm cron is active in Vercel Project Settings.

## 7. Smoke

Run:

```powershell
bun run qa:smoke -- --base-url <production-url> --cron-secret <CRON_SECRET>
```

For at least one launch repository, run:

```powershell
bun run qa:github:ingest -- --base-url <production-url> --repo <owner/repo> --ops-api-key <OPS_API_KEY>
```

Then complete:

```text
docs/ops/final-release-checklist.md
```

## 8. Release Tag

Only after production smoke passes, follow:

```text
docs/ops/release-tagging.md
```
