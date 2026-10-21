// M5.3: the EXPERIMENTAL support-impersonation detector through the real extractor, on the sup-dev corpus and a privacy page.
import type { Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyzeSupport } from '../../src/core/index.js';
import { loadSupDev, runSupScenario, SUP_SENTINEL } from '../../src/eval/support.js';
import { extract, html, launch, openOffline } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

describe('support-detector privacy through the real extractor', () => {
  it('phone numbers on the page and values typed into a callback form never reach the result', async () => {
    const page = html(`<main><p>Your computer is infected. Call Windows Support now: +1 (888) 555-0199</p>
      <form action="/cb"><label for="ph">Your phone</label><input id="ph" type="tel" value="0812-DEFAULT-0000"></form></main>`);
    const { page: p, context } = await openOffline(browser, { 'https://callback.test/': page });
    await p.fill('#ph', SUP_SENTINEL);
    const r = analyzeSupport((await extract(p)).snapshot);
    const json = JSON.stringify(r);
    for (const secret of [SUP_SENTINEL, '0812-DEFAULT-0000', '555-0199', '8885550199']) expect(json).not.toContain(secret);
    expect(r.findings.map((f) => `${f.ruleId}:${f.classification}`)).toEqual(['SR1:manipulative_instruction']);
    await context.close();
  });
});

describe('sup-dev corpus through the real extractor', () => {
  for (const sc of loadSupDev()) {
    it(`${sc.label.id}: no typed value or number leaks, no network, other detectors unaffected, true positives localized`, async () => {
      const run = await runSupScenario(browser, sc);
      expect(run.sentinelLeaked).toBe(false);
      expect(run.digitsLeaked).toBe(false);
      expect(run.requestsDuringScan).toBe(0);
      expect(run.clickfixVerdict).toBe('none');
      expect(['none', 'observed_instruction']).toContain(run.credentialVerdict);
      expect(['none', 'observed_instruction']).toContain(run.paymentVerdict);
      if (run.localized !== null) expect(run.localized).toBe(true);
      // Hard negatives must never alert (development regression guard, not a metric).
      if (sc.label.hardNegative) expect(['none', 'observed_instruction']).toContain(run.result.verdict);
    });
  }
});
