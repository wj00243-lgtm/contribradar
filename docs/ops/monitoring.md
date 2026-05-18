# Monitoring Runbook

## Vercel Analytics

Enable Web Analytics in the Vercel project dashboard after the production project is connected.

Recommended launch checks:

- Analytics tab is enabled for the production project.
- Production homepage receives page view data after first manual visit.
- Analytics does not expose sensitive user data in page URLs.

Reference: [Next.js on Vercel - Web Analytics](https://vercel.com/docs/frameworks/nextjs#web-analytics)

## Runtime Logs

The app emits structured JSON logs through `src/server/logger.ts`. Cron user-level failures use this event:

```text
cron.deliver_alerts.user_failed
```

In Vercel logs, filter by:

```text
requestPath:/api/cron/deliver-alerts
```

## Durable Cron History

Sprint 8 adds database-backed cron observability:

- `cron_runs` stores each `/api/cron/deliver-alerts` run with status, counts, duration, and failure summary.
- `cron_runs` also stores each `/api/cron/ingest-github` run. For ingestion runs, `usersChecked` means repositories requested and `alertsCreated` means issues upserted.
- `delivery_attempt_logs` stores per-channel delivery attempts for email and Slack.
- `GET /api/ops/cron-runs` returns the 10 most recent cron runs with recent delivery attempts.
- `/ops` provides a protected browser dashboard for operators with the current `OPS_API_KEY`.

Protect the ops endpoint with:

```text
OPS_API_KEY=<strong random value>
```

Ops endpoints fail closed when `OPS_API_KEY` is missing. A missing key returns `503 OPS_AUTH_NOT_CONFIGURED`; a wrong bearer token returns `401 OPS_UNAUTHORIZED`.

Manual check:

```powershell
Invoke-RestMethod -Headers @{ Authorization = "Bearer $env:OPS_API_KEY" } https://contribradar.vercel.app/api/ops/cron-runs
```

GitHub ingestion check:

```powershell
$body = @{ repositories = @("owner/repo") } | ConvertTo-Json
Invoke-RestMethod -Uri "https://contribradar.vercel.app/api/ops/ingest-github" -Method POST -Headers @{ Authorization = "Bearer $env:OPS_API_KEY"; "Content-Type" = "application/json" } -Body $body
```

Browser check:

```text
https://contribradar.vercel.app/ops
```

## Log Drains

For Pro or Enterprise Vercel projects, configure Log Drains when persistent external log retention is required.

Recommended drain scope:

- Schema: `log`
- Sources: runtime functions and build logs
- Environment: production
- Destination: Sentry, Datadog, Axiom, custom HTTPS endpoint, or another provider approved by the operator

Reference: [Vercel Drains](https://vercel.com/docs/observability/log-drains)

## Error Tracking

Sentry is optional for v1.0.0 but recommended before paid traffic.

Minimum setup:

- Create a Sentry project for Next.js.
- Store DSN as `SENTRY_DSN`.
- Connect Vercel integration or configure a log drain if available.
- Verify a test server error appears in the provider dashboard before launch.

Do not commit provider tokens or DSNs with secret values to the repository.

## Alerting Policy

Create alerts for:

- Build failures on `master`.
- Production 5xx spike.
- Cron failures for `/api/cron/deliver-alerts`.
- Gemini, Resend, or Slack delivery failure spikes.
- Database connection or migration failures.
