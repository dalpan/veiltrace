// Indonesian / English popup with the real extension. Page evidence must stay in its original language.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { perfPages } from '../../src/eval/perfpages.js';
import { addCorpusScenario, html, launchExtension, openPopup, openTarget, scan, scanUrl, shot, tabIdOf, verdict, type Loaded } from './helpers.js';

let id: Loaded;
let en: Loaded;
beforeAll(async () => { [id, en] = await Promise.all([launchExtension('test', 'id'), launchExtension('test', 'en-US')]); });
afterAll(async () => { await Promise.all([id.context.close(), en.context.close()]); });

/** Visible UI text excluding page evidence snippets and the technical meta line. */
const uiText = (p: import('playwright').Page) => p.evaluate(() => {
  const clone = document.body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.snippet, #meta, script, .lang').forEach((e) => e.remove());
  return clone.textContent ?? '';
});

describe('Indonesian UI (browser UI language = id)', () => {
  it('selects Indonesian deterministically and keeps page evidence in its original language', async () => {
    const { popup } = await scanUrl(id, addCorpusScenario(id, 'dev', 'D01-en-blog-security-check-overlay'));
    expect(await popup.getAttribute('html', 'lang')).toBe('id');
    expect(await popup.textContent('#tagline')).toBe('Ungkap manipulasi di balik halaman');
    expect(await popup.textContent('#scan')).toBe('Pindai ulang');
    expect(await popup.textContent('.threat-summary h2')).toBe('Konten manipulatif terdeteksi');
    expect(await popup.textContent('.coverage h3')).toBe('Pemindaian lengkap');
    expect(await popup.$$eval('.chip', (c) => c.map((x) => x.textContent))).toEqual(expect.arrayContaining(['Manipulatif', 'Keyakinan: tinggi', 'Aturan R1']));
    // Evidence is the English page text, untranslated.
    expect(await popup.$$eval('.snippet', (e) => e.map((x) => x.textContent))).toEqual(expect.arrayContaining(['Hold the Windows key', 'Press Enter']));
    expect(await popup.$$eval('.ev-label', (e) => e[0]?.textContent)).toContain('Teks terlihat');
    await shot(popup, '10-id-manipulative');
  });

  it('leaves no English UI text behind (results, partial scan, errors)', async () => {
    const shop = perfPages().find((p) => p.id === 'shop-2500-cards')!;
    id.pages.set('https://toko-besar.test/', shop.html);
    const partial = await scanUrl(id, 'https://toko-besar.test/');
    expect(await partial.popup.textContent('.coverage h3')).toBe('Pemindaian sebagian: ada konten yang tidak diperiksa');
    expect(await partial.popup.textContent('.coverage li')).toBe('Halaman sangat besar. Hanya 5.000 blok teks pertama yang dianalisis.');
    expect(await partial.popup.textContent('.coverage p')).toContain('5.000 blok teks');
    await shot(partial.popup, '11-id-partial');
    const docs = await scanUrl(id, addCorpusScenario(id, 'dev', 'D16-en-vendor-install-script'));
    await docs.popup.click('details.observed summary');
    for (const p of [partial.popup, docs.popup]) {
      const text = await uiText(p);
      for (const english of ['Scan page', 'Scan again', 'Finding', 'Confidence', 'Action risk', 'Rule R', 'Complete scan', 'Partial scan', 'Show on page', 'Visible text', 'What VeilTrace can']) {
        expect(text, english).not.toContain(english);
      }
      expect(text.toLowerCase()).not.toMatch(/\bsafe\b|\baman\b/);
    }
    const target = await id.context.newPage();
    await target.goto('chrome://version');
    const restricted = await openPopup(id, await tabIdOf(id, target));
    expect(await restricted.textContent('[role="alert"] strong')).toBe('Halaman ini tidak dapat dipindai');
  });

  it('renders hostile page text inertly in Indonesian mode too', async () => {
    id.pages.set('https://xss-id.test/', html(`<div role="dialog"><p>Verifikasi bahwa Anda manusia</p><p id="p"></p></div>
      <script>document.getElementById('p').textContent = 'Tekan Win + R, lalu Ctrl + V dan tekan Enter \\u003cimg src=x onerror=alert(1)>';</script>`));
    const { popup } = await scanUrl(id, 'https://xss-id.test/');
    expect(await verdict(popup)).toBe('manipulative_instruction');
    expect(await popup.evaluate(() => document.querySelectorAll('#result img, .snippet *').length)).toBe(0);
  });
});

describe('language switching (English browser)', () => {
  it('switches EN ↔ ID without rescanning; results, highlight status and evidence are preserved', async () => {
    const url = addCorpusScenario(en, 'dev', 'D06-id-recipe-comment-lure');
    const target = await openTarget(en, url);
    const popup = await openPopup(en, await tabIdOf(en, target));
    expect(await popup.getAttribute('body', 'data-lang')).toBe('en');
    await scan(popup);
    expect(await popup.textContent('.threat-summary h2')).toBe('Manipulative content detected');
    await popup.click('article.finding button >> nth=0');
    await popup.waitForSelector('.hl-status[data-result]');
    const snippetsEn = await popup.$$eval('.snippet', (e) => e.map((x) => x.textContent));
    await popup.click('#lang-id');
    expect(await popup.getAttribute('body', 'data-lang')).toBe('id');
    expect(await popup.getAttribute('#lang-id', 'aria-pressed')).toBe('true');
    expect(await popup.textContent('.threat-summary h2')).toBe('Konten manipulatif terdeteksi');
    expect(await popup.textContent('.hl-status[data-result]')).toBe('Ditandai di halaman.');
    expect(await popup.$$eval('.snippet', (e) => e.map((x) => x.textContent))).toEqual(snippetsEn);
    expect(await popup.getAttribute('body', 'data-injections')).toBe('1');
    await popup.click('#lang-en');
    expect(await popup.textContent('.threat-summary h2')).toBe('Manipulative content detected');
    expect(await popup.textContent('#scan')).toBe('Scan again');
  });

  it('language buttons are keyboard operable', async () => {
    const url = 'https://kbd.test/';
    en.pages.set(url, html('<p>hello</p>'));
    const target = await openTarget(en, url);
    const popup = await openPopup(en, await tabIdOf(en, target));
    await popup.focus('#lang-id');
    await popup.keyboard.press('Enter');
    expect(await popup.textContent('#scan')).toBe('Pindai halaman');
  });
});
