# FocusFlow Deployment Guide

The production application is hosted on **GitHub Pages**. FocusFlow is a static Vite application with no backend, account system, database or API key.

## GitHub Pages

Repository: [clear1613/FocusFlow](https://github.com/clear1613/FocusFlow).

Production application: [FocusFlow on GitHub Pages](https://clear1613.github.io/FocusFlow/). The verified v1.3.0 release and production results are recorded in [docs/11-RELEASE.md](docs/11-RELEASE.md).

1. Repository Settings → Pages → Source: **GitHub Actions**. This repository has been configured with build_type `workflow` and HTTPS.
2. Push to main or run CI manually. PRs run quality checks without deploying.
3. The quality job runs npm ci, lint, tests, build and verify:release, then uploads dist.
4. The deploy job depends on quality and uses the github-pages environment with pages: write / id-token: write permissions. A failed gate prevents deployment.
5. Read the actual page_url output and run online acceptance before declaring release success.

The site uses `/FocusFlow/`. CI sets DEPLOY_BASE_PATH to `/<repository-name>/`, and Vite uses it for JavaScript, CSS and favicon URLs. This is a public build setting, not a secret. Local development and optional root-hosted deployments default to `/`.

Use Node 24.22.1 and npm 11.21.1. Reproduce the Pages build in PowerShell:

```powershell
npm ci
$env:DEPLOY_BASE_PATH = '/FocusFlow/'
npm run check
npm run preview
```

Open the preview at its `/FocusFlow/` path. For a fork or renamed repository, CI derives the new base path from the repository name; update documentation and browser URLs accordingly.

## Online acceptance and screenshots

Install Python Playwright separately (v1.3.0 production checks used 1.64.1 with Python 3.12) and use an installed Microsoft Edge. After deployment:

```bash
python scripts/history-acceptance.py --expected-version 1.3.0 --url https://clear1613.github.io/FocusFlow/ --output docs/acceptance/history-production-run.json --screenshots-dir docs/screenshots/history/production
python scripts/browser-acceptance.py --production --expected-version 1.3.0 --url https://clear1613.github.io/FocusFlow/ --output docs/acceptance/v1.3-business-production-run.json --screenshots-dir docs/screenshots/v1.3/production/business
python scripts/language-acceptance.py --expected-version 1.3.0 --url https://clear1613.github.io/FocusFlow/ --output docs/acceptance/v1.3-language-production-run.json --screenshots-dir docs/screenshots/v1.3/production/language
node scripts/backup-acceptance.cjs --expected-version 1.3.0 --url https://clear1613.github.io/FocusFlow/ --output docs/acceptance/v1.3-backup-production.json --screenshots-dir docs/screenshots/v1.3/production/backup
```

The suite uses isolated contexts and fixed sample tasks, records how timers are advanced in each result file, and tests desktop plus 375×812 and 390×844. It covers Timer, tasks, refresh/expiry restore, persistence/recovery/migration, analytics, notification fallback, themes, modal focus, mobile overflow and unexpected console errors.

The backup script requires Node to resolve `playwright/test` (verified with 1.62.1); set `NODE_PATH` to a separate tool installation if needed. These browser tools are not application dependencies. Known connection failures at initial navigation have at most two recorded retries; business assertions are not retried. The Python suites isolate each case in a new browser process.

Current screenshots are saved in `docs/screenshots/v1.3/production/` and `docs/screenshots/history/production/`; earlier version folders are retained. README uses actual production captures. Local captures remain separate. The application switches views without adding a multi-page router; its entry URL and refresh must work. Detailed results and explicitly recorded navigation reruns are in [docs/15-HISTORY.md](docs/15-HISTORY.md). History, language and business scripts support `--case` to replay a named case without altering its assertions.

## Formal release

1. Confirm CI, Pages deployment and real online acceptance.
2. Add the confirmed URL and production screenshot to README and record evidence in docs/11-RELEASE.md.
3. Update package.json and package-lock.json to the new version.
4. Stop development/preview servers, then run npm ci and every gate with the Pages base path.
5. Push; confirm the release commit's CI and Pages deployment and smoke-test the published version.
6. Create and push the version tag only after those checks succeed.

## Optional Vercel deployment

Vercel is an alternative host, not a V1.0 release requirement. vercel.json remains available with Vite, npm run build and dist. Import the repository after resolving account verification; leave DEPLOY_BASE_PATH unset for a root-hosted Vercel build. Changing hosts does not change business logic.

References: [Vite static deployment](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
