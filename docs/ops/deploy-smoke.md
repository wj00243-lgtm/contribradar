# Deploy Smoke Runbook

Use the deploy smoke script after deploying production or staging.

```powershell
bun run qa:smoke -- --base-url https://your-production-url --cron-secret $env:CRON_SECRET
```

For local checks where the cron route should not run:

```powershell
bun run qa:smoke -- --base-url http://localhost:3000 --skip-cron
```

The script checks:

- `GET /api/v1/discover/repos`
- `GET /api/v1/discover/issues`
- `GET /api/cron/deliver-alerts`
- `GET /api/cron/ingest-github`

Expected outcomes:

- Public discovery endpoints return `200`.
- Cron returns `200` when called with a valid `CRON_SECRET`.
- Cron returns `401` for a wrong bearer token and `503 CRON_AUTH_NOT_CONFIGURED` if `CRON_SECRET` is missing in production.
- GitHub ingestion cron may return `200` with `skipped: true` when `GITHUB_INGEST_REPOS` is empty.

For GitHub ingestion after a deployment:

```powershell
bun run qa:github:ingest -- --base-url https://your-production-url --repo owner/repo --ops-api-key $env:OPS_API_KEY
```
