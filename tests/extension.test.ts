// Unit tests for the extension's browser-independent pieces (no browser needed).
import { describe, expect, it } from 'vitest';
import { analyze } from '../src/core/index.js';
import { buildReport, MAX_SNIPPET_CHARS } from '../src/extension/content/report.js';
import { parseHighlightResult, parseScanReport } from '../src/extension/popup/validate.js';
import { isSafeLocator } from '../src/extract/extract.js';
import { snapshot } from './fixtures/build.js';

// adapter.ts references the build-time constant; define it before import.
(globalThis as { __VT_TEST__?: boolean }).__VT_TEST__ = false;
const { classifyUrl } = await import('../src/extension/popup/adapter.js');

const lure = () => snapshot([
  { t: 'Verify you are human', c: 'modal' }, { t: 'Press Win+R', c: 'modal' }, { t: 'Press Ctrl+V', c: 'modal' }, { t: 'Press Enter', c: 'modal' },
  { t: 'Unrelated article text that the popup never needs to see.', c: 'main' },
]);
const report = () => {
  const s = lure();
  return buildReport(s, analyze(s), { engine: 'e', extractor: 'x' }, { extractMs: 1.234, analyzeMs: 0.56 });
};

describe('buildReport (data minimization)', () => {
  it('sends only findings, their evidence snippets, coverage and counts, never the snapshot', () => {
    const r = report();
    const json = JSON.stringify(r);
    expect(json).not.toContain('Unrelated article text');
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]!.evidence.map((e) => e.text)).toEqual(['Verify you are human', 'Win+R', 'Ctrl+V', 'Press Enter']);
    expect(r.findings[0]!.evidence[0]!.locator).toBe('#b0');
    expect(r.counts).toEqual({ blocks: 5, hiddenCopyCandidates: 0, copyTriggers: 0, observations: 4, findingsTotal: 1 });
    expect(r.status).toEqual({ complete: true, reasons: [] });
    expect(r.timing).toEqual({ extractMs: 1.2, analyzeMs: 0.6 });
  });

  it('caps snippet length', () => {
    const long = `Verify you are human. Press Win+R, then Ctrl+V and press Enter. ${'x'.repeat(1000)}`;
    const s = snapshot([long]);
    const r = buildReport(s, analyze(s), { engine: 'e', extractor: 'x' }, { extractMs: 0, analyzeMs: 0 });
    for (const e of r.findings[0]!.evidence) expect(e.text.length).toBeLessThanOrEqual(MAX_SNIPPET_CHARS);
  });

  it('reports exactly what the core decided (no extension-side reclassification)', () => {
    const s = lure();
    const a = analyze(s);
    const r = buildReport(s, a, { engine: 'e', extractor: 'x' }, { extractMs: 0, analyzeMs: 0 });
    expect(r.verdict).toBe(a.verdict);
    expect(r.findings.map((f) => [f.ruleId, f.classification, f.confidence, f.actionRisk])).toEqual(a.findings.map((f) => [f.ruleId, f.classification, f.confidence, f.actionRisk]));
  });
});

describe('parseScanReport (boundary validation)', () => {
  it('accepts a well-formed report and returns an equivalent copy', () => {
    const r = report();
    expect(parseScanReport(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });

  it('rejects malformed or out-of-range data', () => {
    const good = JSON.parse(JSON.stringify(report()));
    const bad = (mut: (r: typeof good) => void) => { const c = structuredClone(good); mut(c); return parseScanReport(c); };
    expect(parseScanReport(null)).toBeNull();
    expect(parseScanReport('{}')).toBeNull();
    expect(bad((r) => { r.v = 2; })).toBeNull();
    expect(bad((r) => { r.verdict = 'safe'; })).toBeNull();
    expect(bad((r) => { r.findings[0].classification = 'benign'; })).toBeNull();
    expect(bad((r) => { r.findings[0].evidence[0].text = 'x'.repeat(5000); })).toBeNull();
    expect(bad((r) => { r.findings[0].evidence[0].signal = 'X.EVIL'; })).toBeNull();
    expect(bad((r) => { r.status.reasons = ['everything-fine']; })).toBeNull();
    expect(bad((r) => { r.counts.blocks = -1; })).toBeNull();
    expect(bad((r) => { r.findings = Array(51).fill(r.findings[0]); })).toBeNull();
  });

  it('drops unsafe locators instead of passing them back to the page', () => {
    const r = JSON.parse(JSON.stringify(report()));
    r.findings[0].evidence[0].locator = 'body:has(script)';
    r.findings[0].evidence[1].locator = '*';
    const parsed = parseScanReport(r)!;
    expect(parsed.findings[0]!.evidence[0]!.locator).toBeNull();
    expect(parsed.findings[0]!.evidence[1]!.locator).toBeNull();
  });

  it('validates highlight results', () => {
    expect(parseHighlightResult({ status: 'highlighted' })).toEqual({ status: 'highlighted' });
    expect(parseHighlightResult({ status: 'done' })).toBeNull();
    expect(parseHighlightResult('highlighted')).toBeNull();
  });
});

describe('isSafeLocator', () => {
  it('accepts only extractor-shaped locators', () => {
    for (const ok of ['#gate', 'body', 'body > div:nth-of-type(2) > p:nth-of-type(1)', '#host::shadow::div:nth-of-type(1)', 'body > iframe:nth-of-type(1)::frame::body', 'x-w:nth-of-type(1)']) {
      expect(isSafeLocator(ok), ok).toBe(true);
    }
    for (const bad of ['', '*', 'div p', 'p:has(a)', 'a[href^=javascript]', '#x, body', 'body > div:nth-of-type(1) >', 'div:nth-child(2)', '#1abc', 'x'.repeat(3000), 42, null]) {
      expect(isSafeLocator(bad), String(bad)).toBe(false);
    }
  });
});

describe('classifyUrl (restricted pages)', () => {
  it('classifies pages where injection is not allowed', () => {
    expect(classifyUrl('https://example.com/a')).toBe('scannable');
    expect(classifyUrl('http://localhost:8080/')).toBe('scannable');
    expect(classifyUrl('file:///Users/x/a.html')).toBe('file');
    for (const r of ['chrome://settings', 'chrome-extension://abc/popup.html', 'edge://flags', 'about:blank', 'view-source:https://a.com', 'data:text/html,x',
      'devtools://devtools', 'https://chromewebstore.google.com/detail/x', 'https://chrome.google.com/webstore/detail/x', 'https://microsoftedge.microsoft.com/addons/x']) {
      expect(classifyUrl(r), r).toBe('restricted');
    }
    expect(classifyUrl(undefined)).toBe('unknown');
    expect(classifyUrl('not a url')).toBe('unknown');
  });
});
