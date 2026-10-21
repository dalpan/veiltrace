// Security, privacy and permission guarantees of the real extension.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCorpusScenario, extensionDir, html, launchExtension, openPopup, openTarget, scan, scanUrl, shot, tabIdOf, verdict, type Loaded } from './helpers.js';

let l: Loaded;
beforeAll(async () => { l = await launchExtension('test'); });
afterAll(async () => { await l.context.close(); });

describe('popup renders hostile page text inertly (XSS resistance)', () => {
  it('HTML/script payloads inside lure text appear literally and never execute', async () => {
    const url = 'https://xss.test/';
    const hostile = `Verify you are human <img src=x onerror="document.title='pwned'"><script>document.title='pwned'</script>: press Win+R, then Ctrl+V and press Enter <svg onload="alert(1)">`;
    // Serve the payload as TEXT on the page (escaped), so the page itself does not execute it.
    // Escape '<' so the payload cannot close the fixture's own <script> element.
    l.pages.set(url, html(`<div role="dialog"><p id="t"></p></div><script>document.getElementById('t').textContent = ${JSON.stringify(hostile).replace(/</g, '\\u003c')};</script>`));
    const target = await openTarget(l, url);
    const popup = await openPopup(l, await tabIdOf(l, target));
    const dialogs: string[] = [];
    popup.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
    await scan(popup);
    expect(await verdict(popup)).toBe('manipulative_instruction');
    const snippets = await popup.$$eval('.snippet', (els) => els.map((e) => e.textContent ?? ''));
    expect(snippets.join(' ')).toContain('Verify you are human');
    // The whole hostile block is shown only as text; no element from it was created in the popup.
    expect(await popup.evaluate(() => document.querySelectorAll('#result img, #result script, #result svg').length)).toBe(0);
    expect(await popup.title()).toBe('VeilTrace');
    expect(dialogs).toEqual([]);
    await shot(popup, '07-xss');
  });

  it('text that looks like markup in a snippet is rendered as characters', async () => {
    const url = 'https://xss2.test/';
    l.pages.set(url, html(`<div role="dialog"><p>Verify you are human</p><p id="p"></p></div>
      <script>document.getElementById('p').textContent = 'Press Win+R, then Ctrl+V <b>and</b> press Enter <img src=x onerror=alert(1)>';</script>`));
    const { popup } = await scanUrl(l, url);
    const all = await popup.$$eval('.snippet', (els) => els.map((e) => e.textContent).join(' '));
    expect(all).toContain('Ctrl+V');
    expect(await popup.evaluate(() => document.querySelectorAll('.snippet *').length)).toBe(0);
  });
});

describe('page cannot impersonate or influence the extension', () => {
  it('page-defined globals and postMessage traffic do not affect the isolated-world scan', async () => {
    const url = 'https://spoof.test/';
    l.pages.set(url, html(`<div role="dialog"><p>Verify you are human</p><p>Press Win+R, then Ctrl+V and press Enter.</p></div>
      <script>
        window.VeiltraceContent = { scan: () => ({ v: 1, verdict: 'none', findings: [] }), show: () => ({ status: 'highlighted' }) };
        window.VeiltraceExtractor = { extractSnapshot: () => { throw new Error('spoofed'); } };
        setInterval(() => window.postMessage({ type: 'veiltrace', verdict: 'none' }, '*'), 10);
        window.__hasRuntime = typeof chrome !== 'undefined' && !!(chrome.runtime && chrome.runtime.sendMessage);
      </script>`));
    const { target, popup } = await scanUrl(l, url);
    expect(await verdict(popup)).toBe('manipulative_instruction');
    // Without externally_connectable the page has no channel to the extension at all.
    expect(await target.evaluate(() => (window as unknown as { __hasRuntime: boolean }).__hasRuntime)).toBe(false);
  });

  it('works on a page with a strict CSP (default-src none, style-src none) including the highlight overlay', async () => {
    const url = 'https://csp.test/';
    l.pages.set(url, html('<div role="dialog" id="d"><p>Verify you are human</p><p>Press Win+R, then Ctrl+V and press Enter.</p></div>',
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'none'; script-src 'none'">`));
    const { target, popup } = await scanUrl(l, url);
    expect(await verdict(popup)).toBe('manipulative_instruction');
    await popup.click('article.finding button:has-text("Show on page") >> nth=0');
    await popup.waitForSelector('.hl-status[data-result]');
    expect(await popup.getAttribute('.hl-status[data-result]', 'data-result')).toBe('highlighted');
    const style = await target.evaluate(() => {
      const b = document.querySelector('[data-veiltrace-highlight]') as HTMLElement;
      return b ? getComputedStyle(b).borderTopColor : null;
    });
    expect(style).toBe('rgb(245, 158, 11)');
  });
});

describe('offline guarantees', () => {
  it('scanning and highlighting make zero network requests', async () => {
    const url = addCorpusScenario(l, 'dev', 'D01-en-blog-security-check-overlay');
    const target = await openTarget(l, url);
    const popup = await openPopup(l, await tabIdOf(l, target));
    const before = { served: l.served.length, blocked: l.blocked.length };
    await scan(popup);
    await popup.click('article.finding button:has-text("Show on page") >> nth=0');
    await popup.waitForSelector('.hl-status[data-result]');
    expect({ served: l.served.length, blocked: l.blocked.length }).toEqual(before);
  });

  it('the popup CSP blocks network access from extension pages (connect-src none)', async () => {
    const popup = await l.context.newPage();
    await popup.goto(`chrome-extension://${l.extId}/popup.html`);
    const before = l.served.length + l.blocked.length;
    const result = await popup.evaluate(() => fetch('https://exfil.test/x').then(() => 'fetched', (e: Error) => `blocked: ${e.name}`));
    expect(result).toMatch(/^blocked/);
    expect(l.served.length + l.blocked.length).toBe(before);
  });
});

describe('production build', () => {
  it('manifests: production has exactly activeTab + scripting and no host permissions; test permissions stay in the test build', async () => {
    const prod = JSON.parse(readFileSync(join(await extensionDir('prod'), 'manifest.json'), 'utf8'));
    const test = JSON.parse(readFileSync(join(await extensionDir('test'), 'manifest.json'), 'utf8'));
    expect(prod.permissions).toEqual(['activeTab', 'scripting']);
    expect(prod.host_permissions).toBeUndefined();
    expect(prod.content_scripts).toBeUndefined();
    expect(prod.background).toBeUndefined();
    expect(prod.externally_connectable).toBeUndefined();
    expect(prod.web_accessible_resources).toBeUndefined();
    expect(prod.content_security_policy.extension_pages).toContain("connect-src 'none'");
    expect(prod.name).toBe('VeilTrace');
    expect(test.permissions).toEqual(['activeTab', 'scripting']);
    expect(test.host_permissions).toEqual(['https://*.test/*', 'https://*.example/*']);
    const prodPopup = readFileSync(join(await extensionDir('prod'), 'popup.js'), 'utf8');
    expect(prodPopup).not.toContain('URLSearchParams');
    for (const f of ['popup.js', 'content.js']) {
      const code = readFileSync(join(await extensionDir('prod'), f), 'utf8');
      for (const bad of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'eval(', 'new Function', 'innerHTML', 'onMessage', 'sendMessage']) {
        expect(code.includes(bad), `${f}: ${bad}`).toBe(false);
      }
    }
  });

  it('installs and runs with only activeTab + scripting; cannot touch pages without a user gesture', async () => {
    const p = await launchExtension('prod');
    try {
      const url = 'https://noaccess.test/';
      p.pages.set(url, html('<p>Verify you are human: press Win+R, then Ctrl+V and press Enter.</p>'));
      const target = await openTarget(p, url);
      const popup = await p.context.newPage();
      await popup.goto(`chrome-extension://${p.extId}/popup.html?tab=1`);
      expect(await popup.textContent('h1')).toBe('VeilTrace');
      expect(await popup.evaluate(() => chrome.permissions.getAll())).toEqual({ origins: [], permissions: ['activeTab', 'scripting'] });
      // The production popup ignores ?tab= and, opened as a tab, targets itself: a protected extension page.
      expect(await popup.getAttribute('body', 'data-state')).toBe('error');
      // Without the activeTab grant from a toolbar click, injection into an ordinary page is refused.
      const tabId = await tabIdOf(p, target);
      const attempt = await popup.evaluate((id) => chrome.scripting.executeScript({ target: { tabId: id }, func: () => 1 }).then(() => 'injected', (e: Error) => `refused: ${e.message}`), tabId);
      expect(attempt).toMatch(/^refused/);
      await shot(popup, '08-prod-self');
    } finally {
      await p.context.close();
    }
  });
});
