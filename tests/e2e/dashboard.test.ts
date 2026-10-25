// M5.4: the unified threat dashboard in the real extension popup (TEST build): summary, overview, ranking, grouping with
// provenance, evidence highlighting, keyboard use, language switching, partial and empty scans, layout at popup widths.
import type { Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { perfPages } from '../../src/eval/perfpages.js';
import { MULTI_THREAT_BODY } from '../fixtures/dashboard-page.js';
import { html, launchExtension, openPopup, openTarget, scanUrl, shot, tabIdOf, type Loaded } from './helpers.js';

let en: Loaded;
let id: Loaded;
beforeAll(async () => { [en, id] = await Promise.all([launchExtension('test', 'en-US'), launchExtension('test', 'id')]); });
afterAll(async () => { await Promise.all([en.context.close(), id.context.close()]); });

const RANK = { manipulative_instruction: 2, suspicious_correlation: 1, observed_instruction: 0 } as Record<string, number>;
const cards = (p: Page) => p.$$eval('#result > details.tech > article.finding, #result > details.tech > .finding-group > article.finding', (els) => els.map((e) => ({
  category: e.getAttribute('data-category'), cls: e.getAttribute('data-classification'), risk: e.getAttribute('data-risk'), fid: e.getAttribute('data-finding-id'),
})));
/** Page-text snippets only: placeholders for withheld amounts and numbers are UI text and are translated. */
const pageSnippets = (p: Page) => p.$$eval('.snippet', (els) => els.map((e) => e.textContent ?? '').filter((t) => !t.startsWith('(')));
const noHorizontalOverflow = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

describe('unified threat dashboard', () => {
  it('multi-threat page: page summary, category overview, ranked unified list and advice for each affected category', async () => {
    en.pages.set('https://multi.test/', html(MULTI_THREAT_BODY));
    const { popup } = await scanUrl(en, 'https://multi.test/');
    expect(await popup.getAttribute('.threat-summary', 'data-verdict')).toBe('manipulative_instruction');
    // Plain view first (D-107): what is asked, why it is a warning sign, what to do; one item per affected category.
    expect(await popup.getAttribute('.plain', 'data-verdict')).toBe('manipulative_instruction');
    expect(await popup.$$eval('.plain-item', (els) => els.map((e) => e.getAttribute('data-category')))).toHaveLength(3);
    expect(await popup.textContent('.plain h2')).toBe('Stop: this content shows signs of manipulation');
    expect(await popup.textContent('.threat-summary h2')).toBe('Manipulative content detected');
    expect(await popup.textContent('.stat[data-stat="actionable"] dd')).toBe('4');
    expect(await popup.textContent('.stat[data-stat="categories"] dd')).toBe('CMD · CRED · PAY · SUP');
    expect(await popup.textContent('.stat[data-stat="coverage"] dd')).toBe('Complete');
    expect(await popup.textContent('#scan-state')).toBe('SCAN COMPLETE');
    expect(await popup.textContent('#version')).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(await popup.$$eval('.cat', (els) => els.map((e) => [e.getAttribute('data-category'), e.getAttribute('data-verdict')]))).toEqual([
      ['command', 'manipulative_instruction'], ['credential', 'manipulative_instruction'], ['payment', 'manipulative_instruction'], ['support', 'manipulative_instruction'],
    ]);
    expect(await popup.getAttribute('.advice', 'data-advice')).toBe('command credential payment support');
    // One list for all detectors, never increasing in classification; F-ids follow the visual order.
    const list = await cards(popup);
    expect(new Set(list.map((c) => c.category))).toEqual(new Set(['command', 'credential', 'payment', 'support']));
    const ranks = list.map((c) => RANK[c.cls ?? ''] ?? -1);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    expect(list.map((c) => c.fid)).toEqual(list.map((_, i) => `F-${String(i + 1).padStart(2, '0')}`));
    // Classification, confidence and action risk stay separate chips on every card.
    for (const card of await popup.$$('article.finding')) {
      expect(await card.$$eval('.chip', (els) => els.map((e) => e.className))).toEqual(expect.arrayContaining([
        expect.stringMatching(/chip (manipulative_instruction|suspicious_correlation|observed_instruction)/), 'chip severity', expect.stringMatching(/chip risk-chip (high|medium)/)]));
      expect(await card.$$eval('.chip', (els) => els.some((e) => /^Confidence: /.test(e.textContent ?? '')))).toBe(true);
    }
    expect(await noHorizontalOverflow(popup)).toBe(true);
    expect((await popup.textContent('body'))!.toLowerCase()).not.toMatch(/\bsafe\b/);
    expect(await popup.content()).not.toContain('555 0199');
    await shot(popup, '60-dashboard-multi-en');
    expect(en.blocked).toEqual([]);
  });

  it('groups findings that cite the same element, keeps each detector’s card and evidence, and marks the shared evidence', async () => {
    en.pages.set('https://multi.test/', html(MULTI_THREAT_BODY));
    const { target, popup } = await scanUrl(en, 'https://multi.test/');
    const group = popup.locator('.finding-group');
    expect(await group.count()).toBe(1);
    expect(await group.getAttribute('data-group-size')).toBe('2');
    expect((await group.locator('article.finding').evaluateAll((els) => els.map((e) => e.getAttribute('data-category')))).sort()).toEqual(['payment', 'support']);
    expect(await group.locator('.group-head').textContent()).toBe('2 related findings on the same page element');
    for (const c of await group.locator('article.finding').all()) expect(await c.locator('.evidence li').count()).toBeGreaterThan(0);
    expect(await group.locator('.shared').first().textContent()).toMatch(/^Also cited by: (Payment Manipulation|Support & Authority Impersonation)$/);
    // Evidence ids are unique across the dashboard.
    const ids = await popup.$$eval('[data-evidence-id]', (els) => els.map((e) => e.getAttribute('data-evidence-id')));
    expect(new Set(ids).size).toBe(ids.length);
    // Show on page works from inside a group and lands on the shared element.
    await group.locator('li', { hasText: 'Your computer is infected' }).first().locator('button.show').click();
    await popup.waitForSelector('.finding-group .hl-status[data-result]');
    expect(await popup.getAttribute('.finding-group .hl-status[data-result]', 'data-result')).toBe('highlighted');
    expect(await target.evaluate(() => {
      const box = document.querySelector('[data-veiltrace-highlight]')!.getBoundingClientRect();
      const el = document.getElementById('alarm')!.getBoundingClientRect();
      return box.left <= el.left && box.right >= el.right && box.top <= el.top && box.bottom >= el.bottom;
    })).toBe(true);
  });

  it('Show on page is keyboard operable', async () => {
    en.pages.set('https://multi.test/', html(MULTI_THREAT_BODY));
    const { popup } = await scanUrl(en, 'https://multi.test/');
    const first = popup.locator('article.finding button.show').first();
    await first.focus();
    await popup.keyboard.press('Enter');
    await popup.waitForSelector('article.finding .hl-status[data-result]');
    expect(await popup.getAttribute('article.finding .hl-status[data-result]', 'data-result')).toBe('highlighted');
  });

  it('switches EN ↔ ID without rescanning: summary, overview, advice, labels; evidence ids, highlight status and page text are preserved', async () => {
    id.pages.set('https://multi.test/', html(MULTI_THREAT_BODY));
    const { popup } = await scanUrl(id, 'https://multi.test/');
    expect(await popup.textContent('.threat-summary h2')).toBe('Konten manipulatif terdeteksi');
    expect(await popup.textContent('#scan-state')).toBe('PEMINDAIAN LENGKAP');
    expect(await popup.textContent('.stat[data-stat="actionable"] dt')).toBe('Perlu tindakan');
    expect(await popup.textContent('.advice h3')).toBe('Yang perlu dilakukan');
    await popup.locator('article.finding button.show').first().click();
    await popup.waitForSelector('.hl-status[data-result]');
    const before = { ids: await popup.$$eval('[data-evidence-id]', (els) => els.map((e) => e.getAttribute('data-evidence-id'))),
      snippets: await pageSnippets(popup), injections: await popup.getAttribute('body', 'data-injections') };
    await popup.click('#lang-en');
    expect(await popup.textContent('.threat-summary h2')).toBe('Manipulative content detected');
    expect(await popup.textContent('#scan-state')).toBe('SCAN COMPLETE');
    expect(await popup.textContent('.hl-status[data-result]')).toBe('Highlighted on the page.');
    expect(await popup.$$eval('[data-evidence-id]', (els) => els.map((e) => e.getAttribute('data-evidence-id')))).toEqual(before.ids);
    expect(await pageSnippets(popup)).toEqual(before.snippets);
    expect(await popup.getAttribute('body', 'data-injections')).toBe(before.injections);
    await popup.click('#lang-id');
    expect(await popup.textContent('.cat[data-category="payment"] .category')).toBe('Manipulasi Pembayaran · Eksperimental');
    await shot(popup, '61-dashboard-multi-id');
  });

  it('empty result: nothing to report, never "safe", general advice, no findings list', async () => {
    en.pages.set('https://empty.test/', html('<main><h1>Weather</h1><p>Sunny with light wind.</p></main>'));
    const { popup } = await scanUrl(en, 'https://empty.test/');
    expect(await popup.getAttribute('.threat-summary', 'data-verdict')).toBe('none');
    expect(await popup.textContent('.threat-summary h2')).toBe('Nothing to report in the analyzed content');
    expect(await popup.textContent('.stat[data-stat="actionable"] dd')).toBe('0');
    expect(await popup.textContent('.stat[data-stat="categories"] dd')).toBe('None');
    expect(await popup.getAttribute('.advice', 'data-advice')).toBe('none');
    expect(await popup.textContent('.advice p')).toContain('does not make a page trustworthy');
    expect(await popup.locator('article.finding').count()).toBe(0);
    expect(await popup.locator('.findings-title').count()).toBe(0);
    expect((await popup.textContent('body'))!.toLowerCase()).not.toMatch(/\bsafe\b/);
    await shot(popup, '62-dashboard-empty');
  });

  it('partial scan: header status, coverage stat, coverage panel and summary qualifier, in both languages', async () => {
    const shop = perfPages().find((p) => p.id === 'shop-2500-cards')!;
    en.pages.set('https://bigshop-dash.test/', shop.html);
    const { popup } = await scanUrl(en, 'https://bigshop-dash.test/');
    expect(await popup.textContent('#scan-state')).toBe('PARTIAL SCAN');
    expect(await popup.getAttribute('#scan-state', 'data-state')).toBe('partial');
    expect(await popup.textContent('.stat[data-stat="coverage"] dd')).toBe('Partial');
    expect(await popup.getAttribute('.coverage', 'data-complete')).toBe('false');
    expect(await popup.textContent('.threat-summary p')).toContain('Part of the page could not be examined');
    await popup.click('#lang-id');
    expect(await popup.textContent('#scan-state')).toBe('PEMINDAIAN SEBAGIAN');
    expect(await popup.textContent('.stat[data-stat="coverage"] dd')).toBe('Sebagian');
    await shot(popup, '63-dashboard-partial-id');
  });

  it('as a toolbar popup the width is fixed at 560 px even while the viewport is still small (owner manual test: popup stayed narrow)', async () => {
    en.pages.set('https://width.test/', html('<p>hello</p>'));
    const { popup } = await scanUrl(en, 'https://width.test/');
    expect(await popup.evaluate(() => document.documentElement.classList.contains('fluid'))).toBe(true);
    await popup.setViewportSize({ width: 400, height: 600 });
    // Without the tab-view class the body keeps 560 px, which is what makes Chrome open the popup at 560 px.
    expect(await popup.evaluate(() => { document.documentElement.classList.remove('fluid'); return document.body.getBoundingClientRect().width; })).toBe(560);
  });

  it('long evidence and narrow windows: snippets stay inside the card and the popup never scrolls sideways', async () => {
    const long = `Verify you are human. Press Win+R, then Ctrl+V and press Enter. ${'x'.repeat(260)}`;
    en.pages.set('https://long.test/', html(`<div role="dialog"><p>${long}</p></div>`));
    const { popup } = await scanUrl(en, 'https://long.test/');
    for (const width of [560, 420, 360]) {
      await popup.setViewportSize({ width, height: 600 });
      expect(await noHorizontalOverflow(popup), `width ${width}`).toBe(true);
      expect(await popup.$$eval('.snippet', (els) => els.every((e) => e.getBoundingClientRect().right <= window.innerWidth))).toBe(true);
    }
  });
});

describe('plain view (D-107)', () => {
  it('opens with the plain card visible and the technical dashboard collapsed, in Indonesian too', async () => {
    id.pages.set('https://plain-id.test/', html(MULTI_THREAT_BODY));
    const target = await openTarget(id, 'https://plain-id.test/');
    const popup = await openPopup(id, await tabIdOf(id, target));
    await popup.click('#scan');
    await popup.waitForSelector('body[data-state="done"]');
    expect(await popup.isVisible('.plain')).toBe(true);
    expect(await popup.textContent('.plain h2')).toBe('Berhenti dulu: konten ini menunjukkan tanda manipulasi');
    expect(await popup.$$eval('.plain-label', (els) => els.slice(0, 3).map((e) => e.textContent))).toEqual(['Yang diminta dari Anda', 'Kenapa ini tanda bahaya', 'Yang sebaiknya dilakukan']);
    expect(await popup.getAttribute('details.tech', 'open')).toBeNull();
    expect(await popup.isVisible('.threat-summary')).toBe(false);
    await popup.click('details.tech > summary');
    expect(await popup.isVisible('.threat-summary')).toBe(true);
  });
});
