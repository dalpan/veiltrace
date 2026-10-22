// Publishes https://veiltrace.click (landing page, the "Cek Pesan" PWA at /app/, downloads) to GitHub Pages: builds
// dist/site and force-pushes ONLY those static files, including CNAME, as one commit to the gh-pages branch (Pages
// source: gh-pages, /). Run from a clean main after `npm run release`: `npm run deploy:site`.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite } from './build-site.mjs';

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
if (git(['status', '--porcelain', '--', 'src', 'scripts', 'assets', 'docs/images', 'package-lock.json'])) throw new Error('commit the site and app sources before deploying');
const commit = git(['rev-parse', '--short', 'HEAD']);
const remote = git(['remote', 'get-url', 'origin']);
const dir = await buildSite();
const tmp = mkdtempSync(join(tmpdir(), 'vt-pages-'));
try {
  cpSync(dir, tmp, { recursive: true });
  git(['init', '-q', '-b', 'gh-pages'], tmp);
  git(['add', '-A'], tmp);
  git(['-c', 'user.name=veiltrace-deploy', '-c', 'user.email=veiltrace@veiltrace.invalid', 'commit', '-q', '-m', `Deploy site from ${commit}`], tmp);
  git(['push', '-q', '--force', remote, 'gh-pages'], tmp);
  console.log(`deployed site from ${commit} to gh-pages (https://veiltrace.click)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
