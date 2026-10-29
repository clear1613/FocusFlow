# Contributing

Contributions should preserve the project boundaries documented in `docs/01-PRD.md`, `docs/02-TECH_DESIGN.md`, and `docs/03-ENGINEERING.md`.

## Local workflow

```bash
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm run check
```

## Engineering rules

- Timer correctness is based on timestamps, not decrement-count accuracy.
- Session is the analytics fact source.
- Session completion must remain idempotent.
- Deleting a Task must not delete Session history.
- Persisted schema changes require migration and validation updates.
- Browser enhancements such as Notification must degrade without breaking core Timer behavior.
- Avoid adding backend/auth/cloud-sync scope to V1.x without an explicit product decision.

## Pull requests

Keep changes scoped. Include tests for Timer, persistence, analytics, or state-transition changes. Update architecture/product docs when behavior changes materially.

## Repository housekeeping

Use the [documentation index](docs/README.md) to locate current designs and historical records. Acceptance scripts write generated reports and screenshots to ignored `.artifacts/` paths by default. Archive reviewed release evidence under `docs/acceptance/v1.x/<environment>/` and `docs/screenshots/v1.x/<environment>/<suite>/`; retain raw failures and reruns with working relative source pointers. Keep prior releases intact and update the artifact and screenshot indexes when adding a formal run.
