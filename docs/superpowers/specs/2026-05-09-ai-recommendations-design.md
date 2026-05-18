# Sprint 3B-1: AI Recommendations Design

## Scope

This slice implements the Pro AI recommendation core only. It builds on Sprint 3A feature gates, usage logs, Auth.js, and Prisma schema.

Included:

- Gemini API wrapper using `gemini-2.5-flash` by default.
- Recommendation context builder based on user skills, prior contributions, watchlist activity, and repository readiness.
- Monthly quota enforcement using `UsageLog` and `UserSettings`.
- Pro-only API endpoint for generating recommendations.
- Minimal shadcn/ui recommendation panel shell.

Excluded:

- Smart alerts.
- Email and Slack delivery.
- Repo comparison.
- Score trend charts.
- Persisted recommendation history.
- Billing or plan upgrade checkout.

## Architecture

The implementation is split into four units:

- `src/server/gemini.ts` owns Gemini request/response handling and JSON parsing.
- `src/server/recommendations.ts` owns recommendation context, candidate shaping, and quota-gated orchestration.
- `src/app/api/v1/recommendations/route.ts` exposes a Pro-only POST endpoint.
- `src/components/recommendations/ai-recommendations-panel.tsx` provides the UI shell and calls the API.

The recommendation service receives a Prisma-compatible client instead of importing Prisma directly. This keeps unit tests fast and lets API code provide the real client.

## Data Flow

1. User clicks "Generate" in the Pro recommendation panel.
2. API authenticates with Auth.js session.
3. API checks `hasFeature(session.user.plan, "aiRecommendations")`.
4. Service checks monthly quota with `canUseAiRecommendations`.
5. Service collects context:
   - `User.skillVector`
   - recent `Contribution` rows
   - watchlisted repositories
   - high-readiness candidate repositories
6. Service calls Gemini with strict JSON instructions.
7. Service increments `usage_logs` only after successful recommendation generation.
8. API returns recommendations plus usage meter.

## Errors

- Missing session returns `401`.
- Non-Pro users return `403`.
- Exhausted quota returns `429`.
- Missing `GEMINI_API_KEY` returns `503`.
- Invalid Gemini JSON returns `502`.

## Testing

Unit tests cover:

- Gemini prompt/request JSON behavior without real network calls.
- Recommendation context selection and quota gating with fake Prisma clients.
- API error behavior for unauthenticated, non-Pro, and quota-exhausted states where practical.

Integration with the real Gemini API is not run in CI.
