import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const requiredFiles = [
  'README.md',
  'LICENSE',
  'ROADMAP.md',
  'DEPLOYMENT.md',
  'RELEASE_CHECKLIST.md',
  'docs/architecture.md',
  'docs/README.md',
  'docs/acceptance/README.md',
  'docs/screenshots/README.md',
  'docs/archive/README.md',
  'docs/01-PRD.md',
  'docs/02-TECH_DESIGN.md',
  'docs/03-ENGINEERING.md',
  'docs/13-LANGUAGE.md',
  'docs/14-BACKUP.md',
  'docs/15-HISTORY.md',
  'vite.config.ts',
  'docs/11-RELEASE.md',
  '.github/workflows/ci.yml',
  'package-lock.json',
  '.nvmrc',
  'public/favicon.svg',
];

for (const file of requiredFiles) {
  await access(file, constants.R_OK);
}

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
for (const script of ['lint', 'test', 'build']) {
  if (!pkg.scripts?.[script]) {
    throw new Error(`Missing package.json script: ${script}`);
  }
}

const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
if (lock.version !== pkg.version || lock.packages[''].version !== pkg.version) {
  throw new Error('Package and lockfile versions differ.');
}
const nodeVersion = (await readFile('.nvmrc', 'utf8')).trim();
if (process.versions.node !== nodeVersion) throw new Error(`Use verified Node ${nodeVersion}.`);
const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
const ignoredPaths = new Set((await readFile('.gitignore', 'utf8')).split(/\r?\n/).map(line => line.trim().replace(/\/$/, '')));
for (const generated of ['node_modules', 'dist', 'coverage', '.artifacts', '.env', '.env.*', '__pycache__']) {
  if (!ignoredPaths.has(generated)) throw new Error(`.gitignore must exclude ${generated}`);
}
for (const command of ['npm ci', 'npm run lint', 'npm run test', 'npm run build', 'npm run verify:release']) {
  if (!workflow.includes(`run: ${command}`)) throw new Error(`CI is missing ${command}`);
}
if (!workflow.includes("node-version-file: '.nvmrc'")) throw new Error('CI must use .nvmrc.');
for (const required of ['needs: quality', 'pages: write', 'id-token: write', 'name: github-pages',
  'actions/configure-pages@', 'actions/upload-pages-artifact@', 'actions/deploy-pages@', 'DEPLOY_BASE_PATH:']) {
  if (!workflow.includes(required)) throw new Error(`Pages workflow is missing ${required}`);
}

// Inspect release sources and, when Git exists, every tracked path. Generated
// runtime dependencies/build output are valid locally but must never be tracked.
const excluded = new Set(['node_modules', 'dist', '.git', 'coverage', '.artifacts', '.idea', '.vscode', '__pycache__']);
async function walk(directory = '.') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path.replace(/^\.\//, ''));
  }
  return files;
}
const files = await walk();
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean);
} catch {
  console.log('Git index unavailable; auditing release sources (no remote CI claim).');
}
for (const file of [...files, ...tracked]) {
  if (file.split('/').some(part => ['node_modules', 'dist', 'coverage', '.artifacts', '__pycache__'].includes(part)) ||
      /(^|\/)\.env(?:\.|$)/.test(file) || /\.(log|tmp|tsbuildinfo)$/.test(file)) {
    throw new Error(`Unpublishable file: ${file}`);
  }
}
let links = 0;
let evidenceLinks = 0;
const textExtensions = new Set(['.md', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.html', '.svg', '.yml', '.yaml', '.py', '.css']);
for (const file of files) {
  if (!textExtensions.has(extname(file))) continue;
  const source = await readFile(file, 'utf8');
  if (/\b[A-Za-z]:[\\/]|\/(?:Users|home)\/[A-Za-z0-9_-]+\//.test(source)) {
    throw new Error(`Local absolute path in ${file}`);
  }
  if (/(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}|\bsk-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/.test(source)) {
    throw new Error(`Possible credential in ${file}; inspect locally without printing it.`);
  }
  if (file.startsWith('docs/acceptance/') && extname(file) === '.json') {
    const report = JSON.parse(source);
    if (report.source_files) {
      const originals = new Map();
      for (const target of report.source_files) {
        const absolute = resolve(dirname(file), target);
        if (relative(resolve(dirname(file)), absolute).startsWith('..')) {
          throw new Error(`Evidence source escapes report directory in ${file}`);
        }
        originals.set(target, JSON.parse(await readFile(absolute, 'utf8')));
        evidenceLinks++;
      }
      for (const result of report.results) {
        const original = originals.get(result.source)?.results?.find(item => item.case === result.case);
        if (!original || original.result !== result.result) {
          throw new Error(`Evidence source/result mismatch for ${result.case} in ${file}`);
        }
      }
    }
  }
  if (extname(file) !== '.md') continue;
  const targets = [...source.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)].map(m => m[1]);
  targets.push(...[...source.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]));
  for (let target of targets) {
    if (/^(?:https?:|mailto:|data:|#)/.test(target)) continue;
    target = decodeURIComponent(target.replace(/^<|>$/g, '').split('#')[0]);
    const absolute = resolve(dirname(file), target);
    if (relative(process.cwd(), absolute).startsWith('..')) throw new Error(`Link escapes repository in ${file}`);
    await access(absolute, constants.R_OK);
    links++;
  }
}

console.log(`Release structure verified: ${requiredFiles.length} required files present.`);
console.log(`Release audit: ${files.length} source files, ${links} local Markdown/image links; CI, lockfile and Node version verified.`);
console.log(`Acceptance provenance verified: ${evidenceLinks} original report references.`);
