// Verifies a release directory produced by scripts/release.mjs. Exit code 0 = all checks passed.
//   node scripts/verify-release.mjs [release-dir]
// Checks integrity (SHA256SUMS, manifest file hashes, ZIP CRCs) and policy (production permissions only,
// no test-build markers, no network APIs). It cannot check authenticity (see docs/DEPLOYMENT.md).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readZip } from './lib/zip.mjs';

/** The only third-party code a release may ship (D-105): the OCR engine and its Indonesian and English models. */
const ALLOWED_THIRD_PARTY = ['tessdata-eng-4.0.0_best_int@1.0.0:Apache-2.0', 'tessdata-ind-4.0.0_best_int@1.0.0:Apache-2.0', 'tesseract.js-core@7.0.0:Apache-2.0'];

const sha256 = (b) => createHash('sha256').update(b).digest('hex');

export function verifyRelease(dir) {
  const errors = [];
  const fail = (m) => errors.push(m);
  const sumsPath = join(dir, 'SHA256SUMS');
  if (!existsSync(sumsPath)) return { ok: false, errors: ['SHA256SUMS missing'] };
  const sums = new Map(readFileSync(sumsPath, 'utf8').trim().split('\n').map((l) => {
    const [hash, name] = l.split(/\s+/);
    return [name, hash];
  }));
  for (const [name, hash] of sums) {
    const p = join(dir, name);
    if (!existsSync(p)) fail(`listed file missing: ${name}`);
    else if (sha256(readFileSync(p)) !== hash) fail(`checksum mismatch: ${name}`);
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(dir, 'release-manifest.json'), 'utf8'));
  } catch {
    return { ok: false, errors: [...errors, 'release-manifest.json unreadable'] };
  }
  const zipPath = join(dir, manifest.artifact.file);
  if (!sums.has(manifest.artifact.file)) fail('artifact not listed in SHA256SUMS');
  if (!existsSync(zipPath)) return { ok: false, errors: [...errors, 'artifact missing'] };
  const zip = readFileSync(zipPath);
  if (sha256(zip) !== manifest.artifact.sha256 || zip.length !== manifest.artifact.size) fail('artifact hash/size differs from release manifest');
  let entries;
  try {
    entries = readZip(zip);
  } catch (e) {
    return { ok: false, errors: [...errors, `zip unreadable: ${e.message}`] };
  }
  const listed = new Map(manifest.files.map((f) => [f.path, f]));
  for (const [path, data] of entries) {
    const f = listed.get(path);
    if (!f) fail(`unexpected file in artifact: ${path}`);
    else if (sha256(data) !== f.sha256 || data.length !== f.size) fail(`file hash mismatch: ${path}`);
  }
  for (const path of listed.keys()) if (!entries.has(path)) fail(`file missing from artifact: ${path}`);
  const ext = entries.has('manifest.json') ? JSON.parse(entries.get('manifest.json').toString('utf8')) : null;
  if (!ext) fail('extension manifest.json missing');
  else {
    if (JSON.stringify(ext.permissions) !== JSON.stringify(['activeTab', 'scripting'])) fail(`unexpected permissions: ${JSON.stringify(ext.permissions)}`);
    for (const k of ['host_permissions', 'content_scripts', 'externally_connectable', 'web_accessible_resources']) {
      if (ext[k] !== undefined) fail(`production manifest must not declare ${k}`);
    }
    // D-081: opt-in automatic scanning may only add these two, exactly.
    if (ext.optional_host_permissions !== undefined && JSON.stringify(ext.optional_host_permissions) !== JSON.stringify(['http://*/*', 'https://*/*'])) {
      fail(`unexpected optional_host_permissions: ${JSON.stringify(ext.optional_host_permissions)}`);
    }
    if (ext.background !== undefined && JSON.stringify(ext.background) !== JSON.stringify({ service_worker: 'background.js' })) {
      fail(`unexpected background: ${JSON.stringify(ext.background)}`);
    }
    if (/TEST BUILD/.test(ext.name)) fail('test build packaged as release');
    const csp = String(ext.content_security_policy?.extension_pages ?? '');
    if (!csp.includes("connect-src 'none'")) fail("CSP lacks connect-src 'none'");
    // D-105: WebAssembly for the OCR worker is the only addition; never 'unsafe-eval' or a remote source.
    if (!csp.includes("script-src 'self' 'wasm-unsafe-eval';") || /unsafe-eval'|https?:/.test(csp.replace("'wasm-unsafe-eval'", ''))) fail(`unexpected script-src: ${csp}`);
    if (ext.version !== manifest.extensionVersion) fail('extension version differs from release manifest');
  }
  // Artifact SBOM must match the artifact and declare no third-party components except the OCR engine and models (D-105).
  if (!manifest.sbom || !sums.has(manifest.sbom.file)) fail('artifact SBOM missing or not listed in SHA256SUMS');
  else {
    try {
      const sbom = JSON.parse(readFileSync(join(dir, manifest.sbom.file), 'utf8'));
      if (sbom.bomFormat !== 'CycloneDX') fail('SBOM is not CycloneDX');
      const names = (sbom.components ?? []).map((c) => `${c.name}@${c.version}:${c.licenses?.[0]?.license?.id}`).sort();
      if (JSON.stringify(names) !== JSON.stringify(ALLOWED_THIRD_PARTY)) fail(`unexpected third-party components: ${JSON.stringify(names)}`);
      if (sbom.metadata?.component?.hashes?.[0]?.content !== manifest.artifact.sha256) fail('SBOM hash does not match the artifact');
      if (sbom.metadata?.component?.licenses?.[0]?.license?.id !== 'Apache-2.0') fail('SBOM license is not Apache-2.0');
    } catch {
      fail('artifact SBOM unreadable');
    }
  }
  if (!['development', 'candidate'].includes(manifest.releaseType)) fail(`unknown releaseType: ${manifest.releaseType}`);
  if (manifest.releaseType === 'candidate' && manifest.source.dirty) fail('candidate built from a dirty tree');
  // No third-party (e.g. MPL-2.0 dev tooling) code may be shipped.
  for (const [path, data] of entries) {
    const text = data.toString('utf8');
    for (const marker of ['Mozilla Public License', 'lightningcss', 'node_modules']) if (text.includes(marker)) fail(`${path} contains "${marker}"`);
  }
  for (const [path, data] of entries) {
    if (!path.endsWith('.js')) continue;
    const code = data.toString('utf8');
    // D-081: the one-way auto-scan channel may only send from auto.js and receive in background.js.
    const channel = { 'auto.js': ['sendMessage'], 'background.js': ['onMessage'] }[path] ?? [];
    for (const bad of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'eval(', 'new Function', 'URLSearchParams', 'sendMessage', 'onMessage', 'onConnect', 'onMessageExternal']) {
      if (!channel.includes(bad) && code.includes(bad)) fail(`${path} contains ${bad}`);
    }
  }
  return { ok: errors.length === 0, errors, version: manifest.extensionVersion, releaseType: manifest.releaseType, artifact: manifest.artifact, source: manifest.source };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = verifyRelease(process.argv[2] ?? 'release');
  console.log(JSON.stringify(r, null, 1));
  process.exitCode = r.ok ? 0 : 1;
}
