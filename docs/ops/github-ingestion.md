# GitHub Ingestion Runbook

Use this runbook to manually load live GitHub repository and issue data into the production PostgreSQL database.

## Environment

Required:

- `OPS_API_KEY`
- `DATABASE_URL`

Optional but recommended:

- `GITHUB_TOKEN`
- `GITHUB_INGEST_REPOS`

`GITHUB_TOKEN` is used only server-side by the ingestion endpoint. Public repositories can be ingested without it, but unauthenticated GitHub API limits are low.

`GITHUB_INGEST_REPOS` is a comma-separated or newline-separated list used by the scheduled ingestion cron. Keep it to 10 repositories or fewer.

## Manual Ingestion

PowerShell:

```powershell
$body = @{ repositories = @("owner/repo") } | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://contribradar.vercel.app/api/ops/ingest-github" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $env:OPS_API_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Multiple repositories can be sent in one request, up to 10:

```powershell
$body = @{ repositories = @("vercel/next.js", "prisma/prisma") } | ConvertTo-Json
```

Expected response:

```json
{
  "repositories": [
    {
      "repository": "owner/repo",
      "status": "succeeded",
      "issuesUpserted": 20,
      "readinessScore": 45.5
    }
  ],
  "totals": {
    "requested": 1,
    "succeeded": 1,
    "failed": 0,
    "issuesUpserted": 20
  }
}
```

## End-to-End QA

After a deployment, verify that ingestion writes to the database and the ingested data appears through public discovery APIs:

```powershell
bun run qa:github:ingest -- --base-url https://contribradar.vercel.app --repo vercel/next.js --ops-api-key $env:OPS_API_KEY
```

The script checks:

- `POST /api/ops/ingest-github`
- `GET /api/v1/discover/repos?limit=100`
- `GET /api/v1/discover/issues?limit=100`

Expected outcomes:

- GitHub ingestion returns `200`.
- At least one requested repository appears in repository discovery.
- Issue discovery returns DB-backed issues after ingestion.

## Scheduled Ingestion

Vercel Cron calls:

```text
GET /api/cron/ingest-github
```

The route uses `CRON_SECRET`, `GITHUB_TOKEN`, and `GITHUB_INGEST_REPOS`.

Example Vercel env value:

```text
GITHUB_INGEST_REPOS=vercel/next.js,prisma/prisma
```

Manual cron check:

```powershell
Invoke-RestMethod `
  -Uri "https://contribradar.vercel.app/api/cron/ingest-github" `
  -Headers @{ Authorization = "Bearer $env:CRON_SECRET" }
```

If `GITHUB_INGEST_REPOS` is empty, the cron returns `200` with `skipped: true` and does not call GitHub.

Scheduled ingestion writes a durable `cron_runs` record named `ingest-github`. In `/ops`, `usersChecked` represents repositories requested, `alertsCreated` represents issues upserted, and `failures` represents failed repositories.

## Notes

- The first ingestion slice upserts repository metadata and open GitHub issues.
- Pull requests returned by GitHub's issues endpoint are ignored.
- Readiness scores are deterministic and based on the available GitHub fields. Deep metrics such as CI pass rate, README length, maintainer response time, and contributors are intentionally left conservative until a later enrichment pass.
- This endpoint does not delete database issues that no longer appear in GitHub's first page of open issues.
