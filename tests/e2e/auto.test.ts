// Opt-in automatic scanning (D-081) in the real extension (TEST build): off by default, turned on from the popup, badge
// only for manipulative pages, rescans when content appears later, popup shows results on open, and turning it off stops it.
import type { Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCorpusScenario, html, launchExtension, openPopup, openTarget, tabIdOf, type Loaded } from './helpers.js';

let l: Loaded;
let probe: Page;
beforeAll(async () => {
  l = await launchExtension('test', 'id');
  probe = await l.context.newPage();
  await probe.goto(`chrome-extension://${l.extId}/popup.html`);
});
afterAll(async () => { await l.context.close(); });

const badge = (tabId: number) => probe.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tabId);
const registered = () => probe.evaluate(() => chrome.scripting.getRegisteredContentScripts().then((s) => s.map((x) => x.id)));

/** Polls the badge of a tab until it equals `text` (automatic scans run after load and debounce). */
async function badgeBecomes(tabId: number, text: string, timeoutMs = 9000): Promise<string> {
  const end = Date.now() + timeoutMs;
  let last = await badge(tabId);
  while (last !== text && Date.now() < end) {
    await probe.waitForTimeout(250);
    last = await badge(tabId);
  }
  return last;
}

async function setMode(on: boolean): Promise<Page> {
  const anchor = await openTarget(l, 'https://anchor.test/', html('<p>anchor</p>'));
  const popup = await openPopup(l, await tabIdOf(l, anchor));
  await popup.click('details#mode summary');
  if ((await popup.getAttribute('#mode', 'data-mode') === 'automatic') !== on) await popup.click('#mode-toggle');
  await popup.waitForSelector(`#mode[data-mode="${on ? 'automatic' : 'manual'}"]`);
  return popup;
}

describe('automatic scanning (opt-in)', () => {
  it('is off by default: manual mode, consent text shown, no registered content script', async () => {
    const anchor = await openTarget(l, 'https://anchor.test/', html('<p>anchor</p>'));
    const popup = await openPopup(l, await tabIdOf(l, anchor));
    expect(await popup.getAttribute('#mode', 'data-mode')).toBe('manual');
    expect(await popup.textContent('#mode-label')).toBe('MANUAL');
    expect(await popup.textContent('#mode-consent')).toContain('hanya di perangkat ini');
    expect(await registered()).toEqual([]);
    expect(await popup.getAttribute('body', 'data-state')).toBe('idle');
  });

  it('turned on from the popup: badge "!" on a manipulative page, none on an ordinary page, no network', async () => {
    const popup = await setMode(true);
    expect(await popup.textContent('#mode-label')).toBe('OTOMATIS');
    expect(await registered()).toEqual(['veiltrace-auto']);
    const lure = await openTarget(l, addCorpusScenario(l, 'dev', 'D01-en-blog-security-check-overlay'));
    expect(await badgeBecomes(await tabIdOf(l, lure), '!')).toBe('!');
    const docs = await openTarget(l, addCorpusScenario(l, 'dev', 'D16-en-vendor-install-script'));
    const docsTab = await tabIdOf(l, docs);
    await docs.waitForTimeout(2000);
    expect(await badge(docsTab)).toBe('');
    // The same tab navigating from a lure to an ordinary page loses its badge.
    await lure.goto(addCorpusScenario(l, 'pay-dev', 'PN01-en-checkout'));
    expect(await badgeBecomes(await tabIdOf(l, lure), '')).toBe('');
    expect(l.blocked).toEqual([]);
  });

  it('rescans when a lure appears after load, including on a page that changes constantly', async () => {
    l.pages.set('https://late.test/', html(`<main><h1>Live chat</h1><ul id="log"></ul></main><script>
      let n = 0; setInterval(() => { const li = document.createElement('li'); li.textContent = 'message ' + (++n); document.getElementById('log').appendChild(li); }, 300);
      setTimeout(() => { const d = document.createElement('div'); d.setAttribute('role', 'dialog');
        d.innerHTML = '<p>Verify you are human</p><p>Press Win+R, then Ctrl+V and press Enter.</p>'; document.body.appendChild(d); }, 1500);
    </script>`));
    const page = await openTarget(l, 'https://late.test/');
    expect(await badgeBecomes(await tabIdOf(l, page), '!', 15000)).toBe('!');
  });

  it('opening the popup in automatic mode shows the results without clicking Scan', async () => {
    const lure = await openTarget(l, addCorpusScenario(l, 'cred-dev', 'CD01-en-community-otp-reply'));
    const popup = await openPopup(l, await tabIdOf(l, lure));
    await popup.waitForSelector('body[data-state="done"]');
    expect(await popup.getAttribute('.cred-summary', 'data-verdict')).toBe('manipulative_instruction');
  });

  it('turned off: the content script is unregistered and new pages get no badge', async () => {
    await setMode(false);
    expect(await registered()).toEqual([]);
    const lure = await openTarget(l, addCorpusScenario(l, 'dev', 'D01-en-blog-security-check-overlay'));
    await lure.waitForTimeout(2500);
    expect(await badge(await tabIdOf(l, lure))).toBe('');
  });
});
