# Private Beta Runbook

Use this runbook before inviting private beta users and after each beta-facing deployment.

## Entry Criteria

- Production deploy is green on Vercel.
- Production database migrations have been applied with `bunx prisma migrate deploy`.
- `bun run qa:smoke -- --base-url https://contribradar.vercel.app --cron-secret <CRON_SECRET>` passes.
- GitHub login works with the production OAuth callback.
- `/ops` loads recent cron history with the current `OPS_API_KEY`.
- At least one operator knows how to rotate `CRON_SECRET` and `OPS_API_KEY`.

## Operator Dashboard

Open:

```text
https://contribradar.vercel.app/ops
```

Enter the current `OPS_API_KEY` from Vercel Environment Variables and load runs.

Healthy private beta state:

- Most recent `deliver-alerts` run is `Succeeded`.
- `Failures` is `0` or has a clear known reason.
- Delivery attempt failures are explainable by missing user preferences, test webhooks, or provider sandbox limits.
- No repeated failed runs after a redeploy.

## Beta Smoke

Run these checks before sending an invite:

- Visit the production homepage.
- Login with GitHub.
- Confirm repository discovery loads.
- Confirm issue discovery loads.
- Create or view a watchlist while authenticated.
- Trigger production smoke from PowerShell:

```powershell
bun run qa:smoke -- --base-url https://contribradar.vercel.app --cron-secret "<CRON_SECRET>"
```

- Open `/ops`, load runs with `OPS_API_KEY`, and confirm the smoke-created cron run is visible.

## Go / No-Go

Go:

- Smoke passes.
- Login works.
- `/ops` shows recent successful cron history.
- No production 5xx spike in Vercel logs.

No-go:

- Auth callback fails.
- `qa:smoke` fails.
- Production DB migration is pending or failed.
- `/api/ops/cron-runs` returns unauthorized with the known current key.
- Cron has repeated failed runs without a known external-provider cause.

## Rollback

1. Use Vercel Instant Rollback to restore the previous stable deployment.
2. Re-run production smoke.
3. Open `/ops` and confirm cron history is still readable.
4. Do not rollback a migration unless a written database rollback plan exists.
