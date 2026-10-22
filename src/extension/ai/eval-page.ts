// AI eval page (D-093), only in the separate `npm run build:ai-eval` build, never in the shipped extension. Runs Chrome's
// built-in model on the masked payloads of the development scenarios (embedded at build time: no fetch, no network) and
// compares its opinion with the labels and with VeilTrace. Results stay on the page and can be saved as a JSON file.
import { aiAvailability, askAi } from './ondevice.js';
import type { AiOpinion } from './opinion.js';

interface Item {
  id: string;
  split: string;
  truth: 'malicious' | 'benign' | null;
  lang: string;
  lines: string[];
  truncated: boolean;
  veiltraceAlert: boolean;
}
interface Row extends Item {
  ai: AiOpinion | null;
  ms: number;
}

declare const __AI_EVAL_DATA__: Item[];
const DATA: Item[] = __AI_EVAL_DATA__;
const rows: Row[] = [];
let stop = false;

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const cell = (text: string): HTMLTableCellElement => { const td = document.createElement('td'); td.textContent = text; return td; };

interface Counts { tp: number; fp: number; tn: number; fn: number; unanswered: number }
function counts(list: readonly Row[], alertOf: (r: Row) => boolean | null): Counts {
  const c: Counts = { tp: 0, fp: 0, tn: 0, fn: 0, unanswered: 0 };
  for (const r of list) {
    if (r.truth === null) continue;
    const a = alertOf(r);
    if (a === null) { c.unanswered++; continue; }
    if (r.truth === 'malicious') c[a ? 'tp' : 'fn']++;
    else c[a ? 'fp' : 'tn']++;
  }
  return c;
}
const pct = (n: number, d: number): string => (d === 0 ? '–' : `${Math.round((100 * n) / d)}%`);
const line = (name: string, c: Counts): string =>
  `${name}: TP ${c.tp} · FP ${c.fp} · TN ${c.tn} · FN ${c.fn}${c.unanswered ? ` · no answer ${c.unanswered}` : ''} · recall ${pct(c.tp, c.tp + c.fn)} · FPR ${pct(c.fp, c.fp + c.tn)}`;

function summary(): void {
  const groups = ['all', ...new Set(rows.map((r) => r.split))];
  const out: string[] = [];
  for (const g of groups) {
    const list = g === 'all' ? rows : rows.filter((r) => r.split === g);
    out.push(`[${g}] ${line('AI', counts(list, (r) => (r.ai ? r.ai.assessment !== 'no-clear-signs' : null)))}`);
    out.push(`[${g}] ${line('VeilTrace', counts(list, (r) => r.veiltraceAlert))}`);
    out.push(`[${g}] ${line('AI or VeilTrace', counts(list, (r) => (r.ai ? r.ai.assessment !== 'no-clear-signs' || r.veiltraceAlert : r.veiltraceAlert)))}`);
  }
  $('summary').textContent = out.join('\n');
  const json = JSON.stringify({ model: 'chrome-built-in', at: new Date().toISOString(), rows: rows.map((r) => ({ ...r, lines: undefined })) }, null, 1);
  const a = $('save') as HTMLAnchorElement;
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.hidden = false;
}

function addRow(r: Row): void {
  const tr = document.createElement('tr');
  const aiAlert = r.ai ? r.ai.assessment !== 'no-clear-signs' : null;
  tr.dataset.wrong = String(r.truth !== null && aiAlert !== null && aiAlert !== (r.truth === 'malicious'));
  tr.append(cell(r.id), cell(r.split), cell(r.truth ?? '?'), cell(r.veiltraceAlert ? 'alert' : '–'), cell(r.ai ? r.ai.assessment : 'no answer'),
    cell(r.ai ? r.ai.tactics.join(', ') : ''), cell(r.ai ? r.ai.confidence : ''), cell(`${Math.round(r.ms)} ms`));
  $('rows').append(tr);
}

async function run(): Promise<void> {
  stop = false;
  rows.length = 0;
  $('rows').replaceChildren();
  ($('run') as HTMLButtonElement).disabled = true;
  for (const [i, item] of DATA.entries()) {
    if (stop) break;
    $('progress').textContent = `${i + 1} / ${DATA.length}: ${item.id}`;
    const t0 = performance.now();
    const ai: AiOpinion | null = await askAi(item.lines, (f) => { $('progress').textContent = `Downloading the model… ${Math.round(f * 100)}%`; })
      .catch(() => null);
    const row: Row = { ...item, ai, ms: performance.now() - t0 };
    rows.push(row);
    addRow(row);
    summary();
  }
  $('progress').textContent = stop ? `Stopped after ${rows.length}.` : `Done: ${rows.length} items.`;
  ($('run') as HTMLButtonElement).disabled = false;
}

async function main(): Promise<void> {
  $('count').textContent = `${DATA.length} development items (${[...new Set(DATA.map((d) => d.split))].join(', ')}).`;
  $('availability').textContent = `Model availability: ${await aiAvailability()}`;
  $('run').addEventListener('click', () => void run());
  $('stop').addEventListener('click', () => { stop = true; });
}

void main();
