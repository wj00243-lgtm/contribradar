# New Developer Onboarding

Welcome to ContribRadar. This guide gets you from zero to a running local environment in about 15 minutes.

## 1. Prerequisites

Install these tools first:

- **Git** - to clone the repo.
- **Node.js 20+** - required by Next.js 15.
- **Bun** - the project uses Bun for package management and scripts.
- **PostgreSQL 15+** - easiest via Docker.

Install Bun on Windows:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

## 2. PostgreSQL Via Docker

If you already have a running PostgreSQL instance, skip to Step 3.

```powershell
docker run -d `
  --name contribradar-db `
  -e POSTGRES_USER=contribradar `
  -e POSTGRES_PASSWORD=contribradar `
  -e POSTGRES_DB=contribradar `
  -p 5432:5432 `
  postgres:15
```

Verify it is running:

```powershell
docker ps
```

## 3. Clone And Install

```powershell
git clone <repo-url> contribradar
cd contribradar
bun install
```

## 4. Environment Variables

Copy the example file:

```powershell
Copy-Item .env.example .env
```

Set the minimum required values for local development:

| Variable | Value | Why |
|---|---|---|
| `DATABASE_URL` | `postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public` | Local PostgreSQL connection. |
| `AUTH_SECRET` | Any random 32-character string | Auth.js session signing. |
| `AUTH_URL` | `http://localhost:3000` | Auth.js callback base URL. |

Generate a local secret:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Most other variables can stay empty until you test their related feature.

## 5. Database Setup

Generate the Prisma client and apply migrations:

```powershell
bunx prisma generate
bunx prisma migrate deploy
```

Optional seed data:

```powershell
bun run prisma:seed
```

Inspect the database:

```powershell
bunx prisma studio
```

Prisma Studio opens at `http://localhost:5555`.

## 6. GitHub OAuth App

Auth.js uses GitHub OAuth. Without this, login will fail.

1. Go to **GitHub -> Settings -> Developer settings -> OAuth Apps -> New OAuth App**.
2. Set **Application name** to `ContribRadar Local`.
3. Set **Homepage URL** to `http://localhost:3000`.
4. Set **Authorization callback URL** to `http://localhost:3000/api/auth/callback/github`.
5. Click **Register application**.
6. Copy the **Client ID** to `.env` as `AUTH_GITHUB_ID`.
7. Generate a client secret and copy it to `.env` as `AUTH_GITHUB_SECRET`.

Restart the dev server after editing `.env`.

## 7. Start The Dev Server

```powershell
bun run dev
```

Open `http://localhost:3000`.

Core local flow:

1. Login with GitHub.
2. Browse repository discovery.
3. Create a watchlist.
4. Open `/ops` to confirm the page loads. Protected ops APIs return `503` when `OPS_API_KEY` is not configured and `401` when the entered key is wrong.

## 8. Verification

Run tests:

```powershell
bun test
```

Run type checking:

```powershell
bun run typecheck
```

Run the production build:

```powershell
bun run build
```

Run launch readiness checks:

```powershell
bun run qa:launch
```

## 9. Test AI Recommendations

1. Get a Gemini API key from Google AI Studio.
2. Add it to `.env` as `GEMINI_API_KEY`.
3. In Prisma Studio, set your user `plan` to `pro`.
4. Logout and login again so the session picks up the DB plan.
5. On the dashboard, click **Generate recommendations**.
6. Confirm the usage meter increments.

## 10. Test Smart Alerts And Cron

Create a Pro user watchlist with alerts enabled, then trigger cron locally:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/cron/deliver-alerts" -Method GET
```

Verify recent cron rows:

```powershell
bun run qa:cron:db
```

Run local cron end-to-end against a temporary dev server:

```powershell
bun run qa:cron:e2e
```

## 11. Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `DATABASE_URL` errors | PostgreSQL is not running | Start the Docker container from Step 2. |
| GitHub login fails | OAuth callback mismatch | Match GitHub callback URL to `AUTH_URL`. |
| Prisma client missing | Client was not generated | Run `bunx prisma generate`. |
| `/ops` returns `503` | `OPS_API_KEY` is missing from the environment | Set the key locally or in Vercel and restart/redeploy. |
| `/ops` returns `401` | The entered `OPS_API_KEY` does not match the environment value | Use the current key from the operator password manager / Vercel env. |
| AI recommendations return `503` | `GEMINI_API_KEY` is missing | Add a valid key and restart dev server. |
| Port 3000 is in use | Another process is running | Use `bun run dev -- --port 3001`. |

## 12. Next Steps

- Feature development: `docs/superpowers/specs/`
- Deployment: `docs/ops/deploy-smoke.md`, `docs/ops/launch-plan.md`
- Private beta: `docs/ops/private-beta.md`, `docs/ops/beta-users.md`
- Ops monitoring: `docs/ops/monitoring.md`
