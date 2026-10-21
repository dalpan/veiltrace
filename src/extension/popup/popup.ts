// Popup controller and renderer. Page-derived strings are only ever inserted as text nodes.
// UI language: English or Indonesian (i18n.ts); page evidence is shown in its original language.
import type { CredEvidenceItem, CredFindingSummary, EvidenceItem, FindingSummary, ScanReport } from '../content/report.js';
import { classifyUrl, getTargetTab, runHighlight, runScan, type TargetTab, type UrlClass } from './adapter.js';
import { detectLang, formatCount, MESSAGES, type HighlightKey, type Lang, type Messages } from './i18n.js';
import { parseHighlightResult, parseScanReport } from './validate.js';

declare const __VT_TEST__: boolean;
const HIGHLIGHT_MS = __VT_TEST__ ? 1500 : 5000;

type Child = Node | string | null | undefined | false;
type ErrorKind = 'noPage' | 'restricted' | 'access' | 'file' | 'badReport';
type Phase = 'idle' | 'scanning' | 'done' | 'error';

interface State {
  lang: Lang;
  phase: Phase;
  tab: TargetTab | null;
  urlClass: UrlClass;
  report: ScanReport | null;
  error: ErrorKind | null;
  scannedOnce: boolean;
  totalMs: number;
  /** Highlight outcome per evidence key, kept across language switches. */
  highlights: Map<string, HighlightKey>;
}

const state: State = {
  lang: detectLang(typeof chrome !== 'undefined' && chrome.i18n ? chrome.i18n.getUILanguage() : navigator.language),
  phase: 'idle', tab: null, urlClass: 'unknown', report: null, error: null, scannedOnce: false, totalMs: 0, highlights: new Map(),
};

const t = (): Messages => MESSAGES[state.lang];

function h(tag: string, attrs: Record<string, string> = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

/** One evidence row (label, page text, Show on page). `text` is page content: a text node, never translated. */
function evidenceRow(key: string, label: string, text: string, locator: string | null): HTMLElement {
  const m = t();
  const e = { locator };
  const outcome = state.highlights.get(key) ?? (e.locator ? undefined : 'invalid-locator');
  const status = h('p', { class: 'hl-status', 'aria-live': 'polite' }, outcome ? m.highlight[outcome] : '');
  if (outcome && e.locator) status.dataset.result = outcome;
  const btn = h('button', { class: 'secondary', type: 'button' }, m.showOnPage) as HTMLButtonElement;
  btn.disabled = !e.locator;
  btn.addEventListener('click', async () => {
    if (!e.locator || !state.tab) return;
    btn.disabled = true;
    let result: HighlightKey;
    try {
      result = parseHighlightResult(await runHighlight(state.tab.id, e.locator, HIGHLIGHT_MS))?.status ?? 'failed';
    } catch {
      result = 'failed';
    }
    state.highlights.set(key, result);
    status.textContent = t().highlight[result];
    status.dataset.result = result;
    btn.disabled = false;
  });
  return h('li', {}, h('div', { class: 'ev-head' }, h('span', { class: 'ev-label' }, label), btn), h('p', { class: 'snippet', lang: '' }, text), status);
}

function evidenceItem(f: FindingSummary, i: number, e: EvidenceItem): HTMLElement {
  const m = t();
  return evidenceRow(`${f.id}:${i}`, `${m.signal[e.signal]} · ${m.source[e.source]}${e.deobfuscated ? ` · ${m.deobfuscated}` : ''}`, e.text, e.locator);
}

function credEvidenceItem(f: CredFindingSummary, i: number, e: CredEvidenceItem): HTMLElement {
  const c = t().cred;
  const label = e.source === 'form-field'
    ? `${c.signal[e.signal]} · ${c.fieldSource}${e.fieldKind ? ` (${c.fieldKind[e.fieldKind]})` : ''}`
    : `${c.signal[e.signal]} · ${t().source['visible-text']}`;
  return evidenceRow(`cred:${f.id}:${i}`, label, e.text || (e.source === 'form-field' ? c.unlabeledField : ''), e.locator);
}

function credFindingCard(f: CredFindingSummary): HTMLElement {
  const m = t();
  const c = m.cred;
  const demoted = f.classification !== f.ruleClassification;
  const indicators = [...f.pretexts.map((p) => c.pretext[p]), ...f.trustContext.map((x) => c.trust[x])];
  return h('article', { class: 'card finding cred', 'data-rule': f.ruleId, 'data-classification': f.classification },
    h('h4', {}, c.findingTitle[f.classification]),
    h('div', { class: 'chips' },
      h('span', { class: `chip ${f.classification}` }, m.classification[f.classification]),
      h('span', { class: 'chip', title: m.confidenceHelp }, m.confidence[f.confidence]),
      h('span', { class: 'chip' }, c.ruleChip(f.ruleId)),
      h('span', { class: 'chip experimental' }, c.experimental),
    ),
    h('p', { class: 'explain' }, c.rule[f.ruleId]),
    h('p', { class: 'requested' }, c.asks(f.requestedAction, f.secretTypes.map((x) => c.secret[x]).join(', '))),
    indicators.length > 0 && h('p', { class: 'context indicators' }, `${c.indicators}: ${indicators.join(' · ')}`),
    f.formDestination && h('p', { class: 'context destination' }, c.destination[f.formDestination]),
    h('p', { class: 'risk' }, c.actionRisk[f.actionRisk]),
    f.modifiers.length > 0 && f.overrides.length === 0 && h('p', { class: 'context' },
      `${demoted ? m.loweredFrom(m.classification[f.ruleClassification]) : m.contextPrefix}${f.modifiers.map((x) => c.modifier[x]).join(' ')}`),
    f.overrides.length > 0 && h('p', { class: 'context', 'data-override': f.overrides.join(' ') }, c.overrideLiveField),
    h('ul', { class: 'evidence', 'aria-label': m.evidenceAria }, ...f.evidence.map((e, i) => credEvidenceItem(f, i, e))),
    f.evidenceTotal > f.evidence.length && h('p', { class: 'context', 'data-more': 'evidence' }, m.moreEvidence(f.evidenceTotal - f.evidence.length)),
    ...f.limitations.map((l) => h('p', { class: 'limitation', 'data-limitation': l }, c.limitation[l])),
  );
}

const TIER: Record<ScanReport['verdict'], number> = { none: 0, observed_instruction: 1, suspicious_correlation: 2, manipulative_instruction: 3 };

/** The experimental credential section: its own summary card, alert findings, collapsed observed requests, a note. */
function renderCredential(r: ScanReport): Child[] {
  const c = t().cred;
  const sec = r.credential;
  const head = c.headline[sec.verdict];
  const alerting = sec.findings.filter((f) => f.classification !== 'observed_instruction');
  const observed = sec.findings.filter((f) => f.classification === 'observed_instruction');
  return [
    h('div', { class: `card cred-summary tone-${head.tone}`, 'data-verdict': sec.verdict },
      h('div', { class: 'category' }, `${c.categorySecret} · ${c.experimental}`), h('h2', {}, head.title),
      h('p', {}, head.detail + (r.status.complete ? '' : t().partialQualifier))),
    ...alerting.map(credFindingCard),
    observed.length > 0 && h('details', { class: 'observed cred-observed' }, h('summary', {}, c.observedHeading(observed.length)), ...observed.map(credFindingCard)),
    sec.findingsTotal > sec.findings.length && h('p', { class: 'context', 'data-more': 'cred-findings' }, t().moreFindings(sec.findingsTotal - sec.findings.length)),
    h('p', { class: 'limitation experimental-note' }, c.experimentalNote),
  ];
}

function findingCard(f: FindingSummary): HTMLElement {
  const m = t();
  const demoted = f.classification !== f.ruleClassification;
  const context = f.modifiers.map((x) => m.modifier[x.id]).join(' ');
  return h('article', { class: 'card finding', 'data-rule': f.ruleId, 'data-classification': f.classification },
    h('h4', {}, m.findingTitle[f.classification]),
    h('div', { class: 'chips' },
      h('span', { class: `chip ${f.classification}` }, m.classification[f.classification]),
      h('span', { class: 'chip', title: m.confidenceHelp }, m.confidence[f.confidence]),
      h('span', { class: 'chip', title: f.ruleName }, m.ruleChip(f.ruleId)),
    ),
    h('p', { class: 'explain' }, m.rule[f.ruleId]),
    h('p', { class: 'risk' }, m.actionRisk[f.actionRisk]),
    f.modifiers.length > 0 && h('p', { class: 'context' }, `${demoted ? m.loweredFrom(m.classification[f.ruleClassification]) : m.contextPrefix}${context}`),
    ...f.overrides.map((o, j) => h('div', { class: 'override', 'data-override': o.id },
      h('p', { class: 'context' }, o.effect === 'capped-at-1' ? m.overrideCapped : m.override[o.id]),
      h('p', { class: 'context' }, `${m.contextSetAside}: ${o.suppressed.map((x) => m.modifier[x]).join(' ')}`),
      o.evidence.length > 0 && h('ul', { class: 'evidence', 'aria-label': m.overrideEvidence }, ...o.evidence.map((e, k) => evidenceItem(f, 1000 * (j + 1) + k, e))),
    )),
    h('ul', { class: 'evidence', 'aria-label': m.evidenceAria }, ...f.evidence.map((e, i) => evidenceItem(f, i, e))),
    f.evidenceTotal > f.evidence.length && h('p', { class: 'context', 'data-more': 'evidence' }, m.moreEvidence(f.evidenceTotal - f.evidence.length)),
  );
}

function renderReport(r: ScanReport): Child[] {
  const m = t();
  const head = m.headline[r.verdict];
  const alerting = r.findings.filter((f) => f.classification !== 'observed_instruction');
  const observed = r.findings.filter((f) => f.classification === 'observed_instruction');
  const partial = !r.status.complete;
  const blocks = formatCount(r.counts.blocks, state.lang);
  const command: Child[] = [
    h('div', { class: `card summary tone-${head.tone}`, 'data-verdict': r.verdict },
      h('div', { class: 'category' }, m.cred.categoryCommand), h('h2', {}, head.title), h('p', {}, head.detail + (partial ? m.partialQualifier : ''))),
    partial
      ? h('div', { class: 'card coverage partial', role: 'note', 'data-complete': 'false' },
        h('h3', {}, m.partialTitle),
        h('ul', {}, ...r.status.reasons.map((g) => h('li', { 'data-reason': g }, m.partial[g]))),
        h('p', {}, m.partialFooter(blocks)))
      : h('div', { class: 'card coverage', 'data-complete': 'true' }, h('h3', {}, m.completeTitle), h('p', {}, m.completeText(blocks))),
    alerting.length > 0 && h('h3', { class: 'section' }, m.findingsHeading(alerting.length)),
    ...alerting.map(findingCard),
    observed.length > 0 && h('details', { class: 'observed' }, h('summary', {}, m.observedHeading(observed.length)), ...observed.map(findingCard)),
    r.counts.findingsTotal > r.findings.length && h('p', { class: 'context', 'data-more': 'findings' }, m.moreFindings(r.counts.findingsTotal - r.findings.length)),
  ];
  // Coverage applies to both detectors; the more severe detector's section comes first.
  const coverage = command.splice(1, 1);
  const cred = renderCredential(r);
  const [first, ...rest] = TIER[r.credential.verdict] > TIER[r.verdict] ? [...cred, ...command] : [...command, ...cred];
  return [first, ...coverage, ...rest];
}

function renderError(kind: ErrorKind): HTMLElement {
  const e = t().errors;
  const [title, detail] = {
    noPage: [e.noPageTitle, e.noPageDetail],
    restricted: [e.restrictedTitle, e.restrictedDetail],
    access: [e.accessTitle, e.accessDetail],
    file: [e.accessTitle, e.fileDetail],
    badReport: [e.badReportTitle, e.badReportDetail],
  }[kind];
  return h('div', { class: 'card error', role: 'alert', 'data-error': kind }, h('strong', {}, title), h('p', {}, detail));
}

/** Re-renders every piece of UI text from the state (after scans and language switches). */
function render(): void {
  const m = t();
  document.documentElement.lang = state.lang;
  document.body.dataset.state = state.phase;
  document.body.dataset.lang = state.lang;
  $('tagline').textContent = m.tagline;
  $('target-label').textContent = m.pageLabel;
  $('lang-label').textContent = m.languageLabel;
  for (const l of ['en', 'id'] as const) $(`lang-${l}`).setAttribute('aria-pressed', String(state.lang === l));
  const tab = state.tab;
  $('target-host').textContent = tab?.url
    ? (state.urlClass === 'scannable' ? new URL(tab.url).host : tab.url.split(/[?#]/)[0] ?? '')
    : tab ? m.protectedPage : m.noPage;
  const scanBtn = $('scan') as HTMLButtonElement;
  scanBtn.textContent = state.scannedOnce ? m.scanAgain : m.scan;
  scanBtn.disabled = state.phase === 'scanning' || state.urlClass === 'restricted' || state.urlClass === 'unknown' || !tab;
  $('status').textContent = state.phase === 'scanning' ? m.scanning : state.phase === 'done' ? m.scanFinished : '';
  $('limits-summary').textContent = m.limitsSummary;
  $('limits').textContent = m.limitsText;
  $('meta').textContent = state.report && state.phase === 'done'
    ? m.meta(state.report.engineVersion, state.report.extractorVersion, state.totalMs)
    : m.metaIdle;
  const result = $('result');
  if (state.error) {
    result.replaceChildren(renderError(state.error));
    result.hidden = false;
  } else if (state.report && state.phase === 'done') {
    result.replaceChildren(...renderReport(state.report).filter((p): p is Node => p instanceof Node));
    result.hidden = false;
  } else {
    result.replaceChildren();
    result.hidden = true;
  }
}

const round = (n: number): number => Math.round(n * 10) / 10;

async function scan(): Promise<void> {
  const tab = state.tab;
  if (!tab) return;
  Object.assign(state, { phase: 'scanning', error: null, report: null, highlights: new Map() });
  render();
  document.body.dataset.injections = String(Number(document.body.dataset.injections ?? '0') + 1);
  const t0 = performance.now();
  try {
    const call = await runScan(tab.id);
    const report = parseScanReport(call.raw);
    if (!report) {
      Object.assign(state, { phase: 'error', error: 'badReport' });
      return;
    }
    const tr = performance.now();
    Object.assign(state, { phase: 'done', report, scannedOnce: true });
    render();
    const t1 = performance.now();
    state.totalMs = Math.round(t1 - t0);
    $('meta').textContent = t().meta(report.engineVersion, report.extractorVersion, state.totalMs);
    document.body.dataset.timing = JSON.stringify({
      injectMs: round(call.injectMs), callMs: round(call.callMs), extractMs: report.timing.extractMs, analyzeMs: report.timing.analyzeMs,
      transferMs: round(Math.max(0, call.callMs - report.timing.extractMs - report.timing.analyzeMs)), renderMs: round(t1 - tr), totalMs: round(t1 - t0),
    });
  } catch {
    Object.assign(state, { phase: 'error', error: state.urlClass === 'file' ? 'file' : 'access' });
  } finally {
    state.scannedOnce = true;
    if (state.phase === 'scanning') state.phase = 'error';
    render();
  }
}

async function main(): Promise<void> {
  for (const l of ['en', 'id'] as const) {
    $(`lang-${l}`).addEventListener('click', () => {
      state.lang = l;
      render();
    });
  }
  $('scan').addEventListener('click', () => void scan());
  state.tab = await getTargetTab().catch(() => null);
  state.urlClass = classifyUrl(state.tab?.url);
  if (!state.tab) Object.assign(state, { phase: 'error', error: 'noPage' });
  // Chrome withholds the URL of pages an extension may not access (chrome://, other extensions, the Web Store).
  else if (state.urlClass === 'restricted' || state.urlClass === 'unknown') {
    Object.assign(state, { phase: 'error', error: 'restricted' });
    document.body.dataset.restricted = state.urlClass;
  }
  render();
}

void main();
