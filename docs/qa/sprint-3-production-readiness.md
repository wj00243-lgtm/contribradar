# Sprint 3 Production Readiness

Date: 2026-05-09

## Verification Gate

Run these before opening a release PR or deploying:

```powershell
bun test
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma validate
$env:DATABASE_URL='postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public'; bunx prisma generate
bun run typecheck
bun run build
bun run qa:env
node scripts/deploy-smoke.mjs --help
```

Expected:

- Tests pass.
- Prisma validates and generates.
- TypeScript passes.
- Next build passes.
- `qa:env` reports required production variables.
- Deploy smoke script starts and prints usage.

## Environment Checklist

Required for production:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`

Required for AI recommendations:

- `GEMINI_API_KEY`

Required for alert delivery:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SLACK_WEBHOOK_URL`
- `CRON_SECRET`

Recommended manual checks:

- `AUTH_URL` exactly matches the deployed app origin.
- GitHub OAuth callback is configured as `<AUTH_URL>/api/auth/callback/github`.
- `AUTH_SECRET` is generated from a strong random source.
- `DATABASE_URL` points at the intended production PostgreSQL database.
- Vercel Cron is configured from `vercel.json`.
- `CRON_SECRET` is set so Vercel sends `Authorization: Bearer <CRON_SECRET>` to cron invocations.

## Database Checklist

Before deploy:

```powershell
bunx prisma migrate deploy
bunx prisma generate
```

For a new staging database:

```powershell
bunx tsx prisma/seed.ts
```

Smoke checks:

- Repository rows exist.
- Demo user exists only in staging/local environments.
- `usage_logs`, `user_settings`, `contributions`, `alerts`, and `score_logs` tables exist.
- Watchlists persist through `watchlists` and `watchlist_repos`.
- Repository discovery APIs return DB rows in production.
- Issue discovery API returns DB rows and does not use seed fallback.
- Anonymous watchlist create/read API calls return `401 AUTH_REQUIRED`.
- Watchlist ownership is derived from `session.user.id`, not request body `userId`.
- Alert delivery cron uses DB-backed alerts and does not use seed fallback.
- Users with `UserSettings.alertPreferences.email=true` receive Resend email delivery when configured.
- Users with `UserSettings.alertPreferences.slack=true` receive Slack webhook delivery when configured.
- Development/test seed fallback is not used in production.

## Persistence Cutover Checklist

- Run `bunx prisma migrate deploy`.
- Run `bunx prisma generate`.
- Import or seed initial repository, issue, and score log data.
- Confirm `NODE_ENV=production` is set in the deployment environment.
- Call `GET /api/v1/discover/repos` and confirm results come from the database.
- Call `GET /api/v1/discover/issues` and confirm results come from the database.
- Create a watchlist while authenticated and confirm rows exist in `watchlists` and `watchlist_repos`.
- Call watchlist create/read routes without a session and confirm `401 AUTH_REQUIRED`.
- Call `GET /api/cron/deliver-alerts` with an invalid bearer token and confirm `401 CRON_UNAUTHORIZED`.
- Call `GET /api/cron/deliver-alerts` with the correct bearer token and confirm delivery attempts are reported.
- Run `bun run qa:smoke -- --base-url <production-url> --cron-secret <CRON_SECRET>`.
- Restart the app and confirm the created watchlist is still available.

## Manual Product Smoke

### Auth

- Open the app.
- Click Login.
- Complete GitHub OAuth.
- Confirm the session returns to the dashboard.
- Confirm Logout clears the session.

### AI Recommendations

- Use a Pro user.
- Set `GEMINI_API_KEY`.
- Click Generate recommendations.
- Confirm usage meter increments.
- Confirm a Free user sees the ProGate overlay.

### Smart Alerts

- Use a Pro user with watchlists.
- Click Check alerts.
- Confirm new alerts appear.
- Mark an unread alert read.
- Confirm unread count decreases.
- Enable email and Slack alert preferences in `user_settings`.
- Trigger the delivery cron with `CRON_SECRET`.
- Confirm Resend and Slack attempts are reported by the cron response.

### Advanced Discovery

- Use a Pro user.
- Apply license, last commit, and contributor filters.
- Select 2-3 repositories for comparison.
- Confirm comparison columns render.

### Score Trends

- Use a Pro user.
- Select a repository with score logs.
- Confirm the trend panel loads.
- Confirm significant annotations appear for score deltas greater than 5.

### Watchlist Limits

- Free user:
  - Can create up to 3 watchlists.
  - Watchlist repository ids are capped at 20.
- Pro user:
  - Can create more than 3 watchlists.
  - Watchlist repository ids are uncapped in the MVP service.
- Anonymous API callers:
  - Cannot create watchlists.
  - Cannot read watchlist repositories.

## Known Follow-Ups

- Add provider-specific rollback screenshots after first production deploy.
