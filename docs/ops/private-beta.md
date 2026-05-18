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
- For Pro testers, complete `docs/ops/ai-beta-validation.md`.

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

## Provisioning Beta Users

Before inviting, assign the correct plan in production:

```powershell
$env:DATABASE_URL='<production-connection-string>'
bun run ops:user:plan -- --user="<github_id-or-email-or-user-id>" --plan=pro
bun run ops:user:plan -- --user="<github_id-or-email-or-user-id>" --plan=pro --apply
```

Track invited users in `docs/ops/beta-users.md`.

## Feedback Channel

Choose and document one primary channel before sending invites:

| Channel | Best For | Setup Effort |
|---|---|---|
| **GitHub Discussions** | Public repos, async, searchable | Low |
| **Discord** | Real-time, community building | Medium |
| **Email** | Minimal friction, private | Low |

Minimum viable loop:
1. Provide a short feedback template (what did you try, what happened, what did you expect).
2. Review feedback weekly during beta.
3. Acknowledge within 48 hours; close the loop within 7 days.
4. Triage items as `bug`, `feature-request`, `ux-improvement`, or `docs`.

## Support Escalation

| Level | Contact | Response Time | Handles |
|---|---|---|---|
| L1 | Owner email | 24h | General questions, auth issues |
| L2 | Owner email | 48h | Pro feature bugs, data issues |
| L3 | — | — | Production incidents (Vercel/DB provider) |

## Rollback

1. Use Vercel Instant Rollback to restore the previous stable deployment.
2. Re-run production smoke.
3. Open `/ops` and confirm cron history is still readable.
4. Do not rollback a migration unless a written database rollback plan exists.

## Beta Exit Criteria

Before moving from private beta to public:

- [ ] At least 5 active beta users with sustained usage.
- [ ] No critical bugs unaddressed for 7+ days.
- [ ] Cron delivery success rate > 95% over the last 14 days.
- [ ] AI recommendation quota and feature gates validated with real Pro users.
- [ ] Feedback volume has slowed; major themes documented.
- [ ] Public onboarding docs and FAQ are ready.
