# FocusFlow Deployment Guide

The production application is hosted on **GitHub Pages**. FocusFlow is a static Vite application with no backend, account system, database or API key.

## GitHub Pages

Repository: [clear1613/FocusFlow](https://github.com/clear1613/FocusFlow).

Production application: [FocusFlow on GitHub Pages](https://clear1613.github.io/FocusFlow/). The verified v1.0.0 release and production results are recorded in [docs/11-RELEASE.md](docs/11-RELEASE.md).

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

Install Python Playwright separately and use an installed Microsoft Edge. After the first actual Pages deployment:

```bash
python scripts/browser-acceptance.py --production --expected-version 1.0.0 --url https://clear1613.github.io/FocusFlow/ --output docs/acceptance/production.json
```

The suite uses isolated contexts and synthetic fixtures, explicitly identifies controlled clock/API simulations, and tests desktop plus 375×812 and 390×844. It covers Timer, tasks, refresh/expiry restore, persistence/recovery/migration, analytics, notification fallback, themes, modal focus, mobile overflow and unexpected console errors.

Production screenshots are saved in `docs/screenshots/production/`. README must use home-desktop.png only after a real capture. Local captures remain separate from the online set. V1.0 has no multi-page router; its entry URL and refresh must work.

## Formal release

1. Confirm CI, Pages deployment and real online acceptance.
2. Add the confirmed URL and production screenshot to README and record evidence in docs/11-RELEASE.md.
3. Update package.json and package-lock.json to 1.0.0.
4. Stop development/preview servers, then run npm ci and every gate with the Pages base path.
5. Push; confirm the release commit's CI and Pages deployment and smoke-test the published version.
6. Create and push v1.0.0 only after those checks succeed.

## Optional Vercel deployment

Vercel is an alternative host, not a V1.0 release requirement. vercel.json remains available with Vite, npm run build and dist. Import the repository after resolving account verification; leave DEPLOY_BASE_PATH unset for a root-hosted Vercel build. Changing hosts does not change business logic.

References: [Vite static deployment](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
