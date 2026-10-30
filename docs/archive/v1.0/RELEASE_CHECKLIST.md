# FocusFlow V1.0 Release Checklist

Official host: GitHub Pages. Vercel is optional. See [release evidence](../../11-RELEASE.md) and the [acceptance record](../../10-ACCEPTANCE.md).

## Repository

- [x] Public repository, main branch, product description and Topics verified.
- [x] Source/tests/docs/CI/screenshots tracked; generated and private files excluded.
- [x] LICENSE is a plain MIT file; no vendored third-party source in the tree.
- [x] Screenshots use sample tasks and their captions match the capture source.

## Local quality

- [x] npm install and clean npm ci have succeeded.
- [x] Lint passes; rules retained.
- [x] 78/78 tests pass; TypeScript strict retained.
- [x] Build and release verification pass.
- [x] Timer/tasks/persistence/analytics/notifications/themes/modals pass locally.
- [x] Mobile 375×812 / 390×844 and 80-character task titles pass locally.
- [x] Real elapsed-time background recovery matches endAt.

## GitHub Pages production

- [x] Pages source is GitHub Actions.
- [x] Vite supports the subpath; deployment depends on quality checks.
- [x] Actual Pages workflow and deployment succeed.
- [x] Real Pages URL and refresh load JS/CSS/favicon correctly.
- [x] Desktop, 375×812 and 390×844 online acceptance passes (11/11).
- [x] Live site has no unexpected Console Error / Page Error in acceptance.
- [x] README contains actual Live Demo and production screenshots refreshed from final 1.0.0.

## Formal release

- [x] package.json and package-lock.json use 1.0.0 after production acceptance.
- [x] Clean npm ci, lint, test, build and verify:release pass for 1.0.0 (78/78 tests).
- [x] Release commit's quality job and Pages deployment are green.
- [x] Final published version 1.0.0 and core workflow are checked online; application assets match full production acceptance.
- [x] Annotated v1.0.0 Tag is pushed and points to the verified release commit.
