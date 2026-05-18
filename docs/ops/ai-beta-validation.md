# AI Beta Validation Runbook

Use this runbook after deploying changes to AI recommendations and before expanding Pro beta access.

## Preconditions

- `GEMINI_API_KEY` is set in Vercel Production.
- The latest Vercel deployment was created after `GEMINI_API_KEY` was added or rotated.
- The tester has logged out and logged in after any plan change.
- The tester is assigned `plan = 'pro'` in the production `users` table.

## Pro Gate Check

1. Login as a Free user.
2. Confirm the AI Recommendations card is covered by the Pro overlay.
3. Upgrade the same user to Pro in production DB.
4. Logout and login again.
5. Confirm the Pro overlay is gone and the `Generate recommendations` button is visible.

## Recommendation Generation Check

1. Click **Generate recommendations**.
2. Confirm at least one recommendation appears.
3. Confirm each recommendation has:
   - repository full name
   - fit score
   - reason text
   - optional suggested issue search
4. Confirm the usage badge changes from `0/20` to `1/20`.

## Usage Verification

From a trusted operator machine:

```powershell
$env:DATABASE_URL="<production-connection-string>"
bun run qa:ai:usage -- --user="<email-or-github-id-or-user-id>"
```

Expected output:

```text
<display name> | <email> | <github id>
  id: <user id>
  plan: pro
  ai usage: 1/20 for YYYY-MM (19 remaining)
```

## Quota Exhaustion Check

For a controlled beta test, set the user's `aiQuota` to a low number in `user_settings`, then generate recommendations until the quota is exhausted.

```powershell
$env:DATABASE_URL="<production-connection-string>"
bun run ops:user:quota -- --user="<email-or-github-id-or-user-id>" --ai-quota=1
bun run ops:user:quota -- --user="<email-or-github-id-or-user-id>" --ai-quota=1 --apply
```

Expected:

- First generation succeeds.
- Second generation returns a clear quota message.
- DB usage count does not exceed the intended limit during normal UI testing.

Reset after test:

```powershell
bun run ops:user:quota -- --user="<email-or-github-id-or-user-id>" --ai-quota=20 --apply
```

## Error Checks

Temporarily removing or rotating `GEMINI_API_KEY` should not be done on production during active beta. If testing in staging:

- Missing key should show: `Gemini is not configured. Set GEMINI_API_KEY in Vercel and redeploy.`
- Invalid Gemini output should show: `Gemini returned an unusable response...`
- Non-Pro users should keep the Pro gate.

## Quality Review

Capture the first 5 Pro recommendation outputs and score each one:

| Dimension | Pass Criteria |
|---|---|
| Relevance | Matches user languages/topics or watchlist context |
| Specificity | Reason references concrete repo traits |
| Actionability | Suggested search or next step is usable |
| Diversity | Results are not all the same language/topic unless user context demands it |

Open a prompt-tuning issue if fewer than 4 out of 5 outputs pass relevance and actionability.
