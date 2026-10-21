// Builds the Chromium MV3 extension.
//   dist/extension       production: permissions exactly ["activeTab", "scripting"], no host permissions; optional host
//                        permissions and a badge-only service worker for opt-in automatic scanning (D-081)
//   dist/extension-test  e2e only (D-013): + host permissions for fictional test hosts, + ?tab= targeting
// Test-only code is compiled out of the production popup (define __VT_TEST__=false + dead-code removal).
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { icons } from './icons.mjs';

export const TEST_HOST_PERMISSIONS = ['https://*.test/*', 'https://*.example/*'];

export async function buildExtension({ test = false, outdir = test ? 'dist/extension-test' : 'dist/extension' } = {}) {
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(join(outdir, 'icons'), { recursive: true });
  const common = { bundle: true, format: 'iife', platform: 'browser', target: 'chrome110', legalComments: 'none', minifySyntax: true, logLevel: 'warning' };
  const define = { __VT_TEST__: String(test) };
  await build({ ...common, entryPoints: ['src/extension/popup/popup.ts'], outfile: join(outdir, 'popup.js'), define });
  await build({ ...common, entryPoints: ['src/extension/content/index.ts'], outfile: join(outdir, 'content.js'), globalName: 'VeiltraceContent' });
  await build({ ...common, entryPoints: ['src/extension/auto/content-auto.ts'], outfile: join(outdir, 'auto.js'), define });
  await build({ ...common, entryPoints: ['src/extension/background/worker.ts'], outfile: join(outdir, 'background.js'), define });
  copyFileSync('src/extension/popup/popup.html', join(outdir, 'popup.html'));
  copyFileSync('src/extension/popup/popup.css', join(outdir, 'popup.css'));
  for (const [name, png] of Object.entries(icons())) writeFileSync(join(outdir, 'icons', name), png);
  const manifest = JSON.parse(readFileSync('src/extension/manifest.json', 'utf8'));
  manifest.version = JSON.parse(readFileSync('package.json', 'utf8')).extensionVersion ?? manifest.version;
  if (test) {
    manifest.name = 'VeilTrace (TEST BUILD)';
    manifest.host_permissions = TEST_HOST_PERMISSIONS;
  }
  writeFileSync(join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return outdir;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const test = process.argv.includes('--test');
  console.log(`built ${await buildExtension({ test })}`);
}
