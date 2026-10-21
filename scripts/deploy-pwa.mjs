// Publishes the "Cek Pesan" PWA (D-084) to GitHub Pages: builds dist/pwa and force-pushes ONLY those static files as
// a single commit to the gh-pages branch (Pages source: gh-pages, /). Run from a clean main: `npm run deploy:pwa`.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPwa } from './build-pwa.mjs';

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
if (git(['status', '--porcelain', '--', 'src', 'scripts', 'package-lock.json'])) throw new Error('commit PWA sources before deploying');
const commit = git(['rev-parse', '--short', 'HEAD']);
const remote = git(['remote', 'get-url', 'origin']);
const dir = await buildPwa();
const tmp = mkdtempSync(join(tmpdir(), 'vt-pages-'));
try {
  cpSync(dir, tmp, { recursive: true });
  writeFileSync(join(tmp, '.nojekyll'), '');
  git(['init', '-q', '-b', 'gh-pages'], tmp);
  git(['add', '-A'], tmp);
  git(['-c', 'user.name=veiltrace-deploy', '-c', 'user.email=veiltrace@veiltrace.invalid', 'commit', '-q', '-m', `Deploy PWA from ${commit}`], tmp);
  git(['push', '-q', '--force', remote, 'gh-pages'], tmp);
  console.log(`deployed PWA from ${commit} to gh-pages`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
