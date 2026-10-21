// Supply-chain report: CycloneDX SBOMs (toolchain + runtime), license review, lockfile integrity and
// dependency audit. Writes release/supply-chain/. `--offline` skips `npm audit` (needs the npm registry).
// Nothing here is part of the shipped extension; the extension has zero runtime dependencies.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'release/supply-chain';
const offline = process.argv.includes('--offline');

/** Permissive licenses acceptable for development tooling and compatible with Apache-2.0 distribution. */
export const ALLOWED_LICENSES = new Set(['MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'BlueOak-1.0.0', 'CC0-1.0', 'Python-2.0', 'CC-BY-4.0', 'MIT-0']);

export function sourceDateEpoch() {
  if (process.env.SOURCE_DATE_EPOCH) return Number(process.env.SOURCE_DATE_EPOCH);
  try {
    return Number(execFileSync('git', ['log', '-1', '--format=%ct'], { encoding: 'utf8' }).trim());
  } catch {
    return 315532800; // 1980-01-01, the ZIP epoch
  }
}

function sbom(omitDev) {
  const args = ['sbom', '--sbom-format', 'cyclonedx', ...(omitDev ? ['--omit', 'dev'] : [])];
  const j = JSON.parse(execFileSync('npm', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  // Determinism: drop the random serial number and pin the timestamp to the source date.
  delete j.serialNumber;
  j.metadata.timestamp = new Date(sourceDateEpoch() * 1000).toISOString();
  j.components = (j.components ?? []).sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
  return j;
}

function licenseOf(c) {
  const l = c.licenses ?? [];
  return l.map((x) => x.license?.id ?? x.license?.name ?? x.expression).filter(Boolean).join(' OR ') || 'UNKNOWN';
}

export function licenseReview(components) {
  const counts = {};
  const review = [];
  for (const c of components) {
    const lic = licenseOf(c);
    counts[lic] = (counts[lic] ?? 0) + 1;
    const parts = lic.replace(/[()]/g, '').split(/\s+(?:OR|AND)\s+/);
    const ok = lic.includes(' AND ') ? parts.every((p) => ALLOWED_LICENSES.has(p)) : parts.some((p) => ALLOWED_LICENSES.has(p));
    if (!ok) review.push({ name: c.name, version: c.version, license: lic });
  }
  return { counts: Object.fromEntries(Object.entries(counts).sort()), needsReview: review };
}

export function lockfileCheck() {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const entries = Object.entries(lock.packages).filter(([k]) => k !== '');
  return {
    lockfileVersion: lock.lockfileVersion,
    packages: entries.length,
    missingIntegrity: entries.filter(([, v]) => !v.integrity && !v.link).map(([k]) => k),
    nonRegistrySources: entries.filter(([, v]) => v.resolved && !v.resolved.startsWith('https://registry.npmjs.org/')).map(([k]) => k),
    nonDevPackages: entries.filter(([, v]) => !v.dev).map(([k]) => k),
    runtimeDependencies: Object.keys(pkg.dependencies ?? {}),
    devDependenciesPinned: Object.entries(pkg.devDependencies ?? {}).every(([, v]) => /^\d+\.\d+\.\d+$/.test(v)),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(OUT, { recursive: true });
  const toolchain = sbom(false);
  const runtime = sbom(true);
  writeFileSync(join(OUT, 'sbom-toolchain.cdx.json'), JSON.stringify(toolchain, null, 2) + '\n');
  writeFileSync(join(OUT, 'sbom-runtime.cdx.json'), JSON.stringify(runtime, null, 2) + '\n');
  const licenses = licenseReview(toolchain.components);
  const lockfile = lockfileCheck();
  let audit = { skipped: 'offline' };
  if (!offline) {
    let raw;
    try {
      raw = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8' });
    } catch (e) {
      raw = e.stdout; // npm audit exits non-zero when it finds vulnerabilities
    }
    const j = JSON.parse(raw);
    audit = { date: new Date().toISOString().slice(0, 10), vulnerabilities: j.metadata?.vulnerabilities, advisories: Object.keys(j.vulnerabilities ?? {}) };
  }
  const report = {
    note: 'The shipped extension bundles only first-party code (Apache-2.0). Third-party packages are development tooling only.',
    runtimeComponents: runtime.components.length,
    toolchainComponents: toolchain.components.length,
    lockfile,
    licenses,
    audit,
  };
  writeFileSync(join(OUT, 'supply-chain-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ runtimeComponents: report.runtimeComponents, toolchainComponents: report.toolchainComponents, licensesNeedingReview: licenses.needsReview, licenseCounts: licenses.counts, lockfile: { ...lockfile, nonDevPackages: lockfile.nonDevPackages.length }, audit }, null, 1));
}
