// The fictional demo site (demo/nusaverta) in the real extension popup (TEST build): the presenter flow.
import type { Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addDemoSite, launchExtension, rules, scanUrl, shot, verdict, type Loaded } from './helpers.js';

let en: Loaded;
let id: Loaded;
beforeAll(async () => { [en, id] = await Promise.all([launchExtension('test', 'en-US'), launchExtension('test', 'id')]); });
afterAll(async () => { await Promise.all([en.context.close(), id.context.close()]); });

const snippets = (popup: Page): Promise<string[]> => popup.$$eval('article.finding .snippet', (els) => els.map((e) => e.textContent ?? ''));

describe('demo site in the extension popup', () => {
  it('lure in the third-party community widget → manipulative (R1); Show on page highlights inside the widget', async () => {
    const site = addDemoSite(en, 'https://help.nusaverta.test/');
    const { target, popup } = await scanUrl(en, site.lure);
    expect(await verdict(popup)).toBe('manipulative_instruction');
    expect(await rules(popup)).toEqual(['R1:manipulative_instruction']);
    expect(await snippets(popup)).toEqual(['Verify you are human', 'Windows + R', 'Ctrl + V', 'Press Enter', "I'm not a robot"]);
    expect(await popup.textContent('#meta')).toContain('Engine 0.3.0');
    expect(await popup.getAttribute('.coverage', 'data-complete')).toBe('true');
    await popup.click('article.finding button:has-text("Show on page") >> nth=1');
    await popup.waitForSelector('.hl-status[data-result]');
    expect(await popup.getAttribute('.hl-status[data-result]', 'data-result')).toBe('highlighted');
    const inside = await target.evaluate(() => {
      const box = document.querySelector('[data-veiltrace-highlight]')!.getBoundingClientRect();
      const w = document.getElementById('community-widget')!.getBoundingClientRect();
      return box.left >= w.left - 8 && box.right <= w.right + 8 && box.top >= w.top - 8 && box.bottom <= w.bottom + 8;
    });
    expect(inside).toBe(true);
    await shot(popup, '20-demo-lure-en');
    expect(en.blocked).toEqual([]);
  });

  it('benign state → no suspicious instructions; developer docs → observed instructions only', async () => {
    const site = addDemoSite(en, 'https://help.nusaverta.test/');
    const benign = await scanUrl(en, site.benign);
    expect(await verdict(benign.popup)).toBe('none');
    const cli = await scanUrl(en, site.cli);
    expect(await verdict(cli.popup)).toBe('observed_instruction');
    expect(await rules(cli.popup)).toEqual(['R5:observed_instruction', 'R5:observed_instruction']);
    for (const p of [benign.popup, cli.popup]) expect((await p.textContent('body'))!.toLowerCase()).not.toContain('safe');
  });

  it('Indonesian popup; switching to English re-renders without rescanning', async () => {
    const site = addDemoSite(id, 'https://help.nusaverta.test/');
    const { popup } = await scanUrl(id, site.lure);
    expect(await popup.textContent('.threat-summary h2')).toBe('Konten manipulatif terdeteksi');
    const injections = await popup.getAttribute('body', 'data-injections');
    const meta = await popup.textContent('#meta');
    await popup.click('#lang-en');
    expect(await popup.textContent('.threat-summary h2')).toBe('Manipulative content detected');
    expect(await verdict(popup)).toBe('manipulative_instruction');
    expect(await snippets(popup)).toEqual(['Verify you are human', 'Windows + R', 'Ctrl + V', 'Press Enter', "I'm not a robot"]);
    expect(await popup.getAttribute('body', 'data-injections')).toBe(injections);
    expect((await popup.textContent('#meta'))!.match(/\d+ ms/)?.[0]).toBe(meta!.match(/\d+ md/)?.[0]?.replace('md', 'ms'));
    await shot(popup, '21-demo-lure-id-to-en');
  });

  it('domain invariance: the same page under a fictional "trusted bank" host gives the same verdict and evidence', async () => {
    const a = addDemoSite(en, 'https://help.nusaverta.test/');
    const b = addDemoSite(en, 'https://portal.trusted-bank.example/help/');
    const ra = await scanUrl(en, a.lure);
    const rb = await scanUrl(en, b.lure);
    expect(await verdict(rb.popup)).toBe(await verdict(ra.popup));
    expect(await rules(rb.popup)).toEqual(await rules(ra.popup));
    expect(await snippets(rb.popup)).toEqual(await snippets(ra.popup));
    expect(await rb.popup.textContent('#target-host')).toBe('portal.trusted-bank.example');
  });
});
