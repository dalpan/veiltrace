// Popup controller and renderer: the unified threat dashboard (M5.4) over the four detectors. Page-derived strings are only
// ever inserted as text nodes. UI language: English or Indonesian (i18n.ts); page evidence is shown in its original language.
import type {
  CredEvidenceItem, CredFindingSummary, EvidenceItem, FindingSummary, PayEvidenceItem, PayFindingSummary, ScanReport, SupportEvidenceItem, SupportFindingSummary,
} from '../content/report.js';
import { classifyUrl, extensionVersion, getTargetTab, isTabView, runAiText, runHighlight, runScan, type TargetTab, type UrlClass } from './adapter.js';
import { renderAi, resetAi, setupAi } from './ai-panel.js';
import { autoEnabled, disableAuto, enableAuto, MANAGED } from '../auto/auto.js';
import { aggregate, CATEGORIES, type Category, type Dashboard, type FindingGroup, type FindingRef } from './aggregate.js';
import { detectLang, formatCount, MESSAGES, type HighlightKey, type Lang, type Messages } from './i18n.js';
import { parseHighlightResult, parseScanReport } from './validate.js';

declare const __VT_TEST__: boolean;
/** Optional on-device AI panel (D-093); experimental and off in the standard build after its evaluation (D-095). */
declare const __VT_AI__: boolean;
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
  /** Opt-in automatic scanning (D-081) and the last outcome of a mode change. */
  auto: boolean;
  modeNote: 'denied' | 'failed' | null;
}

const state: State = {
  lang: detectLang(typeof chrome !== 'undefined' && chrome.i18n ? chrome.i18n.getUILanguage() : navigator.language),
  phase: 'idle', tab: null, urlClass: 'unknown', report: null, error: null, scannedOnce: false, totalMs: 0, highlights: new Map(), auto: false, modeNote: null,
};

const t = (): Messages => MESSAGES[state.lang];


/** Engine plus the experimental detector versions, so testers can tell builds apart (D-091). */
const engineLabel = (r: ScanReport): string =>
  `${r.engineVersion} · ${r.credential.detectorVersion} · ${r.payment.detectorVersion} · ${r.support.detectorVersion}`;
function h(tag: string, attrs: Record<string, string> = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

/** Per-render numbering of findings (F-01…) and evidence (E-01…), so a presenter can refer to them. */
interface Numbering {
  finding: number;
  evidence: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Context of one card inside the dashboard: its numbering and the evidence it shares with related findings. */
interface CardCtx {
  ref: FindingRef;
  num: Numbering;
  shared: FindingGroup['shared'];
  /** Shared elements already annotated on this card (the note is shown once per element). */
  noted: Set<string>;
}

/**
 * One evidence row (label, evidence id, page text, Show on page). `text` is page content: a text node, never translated.
 * `key` identifies the highlight outcome across re-renders (language switches).
 */
function evidenceRow(c: CardCtx, key: string, label: string, text: string, locator: string | null): HTMLElement {
  const m = t();
  const evId = `E-${pad(++c.num.evidence)}`;
  const outcome = state.highlights.get(key) ?? (locator ? undefined : 'invalid-locator');
  const status = h('p', { class: 'hl-status', 'aria-live': 'polite' }, outcome ? m.highlight[outcome] : '');
  if (outcome && locator) status.dataset.result = outcome;
  const btn = h('button', { class: 'show', type: 'button', 'aria-describedby': `ev-${evId}` }, m.showOnPage) as HTMLButtonElement;
  btn.disabled = !locator;
  btn.addEventListener('click', async () => {
    if (!locator || !state.tab) return;
    btn.disabled = true;
    let result: HighlightKey;
    try {
      result = parseHighlightResult(await runHighlight(state.tab.id, locator, HIGHLIGHT_MS))?.status ?? 'failed';
    } catch {
      result = 'failed';
    }
    state.highlights.set(key, result);
    status.textContent = t().highlight[result];
    status.dataset.result = result;
    btn.disabled = false;
  });
  const others = locator && !c.noted.has(locator) ? (c.shared.get(locator) ?? []).filter((x) => x !== c.ref.category) : [];
  if (locator && others.length > 0) c.noted.add(locator);
  return h('li', { 'data-evidence-id': evId },
    h('div', { class: 'ev-head' },
      h('span', { class: 'ev-id', title: m.dash.evidenceId(evId), id: `ev-${evId}` }, evId),
      h('span', { class: 'ev-label' }, label),
      btn),
    h('p', { class: 'snippet', lang: '' }, text),
    others.length > 0 && h('p', { class: 'shared', 'data-shared': others.join(' ') }, m.dash.alsoCitedBy(others.map((x) => m.dash.categoryName[x]).join(', '))),
    status);
}

/** The frame every finding shares: category, title, the separate classification / severity / confidence / action-risk chips, body. */
function findingShell(c: CardCtx, cls: string, title: string, ruleChip: string, experimental: boolean, body: Child[]): HTMLElement {
  const m = t();
  const f = c.ref;
  const fid = `F-${pad(++c.num.finding)}`;
  return h('article', {
    class: `card finding${cls ? ` ${cls}` : ''}`, 'data-category': f.category, 'data-rule': f.ruleId, 'data-classification': f.classification,
    'data-risk': f.actionRisk, 'data-finding-id': fid,
  },
  h('div', { class: 'card-head' },
    h('span', { class: 'cat-code', 'data-category': f.category }, m.dash.categoryCode[f.category]),
    h('div', { class: 'category' }, m.dash.categoryName[f.category]),
    h('span', { class: 'fid', title: m.dash.findingId(fid) }, fid)),
  h('h4', {}, title),
  h('div', { class: 'chips' },
    h('span', { class: `chip ${f.classification}` }, m.classification[f.classification]),
    h('span', { class: 'chip severity', 'data-severity': f.classification }, m.severity[f.classification]),
    h('span', { class: 'chip', title: m.confidenceHelp }, m.confidence[f.confidence]),
    h('span', { class: `chip risk-chip ${f.actionRisk}` }, m.dash.actionRiskChip[f.actionRisk]),
    h('span', { class: 'chip rule' }, ruleChip),
    experimental && h('span', { class: 'chip experimental' }, m.dash.experimental)),
  ...body);
}

function evidenceList(items: HTMLElement[], total: number): Child[] {
  const m = t();
  return [
    h('h5', { class: 'ev-title' }, m.dash.evidenceTitle),
    h('ul', { class: 'evidence', 'aria-label': m.evidenceAria }, ...items),
    total > items.length && h('p', { class: 'context', 'data-more': 'evidence' }, m.moreEvidence(total - items.length)),
  ];
}

const lowered = (cls: FindingSummary['classification'], rule: FindingSummary['classification'], reasons: string): string => {
  const m = t();
  return `${cls !== rule ? m.loweredFrom(m.classification[rule]) : m.contextPrefix}${reasons}`;
};

function commandCard(c: CardCtx, f: FindingSummary): HTMLElement {
  const m = t();
  const ev = (e: EvidenceItem, i: number): HTMLElement =>
    evidenceRow(c, `${f.id}:${i}`, `${m.signal[e.signal]} · ${m.source[e.source]}${e.deobfuscated ? ` · ${m.deobfuscated}` : ''}`, e.text, e.locator);
  return findingShell(c, '', m.findingTitle[f.classification], m.ruleChip(f.ruleId), false, [
    h('p', { class: 'explain' }, m.rule[f.ruleId]),
    h('p', { class: 'risk' }, m.actionRisk[f.actionRisk]),
    f.modifiers.length > 0 && h('p', { class: 'context' }, lowered(f.classification, f.ruleClassification, f.modifiers.map((x) => m.modifier[x.id]).join(' '))),
    ...f.overrides.map((o, j) => h('div', { class: 'override', 'data-override': o.id },
      h('p', { class: 'context' }, o.effect === 'capped-at-1' ? m.overrideCapped : m.override[o.id]),
      h('p', { class: 'context' }, `${m.contextSetAside}: ${o.suppressed.map((x) => m.modifier[x]).join(' ')}`),
      o.evidence.length > 0 && h('ul', { class: 'evidence', 'aria-label': m.overrideEvidence }, ...o.evidence.map((e, k) => ev(e, 1000 * (j + 1) + k))),
    )),
    ...evidenceList(f.evidence.map(ev), f.evidenceTotal),
  ]);
}

function credCard(c: CardCtx, f: CredFindingSummary): HTMLElement {
  const m = t();
  const cr = m.cred;
  const indicators = [...f.pretexts.map((p) => cr.pretext[p]), ...f.trustContext.map((x) => cr.trust[x])];
  const ev = (e: CredEvidenceItem, i: number): HTMLElement => evidenceRow(c, `cred:${f.id}:${i}`,
    e.source === 'form-field' ? `${cr.signal[e.signal]} · ${cr.fieldSource}${e.fieldKind ? ` (${cr.fieldKind[e.fieldKind]})` : ''}` : `${cr.signal[e.signal]} · ${m.source['visible-text']}`,
    e.text || (e.source === 'form-field' ? cr.unlabeledField : ''), e.locator);
  return findingShell(c, 'cred', cr.findingTitle[f.classification], cr.ruleChip(f.ruleId), true, [
    h('p', { class: 'explain' }, cr.rule[f.ruleId]),
    h('p', { class: 'requested' }, cr.asks(f.requestedAction, f.secretTypes.map((x) => cr.secret[x]).join(', '))),
    indicators.length > 0 && h('p', { class: 'context indicators' }, `${cr.indicators}: ${indicators.join(' · ')}`),
    f.formDestination && h('p', { class: 'context destination' }, cr.destination[f.formDestination]),
    h('p', { class: 'risk' }, cr.actionRisk[f.actionRisk]),
    f.modifiers.length > 0 && f.overrides.length === 0 && h('p', { class: 'context' }, lowered(f.classification, f.ruleClassification, f.modifiers.map((x) => cr.modifier[x]).join(' '))),
    f.overrides.length > 0 && h('p', { class: 'context', 'data-override': f.overrides.join(' ') }, cr.overrideLiveField),
    ...evidenceList(f.evidence.map(ev), f.evidenceTotal),
    ...f.limitations.map((l) => h('p', { class: 'limitation', 'data-limitation': l }, cr.limitation[l])),
  ]);
}

function payCard(c: CardCtx, f: PayFindingSummary): HTMLElement {
  const m = t();
  const p = m.pay;
  const indicators = [...f.pressures.map((x) => p.pressure[x]), ...f.trustContext.map((x) => m.cred.trust[x])];
  const ev = (e: PayEvidenceItem, i: number): HTMLElement =>
    evidenceRow(c, `pay:${f.id}:${i}`, `${p.signal[e.signal]} · ${m.source['visible-text']}`, e.signal === 'PA.AMOUNT' ? p.amountHidden : e.text, e.locator);
  return findingShell(c, 'pay', p.findingTitle[f.classification], p.ruleChip(f.ruleId), true, [
    h('p', { class: 'explain' }, p.rule[f.ruleId]),
    f.promises.length > 0 && h('p', { class: 'context promises' }, `${p.promisesLabel}: ${f.promises.map((x) => p.promise[x]).join(', ')}`),
    f.destinations.length > 0 && h('p', { class: 'context destinations' }, `${p.destinationsLabel}: ${f.destinations.map((x) => p.destination[x]).join(', ')}`),
    indicators.length > 0 && h('p', { class: 'context indicators' }, `${p.indicators}: ${indicators.join(' · ')}`),
    h('p', { class: 'risk' }, p.actionRisk[f.actionRisk]),
    f.modifiers.length > 0 && h('p', { class: 'context' }, lowered(f.classification, f.ruleClassification, f.modifiers.map((x) => m.cred.modifier[x]).join(' '))),
    ...evidenceList(f.evidence.map(ev), f.evidenceTotal),
    ...f.limitations.map((l) => h('p', { class: 'limitation', 'data-limitation': l }, p.limitation[l])),
  ]);
}

function supCard(c: CardCtx, f: SupportFindingSummary): HTMLElement {
  const m = t();
  const s = m.sup;
  const asks = [...f.requestedActions.map((x) => s.action[x]), ...f.channels.map((x) => s.channel[x])];
  const pressure = [...f.pressures.map((x) => s.pressure[x]), ...f.trustContext.map((x) => m.cred.trust[x])];
  const ev = (e: SupportEvidenceItem, i: number): HTMLElement => evidenceRow(c, `sup:${f.id}:${i}`, `${s.signal[e.signal]} · ${m.source['visible-text']}`,
    e.signal === 'SX.PHONE' || e.signal === 'SX.MOBILE' ? s.contactHidden : e.text, e.locator);
  return findingShell(c, 'sup', s.findingTitle[f.classification], s.ruleChip(f.ruleId), true, [
    h('p', { class: 'explain' }, s.rule[f.ruleId]),
    asks.length > 0 && h('p', { class: 'context asks' }, `${s.asksLabel}: ${asks.join(', ')}`),
    f.claims.length > 0 && h('p', { class: 'context claims' }, `${s.claimsLabel}: ${f.claims.map((x) => s.claim[x]).join(', ')}`),
    f.indicators.length > 0 && h('p', { class: 'context indicators' }, `${s.indicatorsLabel}: ${f.indicators.map((x) => s.indicator[x]).join(' · ')}`),
    pressure.length > 0 && h('p', { class: 'context pressure' }, `${s.pressureLabel}: ${pressure.join(' · ')}`),
    h('p', { class: 'risk' }, s.actionRisk[f.actionRisk]),
    f.modifiers.length > 0 && h('p', { class: 'context' }, lowered(f.classification, f.ruleClassification, f.modifiers.map((x) => m.cred.modifier[x]).join(' '))),
    ...evidenceList(f.evidence.map(ev), f.evidenceTotal),
    ...f.limitations.map((l) => h('p', { class: 'limitation', 'data-limitation': l }, s.limitation[l])),
  ]);
}

function card(r: ScanReport, c: CardCtx): HTMLElement {
  const { category, index } = c.ref;
  if (category === 'command') return commandCard(c, r.findings[index] as FindingSummary);
  if (category === 'credential') return credCard(c, r.credential.findings[index] as CredFindingSummary);
  if (category === 'payment') return payCard(c, r.payment.findings[index] as PayFindingSummary);
  return supCard(c, r.support.findings[index] as SupportFindingSummary);
}

/** A group of related findings keeps every member card (provenance); single findings render as plain cards. */
function renderGroup(r: ScanReport, g: FindingGroup, num: Numbering): HTMLElement {
  const cards = g.members.map((ref) => card(r, { ref, num, shared: g.shared, noted: new Set() }));
  if (cards.length === 1) return cards[0] as HTMLElement;
  const m = t();
  return h('section', { class: 'finding-group', 'data-group-size': String(cards.length), 'aria-label': m.dash.groupTitle(cards.length) },
    h('p', { class: 'group-head' }, m.dash.groupTitle(cards.length)), h('p', { class: 'group-note' }, m.dash.groupNote), ...cards);
}

const LEGACY_CLASS: Record<Category, string> = { command: 'summary', credential: 'cred-summary', payment: 'pay-summary', support: 'sup-summary' };
const TONE: Record<ScanReport['verdict'], string> = { manipulative_instruction: 'danger', suspicious_correlation: 'warning', observed_instruction: 'neutral', none: 'neutral' };

function renderSummary(r: ScanReport, d: Dashboard): HTMLElement {
  const m = t();
  const head = m.dash.headline[d.highest];
  const stat = (key: string, label: string, value: string, extra: Record<string, string> = {}): HTMLElement =>
    h('div', { class: 'stat', 'data-stat': key, ...extra }, h('dt', {}, label), h('dd', {}, value));
  return h('div', { class: `card threat-summary tone-${head.tone}`, 'data-verdict': d.highest, 'data-actionable': String(d.actionable) },
    h('div', { class: 'panel-label' }, m.dash.assessment),
    h('h2', {}, head.title),
    h('p', {}, head.detail + (r.status.complete ? '' : m.partialQualifier)),
    h('dl', { class: 'stats' },
      stat('highest', m.dash.statHighest, m.dash.verdictLabel[d.highest], { 'data-verdict': d.highest }),
      stat('actionable', m.dash.statActionable, formatCount(d.actionable, state.lang)),
      stat('categories', m.dash.statCategories, d.affected.length > 0 ? d.affected.map((c) => m.dash.categoryCode[c]).join(' · ') : m.dash.noCategories),
      stat('coverage', m.dash.statCoverage, m.dash.coverageValue[d.complete ? 'complete' : 'partial'], { 'data-complete': String(d.complete) })));
}

function renderOverview(d: Dashboard): HTMLElement {
  const m = t();
  return h('section', { class: 'overview', 'aria-labelledby': 'overview-title' },
    h('h3', { class: 'section', id: 'overview-title' }, m.dash.overviewTitle),
    h('div', { class: 'cat-grid' }, ...CATEGORIES.map((c) => {
      const s = d.categories[c];
      return h('div', { class: `cat ${LEGACY_CLASS[c]} tone-${TONE[s.verdict]}`, 'data-category': c, 'data-verdict': s.verdict },
        h('span', { class: 'cat-code', 'data-category': c }, m.dash.categoryCode[c]),
        h('div', { class: 'category' }, c === 'command' ? m.dash.categoryName[c] : `${m.dash.categoryName[c]} · ${m.dash.experimental}`),
        h('h2', {}, m.dash.verdictLabel[s.verdict]),
        h('p', { class: 'cat-count' }, m.dash.tileCount(s.total, s.actionable)));
    })),
    h('p', { class: 'limitation experimental-note' }, m.dash.experimentalNote));
}

function renderCoverage(r: ScanReport): HTMLElement {
  const m = t();
  const blocks = formatCount(r.counts.blocks, state.lang);
  return r.status.complete
    ? h('div', { class: 'card coverage', 'data-complete': 'true' }, h('h3', {}, m.completeTitle), h('p', {}, m.completeText(blocks)))
    : h('div', { class: 'card coverage partial', role: 'note', 'data-complete': 'false' },
      h('h3', {}, m.partialTitle),
      h('ul', {}, ...r.status.reasons.map((g) => h('li', { 'data-reason': g }, m.partial[g]))),
      h('p', {}, m.partialFooter(blocks)));
}

/** Advice for each affected category; remote-access advice when a support finding asks for remote access or an install. */
function renderAdvice(r: ScanReport, d: Dashboard): HTMLElement {
  const m = t();
  const remote = r.support.findings.some((f) => f.classification !== 'observed_instruction'
    && (f.requestedActions.includes('remote-access') || f.requestedActions.includes('install')));
  const items: Array<[string, string]> = d.affected.map((c) => [c, m.dash.advice[c]]);
  if (remote) items.push(['remoteAccess', m.dash.advice.remoteAccess]);
  return h('section', { class: 'card advice', 'aria-labelledby': 'advice-title', 'data-advice': items.map(([k]) => k).join(' ') || 'none' },
    h('h3', { id: 'advice-title' }, m.dash.adviceTitle),
    items.length > 0
      ? h('ul', {}, ...items.map(([k, text]) => h('li', { 'data-advice': k }, text)))
      : h('p', {}, m.dash.adviceNone));
}

function renderReport(r: ScanReport): Child[] {
  const m = t();
  const d = aggregate(r);
  const num: Numbering = { finding: 0, evidence: 0 };
  const hidden = (r.counts.findingsTotal - r.findings.length) + (r.credential.findingsTotal - r.credential.findings.length)
    + (r.payment.findingsTotal - r.payment.findings.length) + (r.support.findingsTotal - r.support.findings.length);
  const observedCount = d.observed.reduce((n, g) => n + g.members.length, 0);
  const alertCount = d.groups.reduce((n, g) => n + g.members.length, 0);
  return [
    renderSummary(r, d),
    renderOverview(d),
    renderCoverage(r),
    renderAdvice(r, d),
    alertCount > 0 && h('h3', { class: 'section findings-title' }, m.dash.findingsTitle(alertCount)),
    ...d.groups.map((g) => renderGroup(r, g, num)),
    observedCount > 0 && h('details', { class: 'observed' }, h('summary', {}, m.dash.observedTitle(observedCount)), ...d.observed.map((g) => renderGroup(r, g, num))),
    hidden > 0 && h('p', { class: 'context', 'data-more': 'findings' }, m.moreFindings(hidden)),
  ];
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
  const scanState = state.phase === 'scanning' ? 'scanning' : state.phase === 'error' ? 'error'
    : state.phase === 'done' && state.report ? (state.report.status.complete ? 'complete' : 'partial') : 'standby';
  $('scan-state').textContent = m.dash.stateLabel[scanState];
  // Optional on-device AI second opinion (D-093): offered only after a finished scan, below the VeilTrace result.
  if (__VT_AI__) renderAi(state.phase === 'done' && state.report !== null);
  $('scan-state').dataset.state = scanState;
  const version = extensionVersion();
  $('version').textContent = version ? `v${version}` : '';
  $('mode').dataset.mode = state.auto ? 'automatic' : 'manual';
  $('mode-title').textContent = m.auto.title;
  $('mode-label').textContent = m.auto.modeLabel[state.auto ? 'automatic' : 'manual'];
  $('mode-text').textContent = MANAGED ? m.auto.managedText : state.auto ? m.auto.automaticText : m.auto.manualText;
  $('mode-consent').textContent = state.auto || MANAGED ? '' : m.auto.consent;
  $('mode-toggle').textContent = state.auto ? m.auto.disable : m.auto.enable;
  $('mode-toggle').hidden = MANAGED;
  $('mode-status').textContent = state.modeNote ? m.auto[state.modeNote] : '';
  $('limits-summary').textContent = m.limitsSummary;
  $('limits').textContent = m.limitsText;
  $('meta').textContent = state.report && state.phase === 'done'
    ? m.meta(engineLabel(state.report), state.report.extractorVersion, state.totalMs)
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
  if (__VT_AI__) resetAi();
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
    $('meta').textContent = t().meta(engineLabel(report), report.extractorVersion, state.totalMs);
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

/** Turning automatic scanning on asks Chrome for the optional host permission, so it must run straight from the click. */
async function toggleMode(): Promise<void> {
  const btn = $('mode-toggle') as HTMLButtonElement;
  btn.disabled = true;
  try {
    if (state.auto) {
      await disableAuto();
      Object.assign(state, { auto: false, modeNote: null });
    } else {
      const on = await enableAuto();
      Object.assign(state, { auto: on, modeNote: on ? null : 'denied' });
    }
  } catch {
    state.modeNote = 'failed';
  } finally {
    btn.disabled = false;
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
  if (__VT_AI__) setupAi({
    t, tabId: () => state.tab?.id ?? null, readText: runAiText,
    alerted: () => state.report !== null && aggregate(state.report).actionable > 0,
  });
  $('mode-toggle').addEventListener('click', () => void toggleMode());
  if (await isTabView()) document.documentElement.classList.add('fluid');
  state.auto = await autoEnabled();
  state.tab = await getTargetTab().catch(() => null);
  state.urlClass = classifyUrl(state.tab?.url);
  if (!state.tab) Object.assign(state, { phase: 'error', error: 'noPage' });
  // Chrome withholds the URL of pages an extension may not access (chrome://, other extensions, the Web Store).
  else if (state.urlClass === 'restricted' || state.urlClass === 'unknown') {
    Object.assign(state, { phase: 'error', error: 'restricted' });
    document.body.dataset.restricted = state.urlClass;
  }
  render();
  // With automatic scanning on, opening the popup shows the current page's results without an extra click.
  if (state.auto && state.phase === 'idle') await scan();
}

void main();
