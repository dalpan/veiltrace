// The fictional demo site (demo/nusaverta) through the real extractor and the frozen default engine (0.2.0).
// Also the domain-invariance demonstration: identical content under different hosts gives identical results.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyze, ENGINE_VERSION, type AnalysisResult, type PageSnapshot } from '../../src/core/index.js';
import { extract, launch } from './helpers.js';

const DIR = join('demo', 'nusaverta');
const FILES = ['index.html', 'benign.html', 'cli.html', 'style.css'];
/** Same bytes, different hosts: a fictional SaaS, a fictional "trusted bank", a documentation IP and localhost. */
const HOSTS = ['https://help.nusaverta.test/', 'https://portal.trusted-bank.example/help/', 'http://192.0.2.10/', 'http://localhost:8080/demo/'];

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

/** Serves the demo files under `base`, extracts `file`, and counts every request made during extraction. */
async function scanDemo(base: string, file: string): Promise<{ snapshot: PageSnapshot; result: AnalysisResult; requestsDuringScan: number; blocked: string[] }> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const requests: string[] = [];
  const blocked: string[] = [];
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    requests.push(url);
    const name = url.startsWith(base) ? url.slice(base.length) : null;
    if (name !== null && FILES.includes(name)) {
      await route.fulfill({ status: 200, body: readFileSync(join(DIR, name), 'utf8'), headers: { 'content-type': name.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' } });
    } else {
      blocked.push(url);
      await route.abort('blockedbyclient');
    }
  });
  try {
    const page = await context.newPage();
    await page.goto(base + file, { waitUntil: 'load' });
    const before = requests.length;
    const { snapshot } = await extract(page);
    return { snapshot, result: analyze(snapshot), requestsDuringScan: requests.length - before, blocked };
  } finally {
    await context.close();
  }
}

const evidence = (r: AnalysisResult, i = 0): string[] => r.findings[i]!.observationIds.map((id) => r.observations.find((o) => o.id === id)!.text);

describe('demo site with the frozen engine (no demo-specific rules)', () => {
  it('community-post lure → manipulative (R1), evidence only from the third-party widget, no network', async () => {
    const { snapshot, result, requestsDuringScan, blocked } = await scanDemo(HOSTS[0]!, 'index.html');
    expect(result.engineVersion).toBe(ENGINE_VERSION);
    expect(result.verdict).toBe('manipulative_instruction');
    expect(result.findings.map((f) => `${f.ruleId}:${f.classification}`)).toEqual(['R1:manipulative_instruction']);
    expect(evidence(result)).toEqual(['Verify you are human', 'Windows + R', 'Ctrl + V', 'Press Enter', "I'm not a robot"]);
    for (const id of result.findings[0]!.observationIds) {
      const src = result.observations.find((o) => o.id === id)!.source;
      const locator = src.type === 'block' ? snapshot.blocks.find((b) => b.id === src.blockId)!.locator : snapshot.copyTriggers.find((t) => t.id === (src as { triggerId: string }).triggerId)!.locator;
      expect(locator).toMatch(/community-widget|post-2|locked-attachment/);
    }
    expect(snapshot.coverage.partial).toEqual([]);
    expect(requestsDuringScan).toBe(0);
    expect(blocked).toEqual([]);
  });

  it('benign state of the same page → none', async () => {
    const { result, requestsDuringScan } = await scanDemo(HOSTS[0]!, 'benign.html');
    expect(result.verdict).toBe('none');
    expect(result.findings).toEqual([]);
    expect(requestsDuringScan).toBe(0);
  });

  it('developer docs with install commands → observed instructions only (R5), never suspicious', async () => {
    const { result } = await scanDemo(HOSTS[0]!, 'cli.html');
    expect(result.verdict).toBe('observed_instruction');
    expect(result.findings.map((f) => `${f.ruleId}:${f.classification}`)).toEqual(['R5:observed_instruction', 'R5:observed_instruction']);
  });

  it('the demo is not special-cased anywhere in shipped or engine code', () => {
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
    for (const f of files('src')) expect(readFileSync(f, 'utf8').toLowerCase(), f).not.toContain('nusaverta');
  });
});

describe('domain invariance (same content, different hostnames)', () => {
  for (const file of ['index.html', 'benign.html', 'cli.html']) {
    it(`${file}: identical extraction and identical analysis under ${HOSTS.length} hosts`, async () => {
      const runs = [];
      for (const host of HOSTS) runs.push(await scanDemo(host, file));
      const [first, ...rest] = runs;
      for (const r of rest) {
        expect(r.result).toEqual(first!.result);
        expect({ ...r.snapshot, url: '' }).toEqual({ ...first!.snapshot, url: '' });
      }
      expect(new Set(runs.map((r) => r.snapshot.url)).size).toBe(HOSTS.length);
    });
  }
});
