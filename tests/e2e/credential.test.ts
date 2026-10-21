// M5.1: the EXPERIMENTAL credential-disclosure section in the real extension popup (TEST build).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCorpusScenario, addDemoSite, html, launchExtension, openPopup, openTarget, scan, scanUrl, shot, tabIdOf, verdict, type Loaded } from './helpers.js';

let en: Loaded;
let id: Loaded;
beforeAll(async () => { [en, id] = await Promise.all([launchExtension('test', 'en-US'), launchExtension('test', 'id')]); });
afterAll(async () => { await Promise.all([en.context.close(), id.context.close()]); });

const SENTINEL = 'VT-E2E-SENTINEL-55';

describe('credential section in the popup', () => {
  it('forum reply asking for the SMS code → manipulative credential finding, first; ClickFix verdict unchanged', async () => {
    const { target, popup } = await scanUrl(en, addCorpusScenario(en, 'cred-dev', 'CD01-en-community-otp-reply'));
    expect(await verdict(popup)).toBe('none');
    expect(await popup.getAttribute('.cred-summary', 'data-verdict')).toBe('manipulative_instruction');
    expect(await popup.textContent('.cred-summary h2')).toBe('Manipulative');
    expect(await popup.textContent('.cred-summary .category')).toBe('Credential Disclosure Manipulation · Experimental');
    // The most severe finding comes first in the unified list.
    expect(await popup.$eval('article.finding', (e) => e.getAttribute('data-category'))).toBe('credential');
    const card = popup.locator('article.finding.cred').first();
    expect(await card.getAttribute('data-rule')).toBe('CR1');
    expect(await card.locator('.requested').textContent()).toBe('Asks you to send: one-time code');
    expect(await card.locator('.indicators').textContent()).toBe('Indicators: claims to be support or an official · verification framing · in user-posted content');
    expect(await card.locator('[data-limitation="claimed-identity-unverifiable"]').count()).toBe(1);
    // One shared note covers the three experimental detectors.
    expect(await popup.locator('.experimental-note').count()).toBe(1);
    await card.locator('button:has-text("Show on page")').nth(2).click();
    await popup.waitForSelector('article.finding.cred .hl-status[data-result]');
    expect(await popup.getAttribute('article.finding.cred .hl-status[data-result]', 'data-result')).toBe('highlighted');
    const inside = await target.evaluate(() => {
      const box = document.querySelector('[data-veiltrace-highlight]')!.getBoundingClientRect();
      const c = document.getElementById('c2')!.getBoundingClientRect();
      return box.top >= c.top - 8 && box.bottom <= c.bottom + 8;
    });
    expect(inside).toBe(true);
    await shot(popup, '30-cred-forum-en');
  });

  it('legitimate MFA page → observed requests only, collapsed, no alert', async () => {
    const { popup } = await scanUrl(en, addCorpusScenario(en, 'cred-dev', 'CN02-en-mfa-code'));
    expect(await popup.getAttribute('.cred-summary', 'data-verdict')).toBe('observed_instruction');
    expect(await popup.locator('article.finding.cred:visible').count()).toBe(0);
    await popup.click('details.observed summary');
    expect(await popup.locator('article.finding.cred[data-rule="CR5"]').count()).toBe(1);
    expect((await popup.textContent('body'))!.toLowerCase()).not.toMatch(/\bsafe\b/);
  });

  it('values typed into the page never reach the popup', async () => {
    const url = addCorpusScenario(en, 'cred-dev', 'CD04-en-overlay-suspension-password-otp');
    const target = await openTarget(en, url);
    await target.fill('#p', SENTINEL);
    await target.fill('#o', SENTINEL);
    const popup = await openPopup(en, await tabIdOf(en, target));
    await scan(popup);
    expect(await popup.getAttribute('.cred-summary', 'data-verdict')).toBe('suspicious_correlation');
    expect(await popup.textContent('body')).not.toContain(SENTINEL);
    expect(await popup.textContent('article.finding.cred .destination')).toBe('The form submits to another site.');
    expect(en.blocked).toEqual([]);
  });

  it('secrets in field ids, names, autocomplete and value attributes never reach the popup; label markup stays text', async () => {
    const url = 'https://attrs.test/';
    const target = await openTarget(en, url, html(`<div class="comment"><p>Support team: send me the code we just texted you.</p>
      <label for="o-${SENTINEL}">&lt;img src=x onerror="document.title='pwned'"&gt; Code</label>
      <input id="o-${SENTINEL}" name="otp_${SENTINEL}" autocomplete="one-time-code ${SENTINEL}" value="${SENTINEL}-default"></div>`));
    await target.fill('input', SENTINEL);
    const popup = await openPopup(en, await tabIdOf(en, target));
    await scan(popup);
    expect(await popup.getAttribute('.cred-summary', 'data-verdict')).toBe('manipulative_instruction');
    expect(await popup.content()).not.toContain(SENTINEL);
    expect(await popup.locator('article.finding.cred .snippet').allTextContents()).toContain('<img src=x onerror="document.title=\'pwned\'"> Code');
    expect(await popup.locator('#result img').count()).toBe(0);
    expect(await target.title()).not.toBe('pwned');
  });

  it('Indonesian popup translates the credential section; page evidence stays untranslated', async () => {
    const { popup } = await scanUrl(id, addCorpusScenario(id, 'cred-dev', 'CD06-id-komentar-admin-kirim-otp'));
    expect(await popup.textContent('.threat-summary h2')).toBe('Konten manipulatif terdeteksi');
    expect(await popup.textContent('.cred-summary h2')).toBe('Manipulatif');
    expect(await popup.textContent('article.finding.cred .requested')).toBe('Meminta Anda mengirim: kode sekali pakai (OTP)');
    expect(await popup.locator('article.finding.cred .snippet').allTextContents()).toContain('Kirimkan');
    await popup.click('#lang-en');
    expect(await popup.textContent('.cred-summary h2')).toBe('Manipulative');
  });

  it('ClickFix demo page: command section unchanged, credential section reports no requests', async () => {
    const site = addDemoSite(en, 'https://help.nusaverta.test/');
    const { popup } = await scanUrl(en, site.lure);
    expect(await verdict(popup)).toBe('manipulative_instruction');
    expect(await popup.getAttribute('.cred-summary', 'data-verdict')).toBe('none');
    expect(await popup.$eval('article.finding', (e) => e.getAttribute('data-category'))).toBe('command');
  });
});
