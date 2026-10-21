// Realistic demo scenes (demo/scenes): each lure is flagged by its own detector, each legitimate counterpart by none.
// The scenes show how VeilTrace works; their wording overlaps the development fixtures, so this is not an accuracy measure.
import { readFileSync } from 'node:fs';
import type { Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyze, analyzeCredentials, analyzePayments, analyzeSupport, type Verdict } from '../../src/core/index.js';
import { extract, launch, openOffline } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

const BASE = 'https://demo.veiltrace.test/';
const ALERT = ['suspicious_correlation', 'manipulative_instruction'];

async function verdicts(file: string, click?: string): Promise<Record<string, Verdict>> {
  const files = { [BASE + file]: readFileSync(`demo/scenes/${file}`, 'utf8'), [`${BASE}style.css`]: readFileSync('demo/scenes/style.css', 'utf8') };
  const { page, context, blocked } = await openOffline(browser, files, BASE + file);
  if (click) {
    await page.click(click);
    await page.waitForTimeout(900);
  }
  const { snapshot } = await extract(page);
  await context.close();
  expect(blocked).toEqual([]);
  return { cmd: analyze(snapshot).verdict, cred: analyzeCredentials(snapshot).verdict, pay: analyzePayments(snapshot).verdict, sup: analyzeSupport(snapshot).verdict };
}

describe('demo scenes', () => {
  for (const [file, cat, click] of [['cmd-lure.html', 'cmd', '#cm-check'], ['cred-lure.html', 'cred'], ['pay-lure.html', 'pay'], ['sup-lure.html', 'sup']] as const) {
    it(`${file}: flagged by the ${cat} detector`, async () => {
      const v = await verdicts(file, click);
      expect(ALERT, JSON.stringify(v)).toContain(v[cat]);
    });
  }
  for (const file of ['cmd-benign.html', 'cred-benign.html', 'pay-benign.html', 'sup-benign.html', 'index.html']) {
    it(`${file}: no detector alerts`, async () => {
      const v = await verdicts(file);
      for (const [cat, verdict] of Object.entries(v)) expect(ALERT, `${cat}: ${verdict}`).not.toContain(verdict);
    });
  }
  it('cmd-lure.html: already manipulative before the click, because the fake check stages a hidden command for the clipboard (R2)', async () => {
    const r = analyze((await (async () => {
      const files = { [`${BASE}cmd-lure.html`]: readFileSync('demo/scenes/cmd-lure.html', 'utf8') };
      const { page, context } = await openOffline(browser, files);
      const out = await extract(page);
      await context.close();
      return out;
    })()).snapshot);
    expect(r.verdict).toBe('manipulative_instruction');
    expect(r.findings[0]!.ruleId).toBe('R2');
  });
});
