// Deterministic release of the production Chromium extension.
//   node scripts/release.mjs [--out release] [--candidate]
// releaseType is 'development' by default. '--candidate' refuses a dirty working tree and records a clean
// source commit. No build is labelled "official": that would require signed distribution (DEPLOYMENT.md §5).
// Produces: <out>/veiltrace-chromium-<version>.zip, <out>/release-manifest.json, <out>/SHA256SUMS
// SHA-256 checksums detect accidental or local modification. They do NOT prove who built the artifact:
// authenticity requires signed distribution (see docs/DEPLOYMENT.md).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildExtension } from './build-extension.mjs';
import { writeZip } from './lib/zip.mjs';
import { sourceDateEpoch } from './supply-chain.mjs';

export const sha256 = (b) => createHash('sha256').update(b).digest('hex');

function walk(dir) {
  return readdirSync(dir).sort().flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
}

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function constant(file, name) {
  const m = readFileSync(file, 'utf8').match(new RegExp(`export const ${name} = '([^']+)'`));
  if (!m) throw new Error(`${name} not found in ${file}`);
  return m[1];
}

function toolVersion(pkg) {
  return JSON.parse(readFileSync(join('node_modules', pkg, 'package.json'), 'utf8')).version;
}

export async function release({ out = 'release', candidate = false } = {}) {
  // Remove artifacts from earlier versions so a release directory always holds exactly one release.
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(out)) if (/^veiltrace-chromium-.*\.(zip|cdx\.json)$/.test(f) || f === 'SHA256SUMS' || f === 'release-manifest.json') rmSync(join(out, f));
  const buildDir = join(out, 'build', 'extension');
  await buildExtension({ test: false, outdir: buildDir });
  const files = walk(buildDir).map((p) => ({ path: relative(buildDir, p).split('\\').join('/'), data: readFileSync(p) }));
  const epoch = sourceDateEpoch();
  const zip = writeZip(files, epoch);
  const extManifest = JSON.parse(readFileSync(join(buildDir, 'manifest.json'), 'utf8'));
  const version = extManifest.version;
  const zipName = `veiltrace-chromium-${version}.zip`;
  const commit = process.env.RELEASE_COMMIT ?? git(['rev-parse', 'HEAD']) ?? 'unknown';
  const dirty = process.env.RELEASE_DIRTY !== undefined ? process.env.RELEASE_DIRTY === '1' : (git(['status', '--porcelain']) ?? '') !== '';
  if (candidate && (dirty || commit === 'unknown')) throw new Error('--candidate requires a clean, committed working tree');
  // Artifact SBOM: describes what is distributed (first-party code only, no third-party components).
  const sbomName = `veiltrace-chromium-${version}.cdx.json`;
  const sbom = {
    bomFormat: 'CycloneDX', specVersion: '1.5', version: 1,
    metadata: {
      timestamp: new Date(epoch * 1000).toISOString(),
      component: {
        type: 'application', name: 'veiltrace-chromium', version,
        licenses: [{ license: { id: 'Apache-2.0' } }],
        hashes: [{ alg: 'SHA-256', content: sha256(zip) }],
        properties: [{ name: 'veiltrace:source-commit', value: commit }, { name: 'veiltrace:third-party-code', value: 'none' }],
      },
    },
    components: [],
  };
  const sbomBytes = Buffer.from(JSON.stringify(sbom, null, 2) + '\n');
  const manifest = {
    product: 'VeilTrace for Chromium',
    releaseType: candidate ? 'candidate' : 'development',
    extensionVersion: version,
    engine: {
      default: constant('src/core/constants.ts', 'ENGINE_VERSION'),
      defaultRuleset: 'm5',
      baseline: { ruleset: 'm1', version: constant('src/core/constants.ts', 'ENGINE_VERSION_M1'), usedByExtension: false },
    },
    extractorVersion: constant('src/extract/extract.ts', 'EXTRACTOR_VERSION'),
    source: { commit, dirty, sourceDateEpoch: epoch },
    toolchain: { node: process.versions.node, esbuild: toolVersion('esbuild') },
    permissions: extManifest.permissions,
    hostPermissions: extManifest.host_permissions ?? [],
    optionalHostPermissions: extManifest.optional_host_permissions ?? [],
    files: files.map((f) => ({ path: f.path, size: f.data.length, sha256: sha256(f.data) })),
    artifact: { file: zipName, size: zip.length, sha256: sha256(zip) },
    sbom: { file: sbomName, sha256: sha256(sbomBytes), thirdPartyComponents: 0 },
    notice: 'Checksums detect modification of this artifact; they do not establish authenticity. Verify the source commit and obtain releases through a trusted, signed channel.',
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(out, zipName), zip);
  writeFileSync(join(out, sbomName), sbomBytes);
  writeFileSync(join(out, 'release-manifest.json'), manifestBytes);
  writeFileSync(join(out, 'SHA256SUMS'), `${sha256(zip)}  ${zipName}\n${sha256(sbomBytes)}  ${sbomName}\n${sha256(manifestBytes)}  release-manifest.json\n`);
  rmSync(join(out, 'build'), { recursive: true, force: true });
  return { zipName, zipSha256: sha256(zip), manifestSha256: sha256(manifestBytes), sbomSha256: sha256(sbomBytes), commit, dirty, releaseType: manifest.releaseType };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--out');
  const out = i >= 0 ? process.argv[i + 1] : 'release';
  mkdirSync(out, { recursive: true });
  console.log(JSON.stringify(await release({ out, candidate: process.argv.includes('--candidate') }), null, 1));
}
