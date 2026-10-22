// Captures the documentation screenshots in docs/images (README, proposal, slides). Not a test of behavior: runs only when
// VT_SHOTS_DIR is set (`VT_SHOTS_DIR=docs/images npx vitest run tests/e2e/screenshots.test.ts`). Uses the TEST build; every
// page is a fictional demo scene served offline (demo/scenes), and the PWA is the local build.
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';
import { afterAll, beforeAll, describe, it } from 'vitest';
// @ts-expect-error -- plain ESM build script without type declarations
import { buildPwa } from '../../scripts/build-pwa.mjs';
import { launchExtension, openPopup, openTarget, scan, tabIdOf, type Loaded } from './helpers.js';

const DIR = process.env.VT_SHOTS_DIR;
const BASE = 'https://demo.veiltrace.test/';
let id: Loaded;
let en: Loaded;

async function scene(l: Loaded, file: string, name: string, click?: string): Promise<void> {
  for (const f of [file, 'style.css']) l.pages.set(BASE + f, readFileSync(join('demo/scenes', f), 'utf8'));
  const target = await openTarget(l, BASE + file);
  await target.setViewportSize({ width: 1280, height: 760 });
  if (click) { await target.click(click); await target.waitForTimeout(900); }
  const popup: Page = await openPopup(l, await tabIdOf(l, target));
  await popup.setViewportSize({ width: 560, height: 900 });
  await scan(popup);
  await target.screenshot({ path: join(DIR as string, `${name}-page.png`) });
  await popup.screenshot({ path: join(DIR as string, `${name}-popup.png`) });
  await target.close();
  await popup.close();
}

describe.skipIf(!DIR)('documentation screenshots', () => {
  beforeAll(async () => {
    mkdirSync(DIR as string, { recursive: true });
    [id, en] = await Promise.all([launchExtension('test', 'id'), launchExtension('test', 'en-US')]);
  });
  afterAll(async () => { await Promise.all([id?.context.close(), en?.context.close()]); });

  it('captures the demo scenes in the popup', async () => {
    await scene(id, 'cmd-lure.html', 'cmd-lure', '#cm-check');
    await scene(id, 'cred-lure.html', 'cred-lure');
    await scene(id, 'pay-lure.html', 'pay-lure');
    await scene(id, 'sup-lure.html', 'sup-lure');
    await scene(id, 'pay-benign.html', 'pay-benign');
    await scene(en, 'cmd-lure.html', 'cmd-lure-en', '#cm-check');
  }, 180000);

  it('captures the Cek Pesan PWA at phone width', async () => {
    const dir = await buildPwa({ outdir: 'dist/shots-pwa' });
    const files = new Map(['index.html', 'app.js', 'style.css', 'manifest.webmanifest', 'sw.js', 'icon-192.png'].map((f) => [f, readFileSync(join(dir, f))]));
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 1100 }, deviceScaleFactor: 2, locale: 'id' });
    await ctx.route('https://pwa.veiltrace.test/**', (r) => {
      const f = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html';
      const body = files.get(f);
      return body ? r.fulfill({ body, contentType: f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.png') ? 'image/png' : f.endsWith('.webmanifest') ? 'application/manifest+json' : 'text/html' }) : r.abort();
    });
    const p = await ctx.newPage();
    await p.goto('https://pwa.veiltrace.test/');
    await p.fill('#message', 'Selamat kak, saldo bonus 2jt kakak udah siap dicairin ya\ntf dlu biaya admin 50rb ke rek admin, abis itu langsung cair ke rekening kakak\nburuan ya kak, slotnya cuma sampe jam 12');
    await p.click('#check');
    await p.waitForTimeout(400);
    // The sticky header would repeat over a full-page capture; keep it in place for the screenshot only.
    await p.evaluate(() => { (document.querySelector('.brand') as HTMLElement).style.position = 'static'; });
    await p.screenshot({ path: join(DIR as string, 'pwa-result.png'), fullPage: true });
    await browser.close();
  }, 120000);
});
