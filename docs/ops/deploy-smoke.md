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

Expected outcomes:

- Public discovery endpoints return `200`.
- Cron returns `200` when called with a valid `CRON_SECRET`.
- Cron may return `401` when called without a secret; this still confirms the route is deployed and protected.

For GitHub ingestion after a deployment:

```powershell
bun run qa:github:ingest -- --base-url https://your-production-url --repo owner/repo --ops-api-key $env:OPS_API_KEY
```
