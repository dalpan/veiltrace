// Extension-level end-to-end latency (injection, extraction, detection, transfer, rendering).
// Writes eval/results/extension-perf.json (machine-specific; git-ignored, D-034).
import { mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { perfPages } from '../../src/eval/perfpages.js';
import { percentile } from '../../src/eval/metrics.js';
import { addCorpusScenario, launchExtension, openPopup, openTarget, scan, tabIdOf, type Loaded } from './helpers.js';

interface Timing { injectMs: number; callMs: number; extractMs: number; analyzeMs: number; transferMs: number; renderMs: number; totalMs: number }

let l: Loaded;
beforeAll(async () => { l = await launchExtension('test'); });
afterAll(async () => { await l.context.close(); });

const REPEATS = 3;
const rows: Array<Record<string, unknown>> = [];

async function measure(id: string, url: string): Promise<Timing[]> {
  const target = await openTarget(l, url);
  const popup = await openPopup(l, await tabIdOf(l, target));
  const out: Timing[] = [];
  for (let i = 0; i < REPEATS; i++) {
    await scan(popup);
    out.push(JSON.parse((await popup.getAttribute('body', 'data-timing')) as string) as Timing);
  }
  const reasons = await popup.$$eval('.coverage li', (lis) => lis.map((li) => li.getAttribute('data-reason')));
  const p50 = (k: keyof Timing) => percentile(out.map((t) => t[k]), 50);
  rows.push({
    id, repeats: REPEATS, partial: reasons, verdict: await popup.getAttribute('.summary', 'data-verdict'),
    p50: { inject: p50('injectMs'), extract: p50('extractMs'), analyze: p50('analyzeMs'), transfer: p50('transferMs'), render: p50('renderMs'), total: p50('totalMs') },
    firstScan: out[0],
  });
  await popup.close();
  await target.close();
  return out;
}

describe('extension end-to-end latency', () => {
  it('ordinary pages', async () => {
    for (const id of ['D01-en-blog-security-check-overlay', 'D16-en-vendor-install-script', 'D20-en-news-clickfix-campaign']) {
      const t = await measure(id, addCorpusScenario(l, 'dev', id));
      expect(percentile(t.map((x) => x.totalMs), 50)).toBeLessThan(2000);
    }
  });

  it('large synthetic pages, with extraction under real extension conditions vs the 1,500 ms budget', async () => {
    for (const p of perfPages()) {
      const url = `https://${p.id}.test/`;
      l.pages.set(url, p.html);
      const t = await measure(p.id, url);
      expect(percentile(t.map((x) => x.extractMs), 50)).toBeLessThan(1500);
    }
    mkdirSync('eval/results', { recursive: true });
    writeFileSync('eval/results/extension-perf.json', JSON.stringify({
      note: 'Machine-specific wall-clock timings from the popup (TEST build, headless Chromium). Not committed.',
      rows,
    }, null, 2) + '\n');
  });
});
