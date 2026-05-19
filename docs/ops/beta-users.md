# Private Beta User Tracker Template

Use this file as a template for beta operations. Do not commit real user email addresses, private notes, or provider identifiers to the repository. Keep the live tracker in a private workspace, spreadsheet, or password-manager note.

## Invited Users

| GitHub Username | Plan | Invited Date | Onboarded | Feedback Status | Notes |
|---|---|---|---|---|---|
| `@example-user` | `free` | `YYYY-MM-DD` | No | Pending | Replace in private tracker only |

## Invite Template

```text
Subject: ContribRadar Private Beta Invite

Hi {{name}},

You've been invited to the ContribRadar private beta.

Link: https://contribradar.vercel.app

Getting started:
1. Click "Login with GitHub".
2. Browse repository discovery.
3. Try creating a watchlist.
4. Pro users: test AI recommendations and smart alerts.

Feedback: {{feedback_channel_link}}
Support: {{support_contact}}
```

## Provisioning Commands

Use the production database provider console or local ops scripts from a trusted operator machine.

```powershell
$env:DATABASE_URL="<production-connection-string>"
```

Dry-run a plan change:

```powershell
bun run ops:user:plan -- --user="<github_id-or-email-or-user-id>" --plan=pro
```

Apply a plan change:

```powershell
bun run ops:user:plan -- --user="<github_id-or-email-or-user-id>" --plan=pro --apply
```

Reset a beta user to Free:

```powershell
bun run ops:user:plan -- --user="<github_id-or-email-or-user-id>" --plan=free --apply
```

The script uses Prisma field names (`githubId`, `displayName`) instead of raw SQL column names and refuses ambiguous matches. Use the exact user id if more than one user matches.

Reset AI recommendation usage for a beta user:

```powershell
bun run ops:ai:reset -- --user="<github_id-or-email-or-user-id>"
bun run ops:ai:reset -- --user="<github_id-or-email-or-user-id>" --apply
```

## Feedback Loop

Choose one primary channel before inviting users:

| Channel | Best For | Setup Effort |
|---|---|---|
| GitHub Discussions | Async, searchable product feedback | Low |
| Discord | Real-time beta community | Medium |
| Email | Private, low-friction reports | Low |

Feedback template:

```text
- What did you try?
- What happened?
- What did you expect?
- Screenshot or link (optional):
```

Weekly triage:

- Review new feedback.
- Categorize each item as `bug`, `feature-request`, `ux-improvement`, or `docs`.
- Create GitHub issues for actionable work.
- Respond within 48 hours.
- Close the loop within 7 days when practical.

## Beta Exit Criteria

- [ ] At least 5 active beta users with sustained usage.
- [ ] No critical bugs unaddressed for 7+ days.
- [ ] Cron delivery success rate is above 95% over the last 14 days.
- [ ] AI recommendation quota and feature gates are validated with real Pro users.
- [ ] Public onboarding docs and FAQ are ready.
- [ ] Sentry or equivalent error tracking is active and monitored.
- [ ] Billing or plan activation path is defined for the next release.
