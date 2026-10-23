// Text in images (D-105) in the real extension popup (TEST build): a lure drawn inside an image is read from a screenshot by the
// extension's own OCR worker (engine and models bundled, no network), page text is not analyzed twice, and the evidence is not
// offered for highlighting. The test supplies the screenshot (a popup opened as a tab would capture itself).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { html, launchExtension, openPopup, openTarget, scan, tabIdOf, type Loaded } from './helpers.js';

let ext: Loaded;

beforeAll(async () => { ext = await launchExtension('test', 'en-US'); });
afterAll(async () => { await ext.context.close(); });

async function poster(text: string): Promise<string> {
  const p = await ext.context.newPage();
  await p.setViewportSize({ width: 560, height: 220 });
  await p.setContent(`<body style="margin:0;background:#fff7d6;font:22px sans-serif;padding:18px">${text}</body>`);
  const png = await p.screenshot();
  await p.close();
  return png.toString('base64');
}

describe('text in images', () => {
  it('reads a lure drawn inside an image, analyzes only the image text, and offers no highlight', async () => {
    const img = await poster('SELAMAT! Anda pemenang undian. Untuk mencairkan hadiah, transfer pajak hadiah Rp 2.500.000 ke rekening petugas hari ini juga.');
    ext.pages.set('https://poster.test/', html(`<h1>Resep kue lebaran</h1><p>Campurkan tepung, gula dan mentega sampai rata, lalu panggang 25 menit.</p><img alt="" src="data:image/png;base64,${img}">`));
    const target = await openTarget(ext, 'https://poster.test/');
    await target.setViewportSize({ width: 900, height: 700 });
    const popup = await openPopup(ext, await tabIdOf(ext, target));
    await scan(popup);
    expect(await popup.getAttribute('.threat-summary', 'data-verdict')).not.toMatch(/suspicious|manipulative/);
    expect(await popup.isVisible('#ocr')).toBe(true);
    const shot = (await target.screenshot()).toString('base64');
    await popup.evaluate((b64) => {
      (window as unknown as { __vtTestScreenshot: Blob }).__vtTestScreenshot = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' });
    }, shot);
    await popup.click('#ocr-run');
    await popup.waitForSelector('#ocr[data-phase="done"], #ocr[data-phase="error"]', { timeout: 120_000 });
    expect(await popup.getAttribute('#ocr', 'data-phase')).toBe('done');
    expect(await popup.getAttribute('#ocr-result .threat-summary', 'data-verdict')).toBe('manipulative_instruction');
    const snippets = (await popup.$$eval('#ocr-result .snippet', (els) => els.map((e) => e.textContent ?? ''))).join(' ').toLowerCase();
    expect(snippets).toMatch(/pemenang|hadiah|transfer/);
    // The recipe text is page text and is not analyzed again.
    expect(snippets).not.toContain('tepung');
    expect(await popup.$$eval('#ocr-result button.show', (els) => els.length)).toBe(0);
    expect(await popup.textContent('#ocr-result')).toContain('cannot be highlighted');
    // The page result above is unchanged.
    expect(await popup.getAttribute('#result .threat-summary', 'data-verdict')).not.toMatch(/suspicious|manipulative/);
    expect(ext.blocked).toEqual([]);
  }, 150_000);

  it('reads text on a coloured panel inside a white page (second, adaptive-threshold pass)', async () => {
    const p = await ext.context.newPage();
    await p.setViewportSize({ width: 620, height: 250 });
    await p.setContent('<body style="margin:0;background:#fff3c4;font:bold 26px sans-serif;padding:22px;color:#7a1d12">SELAMAT! Anda pemenang undian HUT bank.<br><span style="font-weight:normal;color:#222">Untuk mencairkan hadiah, transfer pajak hadiah Rp 2.500.000 ke rekening petugas hari ini juga.</span></body>');
    const img = (await p.screenshot()).toString('base64');
    await p.close();
    ext.pages.set('https://panel.test/', html(`<div style="font:18px Georgia,serif;max-width:760px;margin:30px auto"><h1>Kue lebaran renyah</h1><p>Campurkan tepung, gula, dan mentega sampai rata, lalu panggang 25 menit.</p><img alt="" style="width:620px" src="data:image/png;base64,${img}"></div>`));
    const target = await openTarget(ext, 'https://panel.test/');
    await target.setViewportSize({ width: 1100, height: 700 });
    const popup = await openPopup(ext, await tabIdOf(ext, target));
    await scan(popup);
    const shot = (await target.screenshot()).toString('base64');
    await popup.evaluate((b64) => {
      (window as unknown as { __vtTestScreenshot: Blob }).__vtTestScreenshot = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' });
    }, shot);
    await popup.click('#ocr-run');
    await popup.waitForSelector('#ocr[data-phase="done"], #ocr[data-phase="error"]', { timeout: 120_000 });
    expect(await popup.getAttribute('#ocr-result .threat-summary', 'data-verdict')).toBe('manipulative_instruction');
  }, 150_000);

  it('says so when the visible screen has no text beyond the page text', async () => {
    ext.pages.set('https://plain.test/', html('<h1>Jadwal kereta</h1><p>Kereta berangkat pukul 08.15 dari peron 2.</p>'));
    const target = await openTarget(ext, 'https://plain.test/');
    const popup = await openPopup(ext, await tabIdOf(ext, target));
    await scan(popup);
    const shot = (await target.screenshot()).toString('base64');
    await popup.evaluate((b64) => {
      (window as unknown as { __vtTestScreenshot: Blob }).__vtTestScreenshot = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' });
    }, shot);
    await popup.click('#ocr-run');
    await popup.waitForSelector('#ocr[data-phase="done"], #ocr[data-phase="error"]', { timeout: 120_000 });
    expect(await popup.textContent('#ocr-status')).toMatch(/No text was found in images|No text could be read/);
    expect(await popup.isVisible('#ocr-result')).toBe(false);
  }, 150_000);
});
