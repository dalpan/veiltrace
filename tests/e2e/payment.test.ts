// M5.2: the EXPERIMENTAL payment-manipulation section in the real extension popup (TEST build).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCorpusScenario, addDemoSite, html, launchExtension, openPopup, openTarget, scan, scanUrl, shot, tabIdOf, verdict, type Loaded } from './helpers.js';

let en: Loaded;
let id: Loaded;
beforeAll(async () => { [en, id] = await Promise.all([launchExtension('test', 'en-US'), launchExtension('test', 'id')]); });
afterAll(async () => { await Promise.all([en.context.close(), id.context.close()]); });

const SENTINEL = '4111-VT-E2E-SENTINEL-1111';
const section = (popup: import('playwright').Page): Promise<string[]> =>
  popup.$$eval('#result > .card[data-verdict]', (els) => els.map((e) => e.className.split(' ')[1] ?? ''));

describe('payment section in the popup', () => {
  it('fake refund in a chat widget → manipulative payment finding first, with category, severity, explanation and evidence highlighting', async () => {
    const { target, popup } = await scanUrl(en, addCorpusScenario(en, 'pay-dev', 'PD01-en-chat-refund-release-fee'));
    expect(await verdict(popup)).toBe('none');
    expect(await popup.getAttribute('.cred-summary', 'data-verdict')).toBe('none');
    expect(await popup.getAttribute('.pay-summary', 'data-verdict')).toBe('manipulative_instruction');
    expect(await popup.textContent('.pay-summary .category')).toBe('Payment Manipulation · Experimental');
    expect(await popup.textContent('.pay-summary h2')).toBe('Manipulative payment request detected');
    // All detectors are shown; the most severe section comes first.
    expect(await section(popup)).toEqual(['pay-summary', 'summary', 'cred-summary', 'sup-summary']);
    expect(await popup.textContent('.summary .category')).toBe('Command Execution Manipulation');
    const card = popup.locator('article.finding.pay').first();
    expect(await card.getAttribute('data-rule')).toBe('PR1');
    expect(await card.locator('.category').textContent()).toBe('Payment Manipulation');
    expect(await card.locator('.chip.severity').textContent()).toBe('Severity: high');
    expect(await card.locator('.explain').textContent()).toContain('Real refunds and prizes never require an upfront payment.');
    expect(await card.locator('.promises').textContent()).toBe('Promised in return: a refund, released money or goods');
    expect(await card.locator('[data-limitation="amount-not-reported"]').count()).toBe(1);
    const snippets = await card.locator('.snippet').allTextContents();
    expect(snippets).toContain('release fee');
    expect(snippets).toContain('(amount on the page; the value is not shown)');
    expect(snippets.join(' ')).not.toMatch(/\$\s?\d/);
    await card.locator('li', { hasText: 'release fee' }).locator('button').click();
    await popup.waitForSelector('article.finding.pay .hl-status[data-result]');
    expect(await popup.getAttribute('article.finding.pay .hl-status[data-result]', 'data-result')).toBe('highlighted');
    expect(await target.evaluate(() => document.querySelector('[data-veiltrace-highlight]') !== null)).toBe(true);
    await shot(popup, '40-pay-refund-en');
  });

  it('legitimate checkout → observed payment request only, collapsed, no alert; typed card numbers never reach the popup', async () => {
    const target = await openTarget(en, addCorpusScenario(en, 'pay-dev', 'PN01-en-checkout'));
    await target.fill('#cn', SENTINEL);
    await target.fill('#cv', SENTINEL);
    const popup = await openPopup(en, await tabIdOf(en, target));
    await scan(popup);
    expect(await popup.getAttribute('.pay-summary', 'data-verdict')).toBe('observed_instruction');
    expect(await popup.locator('article.finding.pay:visible').count()).toBe(0);
    await popup.click('details.pay-observed summary');
    expect(await popup.locator('article.finding.pay[data-rule="PR4"]').count()).toBeGreaterThan(0);
    expect(await popup.content()).not.toContain(SENTINEL);
    expect(await popup.content()).not.toContain('$90.00');
    expect((await popup.textContent('body'))!.toLowerCase()).not.toMatch(/\bsafe\b/);
    expect(en.blocked).toEqual([]);
  });

  it('page markup in payment evidence stays text', async () => {
    const target = await openTarget(en, 'https://markup.test/', html('<div class="comment"><p>Support team: your refund is on hold. Pay the &lt;img src=x onerror="document.title=\'pwned\'"&gt; release fee of $30 to receive it.</p></div>'));
    const popup = await openPopup(en, await tabIdOf(en, target));
    await scan(popup);
    expect(await popup.getAttribute('.pay-summary', 'data-verdict')).toBe('manipulative_instruction');
    expect(await popup.locator('#result img').count()).toBe(0);
    expect(await target.title()).not.toBe('pwned');
  });

  it('Indonesian popup translates the payment section; page evidence stays untranslated', async () => {
    const { popup } = await scanUrl(id, addCorpusScenario(id, 'pay-dev', 'PD03-id-overlay-akun-diblokir-biaya-verifikasi'));
    expect(await popup.textContent('.pay-summary .category')).toBe('Manipulasi Pembayaran · Eksperimental');
    expect(await popup.textContent('.pay-summary h2')).toBe('Permintaan pembayaran manipulatif terdeteksi');
    expect(await popup.textContent('article.finding.pay .chip.severity')).toBe('Tingkat keparahan: tinggi');
    expect(await popup.locator('article.finding.pay .snippet').allTextContents()).toContain('biaya verifikasi');
    await popup.click('#lang-en');
    expect(await popup.textContent('.pay-summary h2')).toBe('Manipulative payment request detected');
  });

  it('awareness page and news report → no payment alert', async () => {
    for (const sc of ['PN09-en-awareness-payment-scams', 'PN07-en-news-refund-scam']) {
      const { popup } = await scanUrl(en, addCorpusScenario(en, 'pay-dev', sc));
      expect(['none', 'observed_instruction'], sc).toContain(await popup.getAttribute('.pay-summary', 'data-verdict'));
    }
  });

  it('ClickFix demo page: command section unchanged and first; payment section reports no requests', async () => {
    const site = addDemoSite(en, 'https://help.nusaverta.test/');
    const { popup } = await scanUrl(en, site.lure);
    expect(await verdict(popup)).toBe('manipulative_instruction');
    expect(await popup.getAttribute('.pay-summary', 'data-verdict')).toBe('none');
    expect((await section(popup))[0]).toBe('summary');
  });
});
