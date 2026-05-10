# Security Hardening Notes

## Auth Host Trust

`src/auth.ts` uses `trustHost: true` for Auth.js. This is acceptable for the current Vercel deployment because:

- `AUTH_URL` is set to the production origin.
- GitHub OAuth callback is pinned to `<AUTH_URL>/api/auth/callback/github`.
- The app is deployed behind Vercel's trusted proxy layer.

Do not reuse this setting on an unknown proxy or self-hosted deployment without reviewing forwarded host headers.

## Middleware

`middleware.ts` adds:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- best-effort in-memory rate limiting for:
  - `/api/v1/recommendations`
  - `/api/cron/deliver-alerts`

The middleware rate limit is intentionally lightweight. For paid traffic or abuse-prone launch campaigns, replace it with durable storage such as Vercel KV, Upstash, or a provider WAF rule.

## JSON Fields

Prisma JSON fields are normalized at service boundaries:

- `src/server/alert-preferences.ts`
- `src/server/repository-mappers.ts`
- `src/server/watchlists-db.ts`
- `src/server/recommendations.ts`

Any new write path for JSON fields must validate input with Zod or normalize unknown values before persistence.

## External API Timeouts

External calls now pass `AbortSignal.timeout(...)`:

- OpenAI recommendations: default 15 seconds
- Resend email delivery: default 10 seconds
- Slack webhook delivery: default 10 seconds

Delivery still uses retry logic through `deliverAlerts`. OpenAI recommendation failures remain mapped by the API route to existing `502` or `503` responses.

## Seed Time Constants

Production DB-backed discovery now uses the current clock for `lastActiveWithinDays`. Seed-only discovery still uses a fixed timestamp to keep local demo data deterministic.
