// Data for measuring the optional on-device AI opinion (D-093). Chrome's built-in model only runs in the owner's Chrome, so
// this Node-only step extracts each DEVELOPMENT scenario in Playwright exactly as the extension does, builds the same masked
// AI payload, and records the label and the VeilTrace result. The AI eval page (scripts/build-ai-eval.mjs) then runs the model
// on these payloads in Chrome. Held-out sets (corpus/test, corpus/test-v2, the realworld test half) are never included.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { analyze, analyzeCredentials, analyzePayments, analyzeSupport, type Verdict } from '../core/index.js';
import { buildAiPayload } from '../extension/ai/payload.js';
import type { Scenario, ScenarioLabel } from './corpus.js';
import { extractInPage } from './inject.js';
import { detect, loadRecords, resolved, restorePlaceholders } from './realworld.js';
import { routeScenario, VIEWPORT, type RequestLog } from './serve.js';

export const AI_DATA_FILE = join('dist', 'ai-eval-data.json');
const SPLITS = ['dev', 'cred-dev', 'pay-dev', 'sup-dev'] as const;

export interface AiEvalItem {
  id: string;
  split: string;
  /** null for field records that have no resolved label yet. */
  truth: 'malicious' | 'benign' | null;
  lang: string;
  lines: string[];
  truncated: boolean;
  /** Whether any VeilTrace detector alerted (suspicious or manipulative). */
  veiltraceAlert: boolean;
}

const alerts = (v: Verdict): boolean => v === 'suspicious_correlation' || v === 'manipulative_instruction';

async function scenarioItem(browser: Browser, split: string, dir: string, label: ScenarioLabel): Promise<AiEvalItem> {
  const context = await browser.newContext({ viewport: VIEWPORT });
  await routeScenario(context, { dir, label } as unknown as Scenario, { served: [], blocked: [] } as RequestLog);
  try {
    const page = await context.newPage();
    await page.goto((label.pages[0] as { url: string }).url, { waitUntil: 'load' });
    for (const step of label.steps) await page.click(step.click);
    if (label.steps.length > 0) await page.waitForTimeout(300);
    const { snapshot } = await extractInPage(page, {});
    const verdicts = [analyze(snapshot).verdict, analyzeCredentials(snapshot).verdict, analyzePayments(snapshot).verdict, analyzeSupport(snapshot).verdict];
    const payload = buildAiPayload(snapshot.blocks.map((b) => b.text));
    return { id: label.id, split, truth: label.truth as AiEvalItem['truth'], lang: label.lang, ...payload, veiltraceAlert: verdicts.some(alerts) };
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const items: AiEvalItem[] = [];
  const browser = await chromium.launch();
  try {
    for (const split of SPLITS) {
      const root = join('corpus', split);
      for (const d of readdirSync(root, { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name).sort()) {
        const label = JSON.parse(readFileSync(join(root, d, 'label.json'), 'utf8')) as ScenarioLabel;
        items.push(await scenarioItem(browser, split, join(root, d), label));
      }
    }
  } finally {
    await browser.close();
  }
  // Field records: the dev half only, as one line per message line (placeholders become fictional values, then masked again).
  for (const r of loadRecords().filter((x) => x.split === 'dev')) {
    const lines = restorePlaceholders(r.text).split('\n');
    items.push({ id: r.id, split: 'realworld-dev', truth: resolved(r)?.truth ?? null, lang: r.lang, ...buildAiPayload(lines), veiltraceAlert: alerts(detect(r).verdict) });
  }
  mkdirSync('dist', { recursive: true });
  writeFileSync(AI_DATA_FILE, JSON.stringify(items) + '\n');
  console.log(`AI eval data: ${items.length} items → ${AI_DATA_FILE}`);
}

if (process.argv[1]?.endsWith('ai-data-cli.mjs')) await main();
