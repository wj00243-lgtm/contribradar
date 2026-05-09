# Sprint 3B-2: Smart Alerts Design

## Scope

This slice implements Smart Alerts backend and an in-app notification center.

Included:

- Alert preference parsing from `UserSettings.alertPreferences`.
- Smart alert candidate detection for:
  - `new_issue`
  - `score_change`
  - `stale_reminder`
- Pro plan enforcement.
- Active alert limit enforcement using the Sprint 3A quota helper.
- Alert list and read/unread API.
- Notification center UI panel behind `ProGate`.

Excluded:

- Background scheduler.
- Real Resend email delivery.
- Real Slack webhook delivery.
- Realtime push notifications.
- New database tables.

## Architecture

The implementation uses focused units:

- `src/server/alert-preferences.ts` normalizes JSON alert preferences.
- `src/server/alerts.ts` detects and creates smart alerts with a Prisma-compatible client.
- API route handlers expose list, check, and read/unread actions.
- `src/components/alerts/notification-center.tsx` renders unread/read alerts and lets users refresh or mark items read.

Delivery adapters are intentionally not added in this PR. The service returns created alerts and preference metadata so email/slack adapters can be attached in a later slice without changing detection logic.

## Data Flow

1. User opens the dashboard and sees the notification center.
2. Client calls `GET /api/v1/alerts`.
3. User clicks "Check alerts".
4. Client calls `POST /api/v1/alerts/check`.
5. API authenticates with Auth.js and checks `smartAlerts`.
6. Service reads user settings, active alert count, watchlists, issues, repositories, and score logs.
7. Service creates alerts until the active limit is reached.
8. Client refreshes the notification list.
9. User marks an alert read with `PATCH /api/v1/alerts/[id]`.

## Detection Rules

- `new_issue`: watchlisted repo has an open issue with good-first labels and no existing alert for that issue.
- `score_change`: latest score log has absolute score delta greater than 5 and no existing alert for that repo/log state.
- `stale_reminder`: issue is stale or untouched for at least 60 days and no existing stale alert exists for that issue.

## Errors

- Missing session returns `401`.
- Non-Pro users return `403`.
- Missing user returns `404`.
- Active alert limit reached returns a successful check result with `limitReached: true` and zero new alerts.

## Testing

Tests use fake Prisma-compatible clients. They cover preference defaults, alert detection, active limit blocking, list/read API behavior, and route error mapping.
