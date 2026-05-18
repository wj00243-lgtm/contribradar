# GitHub Ingestion Runbook

Use this runbook to manually load live GitHub repository and issue data into the production PostgreSQL database.

## Environment

Required:

- `OPS_API_KEY`
- `DATABASE_URL`

Optional but recommended:

- `GITHUB_TOKEN`

`GITHUB_TOKEN` is used only server-side by the ingestion endpoint. Public repositories can be ingested without it, but unauthenticated GitHub API limits are low.

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

## Notes

- The first ingestion slice upserts repository metadata and open GitHub issues.
- Pull requests returned by GitHub's issues endpoint are ignored.
- Readiness scores are deterministic and based on the available GitHub fields. Deep metrics such as CI pass rate, README length, maintainer response time, and contributors are intentionally left conservative until a later enrichment pass.
- This endpoint does not delete database issues that no longer appear in GitHub's first page of open issues.
