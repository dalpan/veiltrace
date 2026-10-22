// "Cek Pesan" PWA (D-084): checks a pasted or shared message with the four detectors, on the device. Page-derived and
// user-provided text is only ever inserted as text nodes. No network: CSP connect-src 'none'; the service worker only
// caches the app and hands over shared text without putting it in the URL.
import type { ScanReport } from '../extension/content/report.js';
import { aggregate, type Category } from '../extension/popup/aggregate.js';
import { detectLang, formatCount, MESSAGES, type Lang, type Messages } from '../extension/popup/i18n.js';
import { checkMessage, isLinkOnly, MAX_MESSAGE_CHARS, type MessageSource } from './message.js';

declare const __VT_VERSION__: string;

const SHARED_CACHE = 'veiltrace-share';
const SHARED_KEY = './__shared__';

type Child = Node | string | null | undefined | false;
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
function h(tag: string, attrs: Record<string, string> = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

const state: { lang: Lang; report: ScanReport | null; text: string; note: string | null } = {
  lang: detectLang(navigator.language), report: null, text: '', note: null,
};
const t = (): Messages => MESSAGES[state.lang];
const SOURCES: MessageSource[] = ['chat', 'sms', 'email', 'web'];

/** The message with every evidence snippet marked, built from text nodes only. */
function markedMessage(text: string, snippets: readonly string[]): HTMLElement {
  const ranges: Array<[number, number]> = [];
  for (const s of new Set(snippets.filter((x) => x.length > 1))) {
    const lower = text.toLowerCase();
    let i = lower.indexOf(s.toLowerCase());
    while (i >= 0) {
      ranges.push([i, i + s.length]);
      i = lower.indexOf(s.toLowerCase(), i + s.length);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const box = h('div', { class: 'message', lang: '' });
  let pos = 0;
  for (const [a, b] of ranges) {
    if (a < pos) continue;
    box.append(document.createTextNode(text.slice(pos, a)), h('mark', {}, text.slice(a, b)));
    pos = b;
  }
  box.append(document.createTextNode(text.slice(pos)));
  return box;
}

interface Item { category: Category; classification: string; title: string; explain: string; rule: string; confidence: string; risk: string; evidence: Array<[string, string]> }

function items(r: ScanReport): Item[] {
  const m = t();
  const signal = (cat: Category, s: string): string => (cat === 'command' ? m.signal[s as keyof Messages['signal']] : cat === 'credential' ? m.cred.signal[s as keyof Messages['cred']['signal']]
    : cat === 'payment' ? m.pay.signal[s as keyof Messages['pay']['signal']] : m.sup.signal[s as keyof Messages['sup']['signal']]) ?? s;
  const shown = (s: string, text: string): string => (s === 'PA.AMOUNT' ? m.pay.amountHidden : s === 'SX.PHONE' || s === 'SX.MOBILE' ? m.sup.contactHidden : text);
  return [
    ...r.findings.map((f): Item => ({ category: 'command', classification: f.classification, title: m.findingTitle[f.classification], explain: m.rule[f.ruleId], rule: m.ruleChip(f.ruleId),
      confidence: m.confidence[f.confidence], risk: m.dash.actionRiskChip[f.actionRisk], evidence: f.evidence.map((e) => [signal('command', e.signal), e.text]) })),
    ...r.credential.findings.map((f): Item => ({ category: 'credential', classification: f.classification, title: m.cred.findingTitle[f.classification], explain: m.cred.rule[f.ruleId], rule: m.cred.ruleChip(f.ruleId),
      confidence: m.confidence[f.confidence], risk: m.dash.actionRiskChip[f.actionRisk], evidence: f.evidence.map((e) => [signal('credential', e.signal), e.text]) })),
    ...r.payment.findings.map((f): Item => ({ category: 'payment', classification: f.classification, title: m.pay.findingTitle[f.classification], explain: m.pay.rule[f.ruleId], rule: m.pay.ruleChip(f.ruleId),
      confidence: m.confidence[f.confidence], risk: m.dash.actionRiskChip[f.actionRisk], evidence: f.evidence.map((e) => [signal('payment', e.signal), shown(e.signal, e.text)]) })),
    ...r.support.findings.map((f): Item => ({ category: 'support', classification: f.classification, title: m.sup.findingTitle[f.classification], explain: m.sup.rule[f.ruleId], rule: m.sup.ruleChip(f.ruleId),
      confidence: m.confidence[f.confidence], risk: m.dash.actionRiskChip[f.actionRisk], evidence: f.evidence.map((e) => [signal('support', e.signal), shown(e.signal, e.text)]) })),
  ];
}

const RANK: Record<string, number> = { manipulative_instruction: 2, suspicious_correlation: 1, observed_instruction: 0 };

function card(it: Item): HTMLElement {
  const m = t();
  return h('article', { class: 'card finding', 'data-category': it.category, 'data-classification': it.classification },
    h('div', { class: 'category' }, `${m.dash.categoryCode[it.category]} · ${m.dash.categoryName[it.category]}`),
    h('h4', {}, it.title),
    h('div', { class: 'chips' },
      h('span', { class: `chip ${it.classification}` }, m.classification[it.classification as keyof Messages['classification']]),
      h('span', { class: 'chip' }, it.confidence), h('span', { class: 'chip' }, it.risk), h('span', { class: 'chip' }, it.rule)),
    h('p', { class: 'explain' }, it.explain),
    h('ul', { class: 'ev', 'aria-label': m.evidenceAria }, ...it.evidence.map(([label, text]) => h('li', {}, `${label}: `, h('b', { lang: '' }, text)))));
}

function renderResult(r: ScanReport): Child[] {
  const m = t();
  const d = aggregate(r);
  const head = m.dash.headline[d.highest];
  const all = items(r).sort((a, b) => (RANK[b.classification] ?? 0) - (RANK[a.classification] ?? 0));
  const alerting = all.filter((x) => x.classification !== 'observed_instruction');
  const observed = all.filter((x) => x.classification === 'observed_instruction');
  const remote = r.support.findings.some((f) => f.classification !== 'observed_instruction' && (f.requestedActions.includes('remote-access') || f.requestedActions.includes('install')));
  const advice: Array<[string, string]> = d.affected.map((c) => [c, m.dash.advice[c]]);
  if (remote) advice.push(['remoteAccess', m.dash.advice.remoteAccess]);
  return [
    h('div', { class: `card threat tone-${head.tone}`, 'data-verdict': d.highest },
      h('div', { class: 'panel-label' }, m.pwa.assessment), h('h3', {}, head.title), h('p', {}, m.pwa.headlineDetail[d.highest]),
      h('div', { class: 'cats' }, `${m.dash.statActionable}: ${formatCount(d.actionable, state.lang)} · ${m.dash.statCategories}: ${d.affected.length > 0 ? d.affected.map((c) => m.dash.categoryCode[c]).join(' · ') : m.dash.noCategories}`)),
    h('div', { class: 'card advice', 'data-advice': advice.map(([k]) => k).join(' ') || 'none' }, h('div', { class: 'panel-label' }, m.dash.adviceTitle),
      advice.length > 0 ? h('ul', {}, ...advice.map(([k, x]) => h('li', { 'data-advice': k }, x))) : h('p', {}, m.dash.adviceNone)),
    h('div', { class: 'card' }, h('div', { class: 'panel-label' }, m.pwa.yourMessage), markedMessage(state.text.slice(0, MAX_MESSAGE_CHARS), all.flatMap((x) => x.evidence.map(([, e]) => e)))),
    ...alerting.map(card),
    observed.length > 0 && h('details', { class: 'observed' }, h('summary', {}, m.dash.observedTitle(observed.length)), ...observed.map(card)),
  ];
}

function render(): void {
  const m = t();
  document.documentElement.lang = state.lang;
  document.body.dataset.lang = state.lang;
  for (const l of ['en', 'id'] as const) $(`lang-${l}`).setAttribute('aria-pressed', String(state.lang === l));
  $('tagline').textContent = m.tagline;
  $('title').textContent = m.pwa.title;
  $('intro').textContent = m.pwa.intro;
  $('source-label').textContent = m.pwa.sourceLabel;
  const select = $<HTMLSelectElement>('source');
  const current = select.value || 'chat';
  select.replaceChildren(...SOURCES.map((s) => h('option', { value: s }, m.pwa.source[s])));
  select.value = current;
  $<HTMLTextAreaElement>('message').placeholder = m.pwa.placeholder;
  $('check').textContent = m.pwa.check;
  $('paste').textContent = m.pwa.paste;
  $('clear').textContent = m.pwa.clear;
  $('privacy').textContent = m.pwa.privacy;
  $('share-hint').textContent = m.pwa.shareHint;
  $('meta').textContent = `VeilTrace ${__VT_VERSION__}${state.report ? ` · Engine ${state.report.engineVersion}` : ''}`;
  $('status').textContent = state.note ?? '';
  const result = $('result');
  if (state.report) {
    result.replaceChildren(...renderResult(state.report).filter((p): p is Node => p instanceof Node));
    result.hidden = false;
  } else {
    result.replaceChildren();
    result.hidden = true;
  }
}

function check(): void {
  const text = $<HTMLTextAreaElement>('message').value;
  if (!text.trim()) {
    Object.assign(state, { report: null, note: t().pwa.empty });
    render();
    return;
  }
  state.text = text;
  state.report = checkMessage(text, $<HTMLSelectElement>('source').value as MessageSource);
  state.note = isLinkOnly(text) ? t().pwa.linkOnly : text.length > MAX_MESSAGE_CHARS ? t().pwa.tooLong : null;
  document.body.dataset.state = 'done';
  render();
  $('result').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/** Text shared to the app (Android share sheet) arrives through the service worker, which stores it once; read and delete. */
async function takeShared(): Promise<string | null> {
  if (!new URLSearchParams(location.search).has('shared') || !('caches' in window)) return null;
  history.replaceState(null, '', location.pathname);
  const cache = await caches.open(SHARED_CACHE);
  const res = await cache.match(SHARED_KEY);
  await cache.delete(SHARED_KEY);
  return res ? res.text() : null;
}

async function main(): Promise<void> {
  for (const l of ['en', 'id'] as const) $(`lang-${l}`).addEventListener('click', () => { state.lang = l; render(); });
  $('check').addEventListener('click', check);
  $('clear').addEventListener('click', () => {
    $<HTMLTextAreaElement>('message').value = '';
    Object.assign(state, { report: null, text: '', note: null });
    document.body.dataset.state = 'idle';
    render();
  });
  $('paste').addEventListener('click', async () => {
    try {
      $<HTMLTextAreaElement>('message').value = await navigator.clipboard.readText();
    } catch {
      $<HTMLTextAreaElement>('message').focus();
    }
  });
  render();
  const shared = await takeShared().catch(() => null);
  if (shared) {
    $<HTMLTextAreaElement>('message').value = shared;
    check();
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => { document.body.dataset.offline = 'ready'; }).catch(() => undefined);
  }
}

void main();
