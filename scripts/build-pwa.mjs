// Builds the "Cek Pesan" PWA (D-084) into dist/pwa: app.js, sw.js, index.html, style.css, manifest.webmanifest, icons.
// Static files only; it can be served by any HTTPS static host and works offline after the first visit.
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { iconPng } from './icons.mjs';

export async function buildPwa({ outdir = 'dist/pwa' } = {}) {
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });
  const version = JSON.parse(readFileSync('src/extension/manifest.json', 'utf8')).version;
  const common = { bundle: true, format: 'iife', platform: 'browser', target: ['chrome100', 'safari15', 'firefox115'], legalComments: 'none', minifySyntax: true, logLevel: 'warning', define: { __VT_VERSION__: JSON.stringify(version) } };
  await build({ ...common, entryPoints: ['src/pwa/app.ts'], outfile: join(outdir, 'app.js') });
  // On-device OCR (D-104): its own bundle plus the Tesseract worker, the LSTM cores and the Indonesian and English models,
  // all served from this origin. Loaded only when an image is checked.
  const ocr = join(outdir, 'ocr');
  mkdirSync(join(ocr, 'core'), { recursive: true });
  mkdirSync(join(ocr, 'lang'), { recursive: true });
  await build({ ...common, entryPoints: ['src/pwa/ocr.ts'], outfile: join(ocr, 'ocr.js') });
  copyFileSync('node_modules/tesseract.js/dist/worker.min.js', join(ocr, 'worker.min.js'));
  for (const v of ['lstm', 'simd-lstm', 'relaxedsimd-lstm']) copyFileSync(`node_modules/tesseract.js-core/tesseract-core-${v}.wasm.js`, join(ocr, 'core', `tesseract-core-${v}.wasm.js`));
  for (const l of ['ind', 'eng']) copyFileSync(`node_modules/@tesseract.js-data/${l}/4.0.0_best_int/${l}.traineddata.gz`, join(ocr, 'lang', `${l}.traineddata.gz`));
  writeFileSync(join(ocr, 'THIRD_PARTY_NOTICES.txt'), [
    'tesseract.js 7.0.0 and tesseract.js-core 7.0.0 (Apache-2.0): https://github.com/naptha/tesseract.js',
    'Tesseract OCR engine (Apache-2.0): https://github.com/tesseract-ocr/tesseract',
    '@tesseract.js-data/ind and /eng 1.0.0, tessdata 4.0.0_best_int models (packaging MIT; models Apache-2.0): https://github.com/tesseract-ocr/tessdata',
    '', readFileSync('node_modules/tesseract.js/LICENSE.md', 'utf8'),
  ].join('\n'));
  copyFileSync('src/pwa/index.html', join(outdir, 'index.html'));
  copyFileSync('src/pwa/style.css', join(outdir, 'style.css'));
  // The cache name changes whenever the app's files change, so an installed copy picks up new detector versions on its next start.
  const digest = createHash('sha256');
  for (const f of ['app.js', 'index.html', 'style.css', 'ocr/ocr.js']) digest.update(readFileSync(join(outdir, f)));
  const cacheVersion = `${version}-${digest.digest('hex').slice(0, 12)}`;
  await build({ ...common, define: { __VT_VERSION__: JSON.stringify(cacheVersion) }, entryPoints: ['src/pwa/sw.ts'], outfile: join(outdir, 'sw.js') });
  writeFileSync(join(outdir, 'icon-192.png'), iconPng(192));
  writeFileSync(join(outdir, 'icon-512.png'), iconPng(512));
  const manifest = {
    name: 'VeilTrace · Cek Pesan', short_name: 'VeilTrace', description: 'Check a suspicious message on your device, offline.',
    start_url: './', scope: './', display: 'standalone', background_color: '#0d0f0d', theme_color: '#141713', lang: 'id',
    icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
    // Android share sheet: text or a screenshot arrives as a POST handled by the service worker, never in the URL.
    share_target: { action: 'share', method: 'POST', enctype: 'multipart/form-data', params: { title: 'title', text: 'text', url: 'url', files: [{ name: 'image', accept: ['image/*'] }] } },
  };
  writeFileSync(join(outdir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
  return outdir;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`built ${await buildPwa()}`);
