# Contributing

Contributions should preserve the project boundaries documented in `docs/01-PRD.md`, `docs/02-TECH_DESIGN.md`, and `docs/03-ENGINEERING.md`.

## Local workflow

```bash
npm install
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
