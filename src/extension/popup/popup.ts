// Popup controller and renderer. Page-derived strings are only ever inserted as text nodes.
import type { EvidenceItem, FindingSummary, ScanReport } from '../content/report.js';
import { classifyUrl, getTargetTab, runHighlight, runScan, type TargetTab } from './adapter.js';
import {
  ACTION_RISK, CLASSIFICATION, CONFIDENCE, CONFIDENCE_HELP, HEADLINE, HEADLINE_DETAIL, HIGHLIGHT_STATUS, LIMITATIONS, PARTIAL,
  RULE_EXPLANATION, SIGNAL, SOURCE,
} from './labels.js';
import { parseHighlightResult, parseScanReport } from './validate.js';

declare const __VT_TEST__: boolean;
const HIGHLIGHT_MS = __VT_TEST__ ? 1500 : 5000;

type Child = Node | string | null | undefined | false;

function h(tag: string, attrs: Record<string, string> = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

function setState(state: 'idle' | 'scanning' | 'done' | 'error', status: string): void {
  document.body.dataset.state = state;
  $('status').textContent = status;
}

function showError(title: string, detail: string): void {
  setState('error', '');
  const result = $('result');
  result.replaceChildren(h('div', { class: 'card error', role: 'alert' }, h('strong', {}, title), h('p', {}, detail)));
  result.hidden = false;
}

function evidenceItem(tab: TargetTab, e: EvidenceItem): HTMLElement {
  const status = h('p', { class: 'hl-status', 'aria-live': 'polite' });
  const btn = h('button', { class: 'secondary', type: 'button' }, 'Show on page') as HTMLButtonElement;
  if (!e.locator) {
    btn.disabled = true;
    status.textContent = HIGHLIGHT_STATUS['invalid-locator'] as string;
  }
  btn.addEventListener('click', async () => {
    if (!e.locator) return;
    btn.disabled = true;
    try {
      const res = parseHighlightResult(await runHighlight(tab.id, e.locator, HIGHLIGHT_MS));
      status.textContent = HIGHLIGHT_STATUS[res?.status ?? 'failed'] as string;
      status.dataset.result = res?.status ?? 'failed';
    } catch {
      status.textContent = HIGHLIGHT_STATUS.failed as string;
      status.dataset.result = 'failed';
    } finally {
      btn.disabled = false;
    }
  });
  const label = `${SIGNAL[e.signal]} · ${SOURCE[e.source]}${e.deobfuscated ? ' · disguised characters normalized' : ''}`;
  return h('li', {}, h('div', { class: 'ev-head' }, h('span', { class: 'ev-label' }, label), btn), h('p', { class: 'snippet' }, e.text), status);
}

function findingCard(tab: TargetTab, f: FindingSummary): HTMLElement {
  const demoted = f.classification !== f.ruleClassification;
  return h('article', { class: 'card finding', 'data-rule': f.ruleId, 'data-classification': f.classification },
    h('h4', {}, `${CLASSIFICATION[f.classification]} instruction`),
    h('div', { class: 'chips' },
      h('span', { class: `chip ${f.classification}` }, CLASSIFICATION[f.classification]),
      h('span', { class: 'chip', title: CONFIDENCE_HELP }, CONFIDENCE[f.confidence]),
      h('span', { class: 'chip', title: `Rule ${f.ruleName}` }, `Rule ${f.ruleId}`),
    ),
    h('p', { class: 'explain' }, RULE_EXPLANATION[f.ruleId]),
    h('p', { class: 'risk' }, ACTION_RISK[f.actionRisk]),
    f.modifiers.length > 0 && h('p', { class: 'context' },
      `${demoted ? `Lowered from ${CLASSIFICATION[f.ruleClassification].toLowerCase()} because of context: ` : 'Context: '}${f.modifiers.map((m) => m.reason).join(' ')}`),
    h('ul', { class: 'evidence', 'aria-label': 'Evidence' }, ...f.evidence.map((e) => evidenceItem(tab, e))),
  );
}

function render(tab: TargetTab, r: ScanReport): void {
  const head = HEADLINE[r.verdict];
  const alerting = r.findings.filter((f) => f.classification !== 'observed_instruction');
  const observed = r.findings.filter((f) => f.classification === 'observed_instruction');
  const partial = !r.status.complete;
  const qualifier = partial ? ' Part of the page could not be examined (see below).' : '';

  const result = $('result');
  const parts: Child[] = [
    h('div', { class: `card summary tone-${head.tone}`, 'data-verdict': r.verdict },
      h('h2', {}, head.title), h('p', {}, HEADLINE_DETAIL[r.verdict] + qualifier)),
    partial
      ? h('div', { class: 'card coverage partial', role: 'note', 'data-complete': 'false' },
        h('h3', {}, 'Partial scan: some content was not examined'),
        h('ul', {}, ...r.status.reasons.map((g) => h('li', { 'data-reason': g }, PARTIAL[g]))),
        h('p', {}, `Findings cover only the ${r.counts.blocks.toLocaleString('en')} text blocks that were analyzed.`))
      : h('div', { class: 'card coverage', 'data-complete': 'true' },
        h('h3', {}, 'Complete scan'),
        h('p', {}, `${r.counts.blocks.toLocaleString('en')} text blocks analyzed. Complete within what VeilTrace can see.`)),
    alerting.length > 0 && h('h3', { class: 'section' }, `Findings (${alerting.length})`),
    ...alerting.map((f) => findingCard(tab, f)),
    observed.length > 0 && h('details', { class: 'observed' },
      h('summary', {}, `Observed instructions without manipulation signs (${observed.length})`),
      ...observed.map((f) => findingCard(tab, f))),
  ];
  result.replaceChildren(...parts.filter((p): p is Node => p instanceof Node));
  result.hidden = false;
}

async function main(): Promise<void> {
  $('limits').textContent = LIMITATIONS;
  const scanBtn = $('scan') as HTMLButtonElement;
  const tab: TargetTab | null = await getTargetTab().catch(() => null);
  const kind = classifyUrl(tab?.url);
  $('target-host').textContent = tab?.url ? (kind === 'scannable' ? new URL(tab.url).host : tab.url.split(/[?#]/)[0] ?? '') : tab ? 'Protected page' : 'No page';

  if (!tab) {
    scanBtn.disabled = true;
    showError('No page to scan', 'Open a web page, then click the VeilTrace button again.');
    return;
  }
  // Chrome withholds the URL of pages an extension may not access (chrome://, other extensions, the Web Store).
  if (kind === 'restricted' || kind === 'unknown') {
    scanBtn.disabled = true;
    document.body.dataset.restricted = kind;
    showError('This page cannot be scanned',
      'Browser-protected pages (such as chrome:// pages, the Chrome Web Store and other extensions) do not allow extensions to read them.');
    return;
  }
  const target = tab;
  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    $('result').hidden = true;
    setState('scanning', 'Scanning this page on your device…');
    document.body.dataset.injections = String(Number(document.body.dataset.injections ?? '0') + 1);
    const t0 = performance.now();
    try {
      const call = await runScan(target.id);
      const report = parseScanReport(call.raw);
      if (!report) {
        showError('Scan failed', 'The scan returned unexpected data and was discarded.');
        return;
      }
      const tr = performance.now();
      render(target, report);
      const t1 = performance.now();
      setState('done', 'Scan finished.');
      $('meta').textContent = `Engine ${report.engineVersion} · extractor ${report.extractorVersion} · ${Math.round(t1 - t0)} ms · on this device only`;
      document.body.dataset.timing = JSON.stringify({
        injectMs: round(call.injectMs), callMs: round(call.callMs), extractMs: report.timing.extractMs, analyzeMs: report.timing.analyzeMs,
        transferMs: round(Math.max(0, call.callMs - report.timing.extractMs - report.timing.analyzeMs)), renderMs: round(t1 - tr), totalMs: round(t1 - t0),
      });
    } catch {
      showError('VeilTrace could not access this page',
        kind === 'file'
          ? 'To scan local files, turn on "Allow access to file URLs" for VeilTrace in chrome://extensions.'
          : 'The page may block extensions or may have changed. Reload the page and try again.');
    } finally {
      scanBtn.disabled = false;
      scanBtn.textContent = 'Scan again';
    }
  });
}

const round = (n: number): number => Math.round(n * 10) / 10;

void main();
