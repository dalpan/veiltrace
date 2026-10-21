// Release engineering: deterministic packaging, integrity verification and production policy.
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain ESM build scripts without type declarations
import { release } from '../scripts/release.mjs';
// @ts-expect-error -- plain ESM build scripts without type declarations
import { verifyRelease } from '../scripts/verify-release.mjs';
// @ts-expect-error -- plain ESM build scripts without type declarations
import { readZip, writeZip } from '../scripts/lib/zip.mjs';

const fresh = () => mkdtempSync(join(tmpdir(), 'veiltrace-release-test-'));

describe('deterministic packaging', () => {
  it('two builds from the same tree produce byte-identical artifacts and manifests', async () => {
    const a = fresh();
    const b = fresh();
    const ra = await release({ out: a });
    const rb = await release({ out: b });
    expect(ra.zipSha256).toBe(rb.zipSha256);
    expect(ra.manifestSha256).toBe(rb.manifestSha256);
    expect(readFileSync(join(a, 'SHA256SUMS'), 'utf8')).toBe(readFileSync(join(b, 'SHA256SUMS'), 'utf8'));
  }, 60_000);

  it('the ZIP writer is order- and time-independent of the file system', () => {
    const files = [{ path: 'b.txt', data: Buffer.from('b') }, { path: 'a/x.txt', data: Buffer.from('x'.repeat(1000)) }];
    const z1 = writeZip(files, 1792558197);
    const z2 = writeZip([...files].reverse(), 1792558197);
    expect(Buffer.compare(z1, z2)).toBe(0);
    expect([...readZip(z1).keys()]).toEqual(['a/x.txt', 'b.txt']);
    expect(readZip(z1).get('a/x.txt').toString()).toBe('x'.repeat(1000));
  });
});

describe('release labelling', () => {
  it('a candidate release refuses a dirty tree (or a source without a known commit)', async () => {
    const prev = { c: process.env.RELEASE_COMMIT, d: process.env.RELEASE_DIRTY };
    process.env.RELEASE_COMMIT = 'a'.repeat(40);
    process.env.RELEASE_DIRTY = '1';
    try {
      await expect(release({ out: fresh(), candidate: true })).rejects.toThrow(/clean, committed/);
      process.env.RELEASE_DIRTY = '0';
      const r = await release({ out: fresh(), candidate: true });
      expect(r).toMatchObject({ releaseType: 'candidate', commit: 'a'.repeat(40), dirty: false });
    } finally {
      if (prev.c === undefined) delete process.env.RELEASE_COMMIT;
      else process.env.RELEASE_COMMIT = prev.c;
      if (prev.d === undefined) delete process.env.RELEASE_DIRTY;
      else process.env.RELEASE_DIRTY = prev.d;
    }
  }, 60_000);
});

describe('artifact verification', () => {
  it('passes for an untouched release and reports production policy facts', async () => {
    const dir = fresh();
    await release({ out: dir });
    const r = verifyRelease(dir);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    const manifest = JSON.parse(readFileSync(join(dir, 'release-manifest.json'), 'utf8'));
    expect(manifest.permissions).toEqual(['activeTab', 'scripting']);
    expect(manifest.hostPermissions).toEqual([]);
    expect(manifest.optionalHostPermissions).toEqual(['http://*/*', 'https://*/*']);
    expect(manifest.engine).toEqual({ default: '0.3.0', defaultRuleset: 'm5', baseline: { ruleset: 'm1', version: '0.1.0-m1', usedByExtension: false } });
    expect(manifest.source.commit).toMatch(/^[0-9a-f]{40}$|^unknown$/);
    expect(manifest.notice).toMatch(/do not establish authenticity/);
    expect(manifest.releaseType).toBe('development');
    expect(manifest.sbom.thirdPartyComponents).toBe(0);
    const sbom = JSON.parse(readFileSync(join(dir, manifest.sbom.file), 'utf8'));
    expect(sbom.components).toEqual([]);
    expect(sbom.metadata.component.hashes[0].content).toBe(manifest.artifact.sha256);
    const zip = readZip(readFileSync(join(dir, manifest.artifact.file)));
    expect([...zip.keys()].sort()).toEqual(manifest.files.map((f: { path: string }) => f.path).sort());
  }, 60_000);

  it('detects a modified artifact, a modified manifest and a modified file inside the ZIP', async () => {
    const dir = fresh();
    await release({ out: dir });
    const manifest = JSON.parse(readFileSync(join(dir, 'release-manifest.json'), 'utf8'));
    const zipPath = join(dir, manifest.artifact.file);
    const original = readFileSync(zipPath);

    const flipped = Buffer.from(original);
    flipped[100] = (flipped[100] ?? 0) ^ 0xff;
    writeFileSync(zipPath, flipped);
    expect(verifyRelease(dir).ok).toBe(false);

    // Re-pack with a changed popup.js but a recomputed SHA256SUMS: caught by the per-file manifest hashes.
    const entries = readZip(original);
    entries.set('popup.js', Buffer.concat([entries.get('popup.js'), Buffer.from('\n// tampered')]));
    const repacked = writeZip([...entries].map(([path, data]) => ({ path, data })), manifest.source.sourceDateEpoch);
    writeFileSync(zipPath, repacked);
    const { createHash } = await import('node:crypto');
    const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
    writeFileSync(join(dir, 'SHA256SUMS'), `${sha(repacked)}  ${manifest.artifact.file}\n${sha(readFileSync(join(dir, 'release-manifest.json')))}  release-manifest.json\n`);
    const r = verifyRelease(dir);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/artifact hash\/size differs|file hash mismatch: popup.js/);

    writeFileSync(zipPath, original);
    writeFileSync(join(dir, 'release-manifest.json'), JSON.stringify({ ...manifest, permissions: ['activeTab', 'scripting', 'tabs'] }));
    expect(verifyRelease(dir).errors.join(' ')).toMatch(/checksum mismatch: release-manifest.json/);
  }, 60_000);

  it('rejects a test build or extra permissions inside the artifact', async () => {
    const dir = fresh();
    await release({ out: dir });
    const manifest = JSON.parse(readFileSync(join(dir, 'release-manifest.json'), 'utf8'));
    const entries = readZip(readFileSync(join(dir, manifest.artifact.file)));
    const ext = JSON.parse(entries.get('manifest.json').toString());
    entries.set('manifest.json', Buffer.from(JSON.stringify({ ...ext, name: 'VeilTrace (TEST BUILD)', host_permissions: ['https://*.test/*'],
      optional_host_permissions: ['<all_urls>'], background: { service_worker: 'other.js' } })));
    const zip = writeZip([...entries].map(([path, data]) => ({ path, data })), 0);
    writeFileSync(join(dir, manifest.artifact.file), zip);
    const errors = verifyRelease(dir).errors.join(' ');
    expect(errors).toMatch(/must not declare host_permissions/);
    expect(errors).toMatch(/test build packaged as release/);
    expect(errors).toMatch(/unexpected optional_host_permissions/);
    expect(errors).toMatch(/unexpected background/);
  }, 60_000);
});
