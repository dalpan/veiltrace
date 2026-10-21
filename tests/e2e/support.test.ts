// M5.3: the EXPERIMENTAL support and authority-impersonation section in the real extension popup (TEST build).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCorpusScenario, addDemoSite, html, launchExtension, openTarget, openPopup, scan, scanUrl, shot, tabIdOf, verdict, type Loaded } from './helpers.js';

let en: Loaded;
let id: Loaded;
beforeAll(async () => { [en, id] = await Promise.all([launchExtension('test', 'en-US'), launchExtension('test', 'id')]); });
afterAll(async () => { await Promise.all([en.context.close(), id.context.close()]); });

const sections = (popup: import('playwright').Page): Promise<string[]> =>
  popup.$$eval('#result > .card[data-verdict]', (els) => els.map((e) => e.className.split(' ')[1] ?? ''));

describe('support section in the popup', () => {
  it('fake virus overlay → manipulative support finding first, with category, severity, claims kept apart from observed indicators, and highlighting', async () => {
    const { target, popup } = await scanUrl(en, addCorpusScenario(en, 'sup-dev', 'SD01-en-fake-virus-overlay-call'));
    expect(await verdict(popup)).toBe('none');
    expect(await popup.getAttribute('.sup-summary', 'data-verdict')).toBe('manipulative_instruction');
    expect(await popup.textContent('.sup-summary .category')).toBe('Support & Authority Impersonation · Experimental');
    // All four detectors are shown, most severe first; the others keep their own verdicts.
    expect(await sections(popup)).toEqual(['sup-summary', 'summary', 'cred-summary', 'pay-summary']);
    const card = popup.locator('article.finding.sup').first();
    expect(await card.getAttribute('data-rule')).toBe('SR1');
    expect(await card.locator('.category').textContent()).toBe('Support & Authority Impersonation');
    expect(await card.locator('.chip.severity').textContent()).toBe('Severity: high');
    expect(await card.locator('.claims').textContent()).toBe('Claims to be (not verified): support or customer service, a security team');
    expect(await card.locator('.indicators').textContent()).toBe('Observed indicators: virus or lock alarm shown by the web page · alarm in an overlay covering the page');
    expect(await card.locator('[data-limitation="claimed-identity-unverifiable"]').textContent()).toContain('does not say the organization itself is fake');
    const content = await popup.content();
    expect(content).not.toContain('555-0199');
    expect(await card.locator('.snippet').allTextContents()).toContain('(contact number on the page; not shown)');
    await card.locator('li', { hasText: 'Your computer is infected' }).locator('button').click();
    await popup.waitForSelector('article.finding.sup .hl-status[data-result]');
    expect(await popup.getAttribute('article.finding.sup .hl-status[data-result]', 'data-result')).toBe('highlighted');
    expect(await target.evaluate(() => document.querySelector('[data-veiltrace-highlight]') !== null)).toBe(true);
    await shot(popup, '50-sup-virus-overlay-en');
  });

  it('legitimate help-center contact page → observed only, collapsed, no alert, no number in the popup', async () => {
    const { popup } = await scanUrl(en, addCorpusScenario(en, 'sup-dev', 'SN01-en-help-center-contact'));
    expect(await popup.getAttribute('.sup-summary', 'data-verdict')).toBe('observed_instruction');
    expect(await popup.locator('article.finding.sup:visible').count()).toBe(0);
    await popup.click('details.sup-observed summary');
    expect(await popup.locator('article.finding.sup[data-rule="SR5"]').count()).toBe(1);
    expect(await popup.content()).not.toContain('555-0100');
    expect((await popup.textContent('body'))!.toLowerCase()).not.toMatch(/\bsafe\b/);
    expect(en.blocked).toEqual([]);
  });

  it('informal Indonesian comment from a claimed admin → manipulative; Indonesian UI; page evidence untranslated', async () => {
    const { popup } = await scanUrl(id, addCorpusScenario(id, 'sup-dev', 'SD06-id-komentar-admin-informal-japri'));
    expect(await popup.getAttribute('.sup-summary', 'data-verdict')).toBe('manipulative_instruction');
    expect(await popup.textContent('.sup-summary .category')).toBe('Peniruan Dukungan & Otoritas · Eksperimental');
    expect(await popup.textContent('article.finding.sup .chip.severity')).toBe('Tingkat keparahan: tinggi');
    expect(await popup.locator('article.finding.sup .snippet').allTextContents()).toContain('japri');
    expect(await popup.content()).not.toContain('0000 2222');
    await popup.click('#lang-en');
    expect(await popup.textContent('.sup-summary h2')).toBe('Manipulative support or authority direction detected');
  });

  it('page markup in support evidence stays text', async () => {
    const target = await openTarget(en, 'https://markup-sup.test/', html('<div class="comment"><p>Official support team &lt;img src=x onerror="document.title=\'pwned\'"&gt; here: contact us on Telegram now or your account will be deleted.</p></div>'));
    const popup = await openPopup(en, await tabIdOf(en, target));
    await scan(popup);
    expect(await popup.getAttribute('.sup-summary', 'data-verdict')).toBe('manipulative_instruction');
    expect(await popup.locator('#result img').count()).toBe(0);
    expect(await target.title()).not.toBe('pwned');
  });

  it('awareness page and news report → no support alert', async () => {
    for (const sc of ['SN08-en-awareness-fake-support', 'SN06-en-news-tech-support-scam', 'SN09-id-edukasi-modus-anydesk']) {
      const { popup } = await scanUrl(en, addCorpusScenario(en, 'sup-dev', sc));
      expect(['none', 'observed_instruction'], sc).toContain(await popup.getAttribute('.sup-summary', 'data-verdict'));
    }
  });

  it('ClickFix demo page: command section unchanged and first; support section reports no directions', async () => {
    const site = addDemoSite(en, 'https://help.nusaverta.test/');
    const { popup } = await scanUrl(en, site.lure);
    expect(await verdict(popup)).toBe('manipulative_instruction');
    expect(await popup.getAttribute('.sup-summary', 'data-verdict')).toBe('none');
    expect((await sections(popup))[0]).toBe('summary');
  });
});
