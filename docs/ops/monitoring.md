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

**Sentry is required for production deployments.**

It is required for all ContribRadar instances before launching to private beta users. Sentry provides:

- Real-time error grouping and deduplication
- Unhandled exception capture
- Cron failure alerting
- Delivery adapter retry and timeout tracking

### Setup

1. Create a Sentry project:
   - Go to [Sentry.io](https://sentry.io)
   - Create a new project for **Next.js**
   - Copy the DSN

2. Configure environment:
   ```bash
   SENTRY_DSN="https://examplePublicKey@o0.ingest.sentry.io/0"
   ```

3. Test error capture:
   ```bash
   # Simulate an error in a cron run
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://contribradar.vercel.app/api/cron/deliver-alerts?test-error=true
   ```

4. Verify in Sentry dashboard:
   - Check "Issues" tab
   - Confirm cron failure error appears with fingerprinting

### Monitored Events

- **Cron delivery failures**: `/api/cron/deliver-alerts` failures tagged with `cron_failure`
- **Email delivery failures**: Resend timeout or 5xx errors tagged with `delivery_channel:email`
- **Slack delivery failures**: Webhook failures tagged with `delivery_channel:slack`
- **Unhandled exceptions**: All uncaught errors and promise rejections

### Integration with Vercel

Sentry integrates with Vercel to capture runtime logs. Optional but recommended for full visibility:

1. Install [Vercel Sentry integration](https://vercel.com/integrations/sentry)
2. Connect the Sentry project to your Vercel project
3. Logs are automatically drained and deduplicated with errors

Do not commit SENTRY_DSN with secret values to the repository. Use Vercel environment variables for production.

## Alerting Policy

Create alerts for:

- Build failures on `master`.
- Production 5xx spike.
- Cron failures for `/api/cron/deliver-alerts`.
- Gemini, Resend, or Slack delivery failure spikes.
- Database connection or migration failures.
