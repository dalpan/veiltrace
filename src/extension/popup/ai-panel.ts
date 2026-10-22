// Popup panel for the optional on-device AI second opinion (D-093). Two clicks: the first shows the exact masked text the
// model will read, the second runs the browser's built-in model on this device. The deterministic VeilTrace result is never
// changed; the opinion is shown separately as fixed labels, and cited lines come from the payload, never from model text.
import { aiAvailability, askAi, type AiAvailability } from '../ai/ondevice.js';
import type { AiOpinion } from '../ai/opinion.js';
import { parseAiPayload, type AiPayload } from '../ai/payload.js';
import type { Messages } from './i18n.js';

type Stage = 'idle' | 'preview' | 'running' | 'done' | 'failed' | 'no-text';

interface Panel {
  stage: Stage;
  availability: AiAvailability | null;
  payload: AiPayload | null;
  opinion: AiOpinion | null;
  progress: number | null;
}

const panel: Panel = { stage: 'idle', availability: null, payload: null, opinion: null, progress: null };

interface Deps {
  t: () => Messages;
  tabId: () => number | null;
  readText: (tabId: number) => Promise<unknown>;
}
let deps: Deps | null = null;

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
function h(tag: string, cls: string, text?: string): HTMLElement {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** Forget the previous page's text and opinion (called on every new scan). */
export function resetAi(): void {
  Object.assign(panel, { stage: 'idle', payload: null, opinion: null, progress: null });
}

async function prepare(): Promise<void> {
  const id = deps?.tabId();
  if (!deps || id === null || id === undefined) return;
  const payload = parseAiPayload(await deps.readText(id).catch(() => null));
  Object.assign(panel, payload && payload.lines.length > 0 ? { stage: 'preview', payload } : { stage: 'no-text', payload: null });
  renderAi(true);
}

async function run(): Promise<void> {
  if (!panel.payload) return;
  Object.assign(panel, { stage: 'running', progress: null });
  renderAi(true);
  try {
    const opinion = await askAi(panel.payload.lines, (f) => { panel.progress = Math.round(f * 100); renderAi(true); });
    Object.assign(panel, opinion ? { stage: 'done', opinion } : { stage: 'failed' });
  } catch {
    panel.stage = 'failed';
  }
  renderAi(true);
}

export function setupAi(d: Deps): void {
  deps = d;
  $('ai-prepare').addEventListener('click', () => void prepare());
  $('ai-run').addEventListener('click', () => void run());
  void aiAvailability().then((a) => { panel.availability = a; renderAi(!$('ai').hidden); });
}

function opinionView(m: Messages, o: AiOpinion, payload: AiPayload): HTMLElement {
  const box = h('div', 'ai-opinion');
  box.dataset.assessment = o.assessment;
  box.append(h('p', 'ai-result-title', m.ai.resultTitle), h('p', 'ai-assessment', m.ai.assessment[o.assessment]), h('p', 'ai-confidence', m.ai.confidence[o.confidence]));
  if (o.tactics.length > 0) {
    const list = h('ul', 'ai-tactics');
    for (const tac of o.tactics) list.append(h('li', '', m.ai.tactic[tac]));
    box.append(h('p', 'ai-label', m.ai.tacticsLabel), list);
  }
  if (o.lines.length > 0) {
    const quotes = h('ol', 'ai-lines');
    for (const n of o.lines) {
      const li = h('li', 'snippet', payload.lines[n - 1] ?? '') as HTMLLIElement;
      li.value = n;
      quotes.append(li);
    }
    box.append(h('p', 'ai-label', m.ai.citedLines), quotes);
  }
  box.append(h('p', 'ai-caveat', m.ai.caveat));
  return box;
}

export function renderAi(visible: boolean): void {
  const m = deps?.t();
  const section = $('ai');
  section.hidden = !visible || !m;
  if (!m || section.hidden) return;
  const a = panel.availability;
  const usable = a === 'available' || a === 'downloadable' || a === 'downloading';
  $('ai-title').textContent = m.ai.title;
  $('ai-intro').textContent = a === 'unsupported' ? m.ai.unsupported : a === 'unavailable' ? m.ai.unavailable : m.ai.intro;
  const prep = $('ai-prepare') as HTMLButtonElement;
  prep.textContent = m.ai.prepare;
  prep.hidden = !usable || panel.stage !== 'idle';
  const preview = $('ai-preview') as HTMLDetailsElement;
  preview.hidden = !panel.payload;
  if (panel.payload) {
    $('ai-preview-summary').textContent = m.ai.previewSummary(panel.payload.lines.length, panel.payload.truncated);
    $('ai-lines').replaceChildren(...panel.payload.lines.map((l) => h('li', '', l)));
  }
  const runBtn = $('ai-run') as HTMLButtonElement;
  runBtn.textContent = m.ai.run;
  runBtn.hidden = !usable || !panel.payload || panel.stage === 'done';
  runBtn.disabled = panel.stage === 'running';
  $('ai-status').textContent = panel.stage === 'running' ? (panel.progress !== null && panel.progress < 100 ? m.ai.downloading(panel.progress) : m.ai.running)
    : panel.stage === 'failed' ? m.ai.failed : panel.stage === 'no-text' ? m.ai.noText : '';
  const result = $('ai-result');
  result.hidden = !(panel.stage === 'done' && panel.opinion && panel.payload);
  result.replaceChildren(...(panel.stage === 'done' && panel.opinion && panel.payload ? [opinionView(m, panel.opinion, panel.payload)] : []));
}
