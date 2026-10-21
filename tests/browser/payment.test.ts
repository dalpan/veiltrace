// M5.2: the EXPERIMENTAL payment detector through the real extractor, on the pay-dev corpus and targeted privacy pages.
import type { Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyzePayments } from '../../src/core/index.js';
import { loadPayDev, PAY_SENTINEL, runPayScenario } from '../../src/eval/pay.js';
import { extract, html, launch, openOffline } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

describe('payment privacy through the real extractor', () => {
  it('card numbers typed into a checkout form, and balances shown on the page, never reach the result', async () => {
    const page = html(`<main><p>Your balance: Rp 12.345.678</p><p>Total Rp 90.000. Pay now with your card.</p>
      <form action="/pay"><label for="cn">Card number</label><input id="cn" autocomplete="cc-number" value="4000-DEFAULT-0002">
      <label for="cv">CVC</label><input id="cv" autocomplete="cc-csc"></form></main>`);
    const { page: p, context } = await openOffline(browser, { 'https://checkout.test/': page });
    await p.fill('#cn', PAY_SENTINEL);
    await p.fill('#cv', PAY_SENTINEL);
    const r = analyzePayments((await extract(p)).snapshot);
    const json = JSON.stringify(r);
    for (const secret of [PAY_SENTINEL, '4000-DEFAULT-0002', '12.345.678', '90.000']) expect(json).not.toContain(secret);
    expect(r.findings.map((f) => `${f.ruleId}:${f.classification}`)).toEqual(['PR4:observed_instruction']);
    await context.close();
  });
});

describe('pay-dev corpus through the real extractor', () => {
  for (const sc of loadPayDev()) {
    it(`${sc.label.id}: no typed value leaks, no network, ClickFix and credential results unaffected, true positives localized`, async () => {
      const run = await runPayScenario(browser, sc);
      expect(run.sentinelLeaked).toBe(false);
      expect(run.requestsDuringScan).toBe(0);
      expect(run.clickfixVerdict).toBe('none');
      expect(['none', 'observed_instruction']).toContain(run.credentialVerdict);
      if (run.localized !== null) expect(run.localized).toBe(true);
      // Hard negatives must never alert (development regression guard, not a metric).
      if (sc.label.hardNegative) expect(['none', 'observed_instruction']).toContain(run.result.verdict);
    });
  }
});
