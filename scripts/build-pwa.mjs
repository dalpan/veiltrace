// Builds the "Cek Pesan" PWA (D-084) into dist/pwa: app.js, sw.js, index.html, style.css, manifest.webmanifest, icons.
// Static files only; it can be served by any HTTPS static host and works offline after the first visit.
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
  await build({ ...common, entryPoints: ['src/pwa/sw.ts'], outfile: join(outdir, 'sw.js') });
  copyFileSync('src/pwa/index.html', join(outdir, 'index.html'));
  copyFileSync('src/pwa/style.css', join(outdir, 'style.css'));
  writeFileSync(join(outdir, 'icon-192.png'), iconPng(192));
  writeFileSync(join(outdir, 'icon-512.png'), iconPng(512));
  const manifest = {
    name: 'VeilTrace · Cek Pesan', short_name: 'VeilTrace', description: 'Check a suspicious message on your device, offline.',
    start_url: './', scope: './', display: 'standalone', background_color: '#0d0f0d', theme_color: '#141713', lang: 'id',
    icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
    // Android share sheet: text arrives as a POST handled by the service worker, never in the URL.
    share_target: { action: 'share', method: 'POST', enctype: 'multipart/form-data', params: { title: 'title', text: 'text', url: 'url' } },
  };
  writeFileSync(join(outdir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
  return outdir;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`built ${await buildPwa()}`);
