// Two independent clean builds: copies the source tree (tracked + untracked, not ignored) into two fresh
// directories, runs `npm ci --offline` in each, builds a release in each and compares ALL outputs
// (ZIP, artifact SBOM, release manifest). From a clean committed tree both builds are 'candidate' releases,
// so they are comparable with `npm run release:candidate`; otherwise both are 'development' builds.
//   node scripts/repro-check.mjs [--work <dir>]
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const i = process.argv.indexOf('--work');
const work = mkdtempSync(join(i >= 0 ? process.argv[i + 1] : tmpdir(), 'veiltrace-repro-'));
const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const env = {
  ...process.env,
  RELEASE_COMMIT: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  RELEASE_DIRTY: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim() ? '1' : '0',
  SOURCE_DATE_EPOCH: execFileSync('git', ['log', '-1', '--format=%ct'], { encoding: 'utf8' }).trim(),
};
const releaseType = env.RELEASE_DIRTY === '0' ? 'candidate' : 'development';
const results = [];
for (const name of ['build-a', 'build-b']) {
  const dir = join(work, name);
  for (const f of files) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    cpSync(f, join(dir, f));
  }
  execFileSync('npm', ['ci', '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: dir, env, stdio: 'ignore' });
  execFileSync('node', ['scripts/release.mjs', '--out', 'release', ...(releaseType === 'candidate' ? ['--candidate'] : [])], { cwd: dir, env, stdio: 'ignore' });
  const manifest = JSON.parse(readFileSync(join(dir, 'release', 'release-manifest.json'), 'utf8'));
  if (manifest.releaseType !== releaseType) throw new Error(`${name}: expected ${releaseType}, got ${manifest.releaseType}`);
  results.push({ name, sums: readFileSync(join(dir, 'release', 'SHA256SUMS'), 'utf8') });
}
const identical = results[0].sums === results[1].sums;
console.log(JSON.stringify({ work, releaseType, commit: env.RELEASE_COMMIT, identical, sha256sums: results[0].sums.trim().split('\n'), ...(identical ? {} : { other: results[1].sums.trim().split('\n') }) }, null, 1));
if (identical) rmSync(work, { recursive: true, force: true });
process.exitCode = identical ? 0 : 1;
