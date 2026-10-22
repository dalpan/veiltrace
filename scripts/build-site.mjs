// Builds the public website for https://veiltrace.click (GitHub Pages, custom domain):
//   /            landing page (src/site): what VeilTrace is, how it works, install and download
//   /app/        the "Cek Pesan" PWA (scripts/build-pwa.mjs)
//   /download/   the Chromium release ZIP (from npm run release), an unsigned Firefox ZIP and SHA256SUMS
//   /sw.js       retires the old root-scoped app service worker
// Static files only; no request leaves the visitor's browser (CSP connect-src 'none').
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildExtension } from './build-extension.mjs';
import { buildPwa } from './build-pwa.mjs';

export const DOMAIN = 'veiltrace.click';

export async function buildSite({ outdir = 'dist/site' } = {}) {
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(join(outdir, 'img'), { recursive: true });
  await buildPwa({ outdir: join(outdir, 'app') });
  for (const f of ['index.html', 'site.css', 'site.js', 'sw.js']) copyFileSync(join('src/site', f), join(outdir, f));
  copyFileSync('assets/brand/logo.svg', join(outdir, 'img/logo.svg'));
  copyFileSync('assets/brand/social-card.jpg', join(outdir, 'social-card.jpg'));
  for (const f of ['cmd-lure-page.png', 'cmd-lure-popup-top.png', 'pwa-result-crop.png']) copyFileSync(join('docs/images', f), join(outdir, 'img', f));

  // Downloads: the reproducible Chromium release ZIP for the current version, and an unsigned Firefox ZIP.
  const version = JSON.parse(readFileSync('src/extension/manifest.json', 'utf8')).version;
  const releaseZip = join('release', `veiltrace-chromium-${version}.zip`);
  if (!existsSync(releaseZip)) throw new Error(`${releaseZip} is missing: run npm run release first`);
  const dl = join(outdir, 'download');
  mkdirSync(dl, { recursive: true });
  copyFileSync(releaseZip, join(dl, 'veiltrace-chromium.zip'));
  const ff = await buildExtension({ firefox: true, outdir: 'dist/site-firefox' });
  execFileSync('zip', ['-qrX', resolve(dl, 'veiltrace-firefox.zip'), '.'], { cwd: ff });
  const sums = ['veiltrace-chromium.zip', 'veiltrace-firefox.zip']
    .map((f) => `${createHash('sha256').update(readFileSync(join(dl, f))).digest('hex')}  ${f}`).join('\n');
  writeFileSync(join(dl, 'SHA256SUMS'), `${sums}\n# VeilTrace ${version}. Checksums show integrity, not authenticity.\n`);

  writeFileSync(join(outdir, 'CNAME'), `${DOMAIN}\n`);
  writeFileSync(join(outdir, '.nojekyll'), '');
  return outdir;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`built ${await buildSite()}`);
