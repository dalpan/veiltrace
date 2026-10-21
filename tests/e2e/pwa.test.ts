// "Cek Pesan" PWA (D-084) in Chromium at a phone viewport, served from a local static server (a secure context, so the
// service worker runs): checking a pasted message, the Android share-target POST, offline use, language switch, privacy.
import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error -- plain ESM build script without type declarations
import { buildPwa } from '../../scripts/build-pwa.mjs';

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
let server: Server;
let base: string;
let browser: Browser;
const requests: string[] = [];

beforeAll(async () => {
  const dir = await buildPwa({ outdir: 'dist/e2e-pwa' }) as string;
  server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    requests.push(`${req.method} ${path}`);
    const file = path.endsWith('/') ? 'index.html' : path.slice(1);
    try {
      const body = readFileSync(join(dir, file));
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://localhost:${(server.address() as AddressInfo).port}/`;
  browser = await chromium.launch();
});
afterAll(async () => { await browser.close(); server.close(); });

async function open(locale = 'id-ID'): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale });
  const page = await context.newPage();
  await page.goto(base);
  return { context, page };
}

const OTP_SLANG = 'bro buat verif akun, kasih liat dong angka yg barusan masuk ke hp lu, cepetan ya';

describe('Cek Pesan PWA', () => {
  it('checks a pasted message on the device: manipulative, category, advice, evidence marked in the message, never "aman"', async () => {
    const { context, page } = await open();
    await page.fill('#message', OTP_SLANG);
    await page.click('#check');
    expect(await page.getAttribute('.threat', 'data-verdict')).toBe('manipulative_instruction');
    expect(await page.textContent('.threat h3')).toBe('Konten manipulatif terdeteksi');
    expect(await page.getAttribute('.advice', 'data-advice')).toBe('credential');
    expect(await page.$$eval('article.finding', (els) => els.map((e) => e.getAttribute('data-category')))).toContain('credential');
    expect(await page.$$eval('.message mark', (els) => els.map((e) => e.textContent))).toEqual(expect.arrayContaining(['kasih liat', 'angka yg barusan masuk ke hp lu']));
    expect((await page.textContent('body'))!.toLowerCase()).not.toMatch(/\baman\b|\bsafe\b/);
    expect(page.url()).not.toContain('angka');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await context.close();
  });

  it('an ordinary message: nothing to report, general advice, English switch without re-checking', async () => {
    const { context, page } = await open();
    await page.fill('#message', 'Paket kakak sudah dikirim ya, nomor resinya bisa dicek di aplikasi. Terima kasih sudah belanja!');
    await page.click('#check');
    expect(['none', 'observed_instruction']).toContain(await page.getAttribute('.threat', 'data-verdict'));
    expect(await page.getAttribute('.advice', 'data-advice')).toBe('none');
    await page.click('#lang-en');
    expect(await page.textContent('#check')).toBe('Check message');
    expect(await page.textContent('.advice p')).toContain('does not make a page trustworthy');
    await context.close();
  });

  it('Android share target: a shared message arrives by POST through the service worker, never in the URL, and is checked', async () => {
    const { context, page } = await open();
    await page.waitForFunction(() => document.body.dataset.offline === 'ready');
    await page.reload();
    await page.evaluate((text) => {
      const f = document.createElement('form');
      f.method = 'POST'; f.action = 'share'; f.enctype = 'multipart/form-data';
      const i = document.createElement('textarea'); i.name = 'text'; i.value = text; f.append(i);
      document.body.append(f); f.submit();
    }, 'Selamat! Anda pemenang undian. Untuk mencairkan hadiah, transfer pajak hadiah Rp 2.500.000 ke rekening petugas hari ini juga.');
    await page.waitForSelector('.threat[data-verdict]');
    expect(await page.getAttribute('.threat', 'data-verdict')).toBe('manipulative_instruction');
    expect(page.url()).toBe(base);
    expect(requests.some((r) => r.startsWith('POST'))).toBe(false);
    // The stored copy is deleted after reading.
    expect(await page.evaluate(() => caches.open('veiltrace-share').then((c) => c.match('./__shared__')).then((r) => r === undefined))).toBe(true);
    await context.close();
  });

  it('works offline after the first visit', async () => {
    const { context, page } = await open();
    await page.waitForFunction(() => document.body.dataset.offline === 'ready');
    await context.setOffline(true);
    await page.reload();
    await page.fill('#message', 'Your computer is infected. Call Windows Support now at +1 888 555 0199.');
    await page.click('#check');
    expect(await page.getAttribute('.threat', 'data-verdict')).toBe('manipulative_instruction');
    expect(await page.content()).not.toContain('555 0199</mark>');
    await context.close();
  });
});
