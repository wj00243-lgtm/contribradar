# Sprint 3B-3A: Advanced Discovery Design

## Scope

This slice implements Pro Advanced Discovery UI focused on repository comparison and advanced filters.

Included:

- Repository comparison for 2-3 selected repositories.
- Side-by-side metrics using the existing dashboard grid style.
- Advanced filters:
  - license
  - last commit within X days
  - contributor count range
- ProGate protection for comparison and advanced controls.

Excluded:

- Score trend charts.
- Unlimited watchlist backend enforcement polish.
- New database migration.
- Real GitHub live data import.

## Architecture

The seed/domain repository model is extended with `license` and `contributorCount` fields. Discovery filtering accepts optional advanced filter values and stays client-side for this PR, matching the current seed-data MVP pattern.

UI changes stay inside the discovery feature area:

- `src/components/discovery/discovery-filtering.ts` owns filtering logic.
- `src/components/discovery/repo-comparison.tsx` owns comparison presentation.
- `src/components/discovery/discovery-dashboard.tsx` wires selected repositories, advanced controls, and Pro gates.

## Behavior

- Free users see ProGate overlays for comparison and advanced filters.
- Pro users can select up to 3 repos for comparison.
- License filter is exact match.
- Last commit filter uses the fixed MVP reference date already used by discovery services: May 6, 2026.
- Contributor range uses `metrics.activeContributors30d`.

## Testing

Unit tests cover advanced filtering logic:

- license filter
- recent commit filter
- contributor minimum/maximum
- interaction with existing language/score/good-first filters

Build/typecheck verifies UI wiring.
