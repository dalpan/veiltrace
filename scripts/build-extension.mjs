// Builds the Chromium MV3 extension.
//   dist/extension       production: permissions exactly ["activeTab", "scripting"], no host permissions; optional host
//                        permissions and a badge-only service worker for opt-in automatic scanning (D-081)
//   dist/extension-test  e2e only (D-013): + host permissions for fictional test hosts, + ?tab= targeting
// Test-only code is compiled out of the production popup (define __VT_TEST__=false + dead-code removal).
import { build } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { icons } from './icons.mjs';

export const TEST_HOST_PERMISSIONS = ['https://*.test/*', 'https://*.example/*'];

/** Identifiers that must not appear in any shipped script (same list as scripts/verify-release.mjs). */
const FORBIDDEN = ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'eval(', 'new Function', 'URLSearchParams', 'sendMessage', 'onMessage', 'onConnect', 'onMessageExternal', 'importScripts'];

/**
 * The OCR worker (D-105), in four files so each stays under the 4 MB that Mozilla's add-on linter can parse:
 *   ocr-worker.js     src/extension/ocr/worker.ts; loads the three below with importScripts (packaged files only: CSP
 *                     script-src 'self')
 *   ocr-core.js       the Tesseract engine (tesseract.js-core, SIMD LSTM build, wasm embedded), its unused network paths
 *                     (fetching the wasm or a lazy file by URL) replaced by a stub that throws
 *   ocr-lang-ind.js   the Indonesian model, gzip+base64
 *   ocr-lang-eng.js   the English model, gzip+base64
 * Every file is checked for the forbidden identifiers; only ocr-worker.js may call importScripts.
 */
export const OCR_FILES = ['ocr-worker.js', 'ocr-core.js', 'ocr-lang-ind.js', 'ocr-lang-eng.js'];
const MAX_PARSE_BYTES = 4 * 1024 * 1024;

export async function buildOcrFiles() {
  const core = readFileSync('node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'utf8')
    .replaceAll('fetch(', '__vtNoNetwork(').replaceAll('XMLHttpRequest', '__vtNoXhr');
  const lang = (l) => `self.__vtOcrLang = self.__vtOcrLang || {};\nself.__vtOcrLang.${l} = ${JSON.stringify(readFileSync(`node_modules/@tesseract.js-data/${l}/4.0.0_best_int/${l}.traineddata.gz`).toString('base64'))};\n`;
  const worker = await build({ entryPoints: ['src/extension/ocr/worker.ts'], bundle: true, format: 'iife', platform: 'browser', target: 'chrome110', legalComments: 'none', minifySyntax: true, logLevel: 'warning', write: false });
  const files = {
    'ocr-worker.js': worker.outputFiles[0].text,
    'ocr-core.js': [
      '// VeilTrace OCR engine: tesseract.js-core 7.0.0 (Apache-2.0). Network paths are disabled.',
      'var __vtNoNetwork=function(){throw new Error("VeilTrace: network disabled")},__vtNoXhr=void 0;',
      core,
    ].join('\n'),
    'ocr-lang-ind.js': '// tessdata 4.0.0_best_int Indonesian model (Apache-2.0)\n' + lang('ind'),
    'ocr-lang-eng.js': '// tessdata 4.0.0_best_int English model (Apache-2.0)\n' + lang('eng'),
  };
  for (const [name, code] of Object.entries(files)) {
    for (const bad of FORBIDDEN) if (code.includes(bad) && !(bad === 'importScripts' && name === 'ocr-worker.js')) throw new Error(`${name} contains ${bad}`);
    if (Buffer.byteLength(code) >= MAX_PARSE_BYTES) throw new Error(`${name} is too large for the add-on linter`);
  }
  return files;
}

/** Firefox (desktop and Android ≥ 128, where MV3 is fully supported): event-page background and a gecko id (D-086). */
export function firefoxManifest(manifest) {
  const { background, ...rest } = manifest;
  delete rest.minimum_chrome_version;
  return {
    ...rest,
    ...(background ? { background: { scripts: [background.service_worker] } } : {}),
    browser_specific_settings: { gecko: { id: 'veiltrace@veiltrace.invalid', strict_min_version: '128.0' }, gecko_android: { strict_min_version: '128.0' } },
  };
}

/**
 * Managed build for organizations (D-089): installed by enterprise policy (force-install), host access granted at install,
 * automatic scanning on from the start. Results stay on the device: there is no reporting to the organization (D-048).
 */
export function managedManifest(manifest) {
  const { optional_host_permissions: origins, ...rest } = manifest;
  // `storage` only to read the `rulePacks` policy (D-109, chrome.storage.managed); nothing is written.
  return { ...rest, name: 'VeilTrace (Managed)', host_permissions: origins, permissions: [...rest.permissions, 'storage'], storage: { managed_schema: 'managed-schema.json' } };
}

/** Policy schema of the managed build (D-109): signed rule pack envelopes from the organization's security team. */
export const MANAGED_SCHEMA = {
  type: 'object',
  properties: {
    rulePacks: {
      title: 'VeilTrace organization rule packs',
      description: 'Signed rule pack envelopes ({ kid, payload, sig }) made with scripts/rulepack.mjs. Unsigned or unknown-key packs are ignored.',
      type: 'array',
      items: { type: 'object', properties: { kid: { type: 'string' }, payload: { type: 'string' }, sig: { type: 'string' } } },
    },
  },
};

/**
 * `ai`: include the optional on-device AI panel (D-095: experimental, off in the standard, Firefox and managed builds after
 * its evaluation, docs/AI_EVAL.md). The TEST build includes it so its e2e tests keep running.
 */
export async function buildExtension({ test = false, firefox = false, managed = false, ai = test,
  outdir = managed ? 'dist/extension-managed' : firefox ? 'dist/extension-firefox' : test ? 'dist/extension-test' : 'dist/extension' } = {}) {
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(join(outdir, 'icons'), { recursive: true });
  const common = { bundle: true, format: 'iife', platform: 'browser', target: 'chrome110', legalComments: 'none', minifySyntax: true, logLevel: 'warning' };
  // Organization rule packs (D-109): trusted public keys are built in. TEST build: the test-only key; managed build: the
  // organization's keys from deploy/rulepack-keys.json; other builds: none (packs are ignored).
  const keys = test ? [JSON.parse(readFileSync('tests/fixtures/rulepack/test-only-key.json', 'utf8'))].map(({ kid, publicKey }) => ({ kid, publicKey }))
    : managed && existsSync('deploy/rulepack-keys.json') ? JSON.parse(readFileSync('deploy/rulepack-keys.json', 'utf8')) : [];
  const define = { __VT_TEST__: String(test), __VT_MANAGED__: String(managed), __VT_AI__: String(ai), __VT_RULEPACK_KEYS__: JSON.stringify(keys) };
  await build({ ...common, entryPoints: ['src/extension/popup/popup.ts'], outfile: join(outdir, 'popup.js'), define });
  await build({ ...common, entryPoints: ['src/extension/content/index.ts'], outfile: join(outdir, 'content.js'), globalName: 'VeiltraceContent' });
  await build({ ...common, entryPoints: ['src/extension/auto/content-auto.ts'], outfile: join(outdir, 'auto.js'), define });
  await build({ ...common, entryPoints: ['src/extension/background/worker.ts'], outfile: join(outdir, 'background.js'), define });
  for (const [name, code] of Object.entries(await buildOcrFiles())) writeFileSync(join(outdir, name), code);
  copyFileSync('src/extension/popup/popup.html', join(outdir, 'popup.html'));
  copyFileSync('src/extension/popup/popup.css', join(outdir, 'popup.css'));
  for (const [name, png] of Object.entries(icons())) writeFileSync(join(outdir, 'icons', name), png);
  const manifest = JSON.parse(readFileSync('src/extension/manifest.json', 'utf8'));
  manifest.version = JSON.parse(readFileSync('package.json', 'utf8')).extensionVersion ?? manifest.version;
  if (test) {
    manifest.name = 'VeilTrace (TEST BUILD)';
    manifest.host_permissions = TEST_HOST_PERMISSIONS;
  }
  if (test) manifest.permissions = [...manifest.permissions, 'storage'];
  const final = managed ? managedManifest(manifest) : manifest;
  if (managed) writeFileSync(join(outdir, 'managed-schema.json'), JSON.stringify(MANAGED_SCHEMA, null, 2) + '\n');
  writeFileSync(join(outdir, 'manifest.json'), JSON.stringify(firefox ? firefoxManifest(final) : final, null, 2) + '\n');
  return outdir;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const test = process.argv.includes('--test');
  const ai = process.argv.includes('--ai') || test;
  const outdir = process.argv.includes('--ai') && !test ? 'dist/extension-ai' : undefined;
  console.log(`built ${await buildExtension({ test, ai, firefox: process.argv.includes('--firefox'), managed: process.argv.includes('--managed'), ...(outdir ? { outdir } : {}) })}`);
}
