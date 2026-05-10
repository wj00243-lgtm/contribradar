# Release Tagging

Create `v1.0.0` only after:

1. Final release PR is merged to `master`.
2. Local `master` is updated with `Fetch origin` and `Pull origin`.
3. Production deploy succeeds.
4. `bun run qa:smoke -- --base-url <production-url> --cron-secret <CRON_SECRET>` passes.
5. `docs/ops/final-release-checklist.md` is complete.

Commands:

```powershell
git switch master
git pull --ff-only origin master
git tag -a v1.0.0 -m "ContribRadar v1.0.0"
git push origin v1.0.0
```

Do not tag a feature branch. If production smoke fails after a tag is created, fix forward with `v1.0.1`; do not move the published tag.
