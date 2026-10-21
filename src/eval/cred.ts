// `npm run eval:cred` — development evaluation of the EXPERIMENTAL credential detector (M5.1) on corpus/cred-dev.
// Separate from the frozen v1 harness (cli.ts). Development data only: these numbers are not held-out results.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { analyze, analyzeCredentials, CRED_DETECTOR_VERSION, ENGINE_VERSION, type CredentialResult, type PageSnapshot } from '../core/index.js';
import { EXTRACTOR_VERSION } from '../extract/extract.js';
import type { Scenario, ScenarioLabel } from './corpus.js';
import { extractInPage, locatorsWithin } from './inject.js';
import { computeMetrics, type ScoredScenario } from './metrics.js';
import { classMatrix, fmtRate } from './report.js';
import { routeScenario, VIEWPORT, type RequestLog } from './serve.js';

const SPLIT_DIR = join('corpus', 'cred-dev');
const OUT = join('eval', 'results');
/** Typed into every visible field before extraction; it must never appear in any output (privacy invariant). */
export const SENTINEL = 'VT-SENTINEL-7391-do-not-leak';

export function loadCredDev(): Scenario[] {
  return readdirSync(SPLIT_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort().map((name) => {
    const dir = join(SPLIT_DIR, name);
    return { dir, label: JSON.parse(readFileSync(join(dir, 'label.json'), 'utf8')) as ScenarioLabel };
  });
}

/** Locators of every evidence source of the strongest credential finding. */
function evidenceLocators(r: CredentialResult, s: PageSnapshot): string[] {
  const tier = ['observed_instruction', 'suspicious_correlation', 'manipulative_instruction'];
  const top = [...r.findings].sort((a, b) => tier.indexOf(b.classification) - tier.indexOf(a.classification))[0];
  if (!top) return [];
  return top.observationIds.map((id) => {
    const src = r.observations.find((o) => o.id === id)?.source;
    if (!src) return '';
    return (src.type === 'block' ? s.blocks.find((b) => b.id === src.blockId)?.locator : s.formFields?.find((f) => f.id === src.fieldId)?.locator) ?? '';
  });
}

export interface CredRun {
  id: string;
  snapshot: PageSnapshot;
  result: CredentialResult;
  clickfixVerdict: string;
  localized: boolean | null;
  requestsDuringScan: number;
  sentinelLeaked: boolean;
  fieldsFilled: number;
}

export async function runCredScenario(browser: Browser, sc: Scenario): Promise<CredRun> {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const log: RequestLog = { served: [], blocked: [] };
  await routeScenario(context, sc, log);
  try {
    const page = await context.newPage();
    await page.goto((sc.label.pages[0] as { url: string }).url, { waitUntil: 'load' });
    // Privacy invariant: type a sentinel into every visible, editable field (including shadow roots via Playwright's piercing locator).
    const fields = page.locator('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea');
    let filled = 0;
    for (let i = 0; i < (await fields.count()); i++) {
      const f = fields.nth(i);
      if ((await f.isVisible()) && (await f.isEditable())) {
        await f.fill(SENTINEL);
        filled++;
      }
    }
    const before = log.served.length + log.blocked.length;
    const { snapshot } = await extractInPage(page, {});
    const requestsDuringScan = log.served.length + log.blocked.length - before;
    const result = analyzeCredentials(snapshot);
    const positive = result.verdict === 'suspicious_correlation' || result.verdict === 'manipulative_instruction';
    let localized: boolean | null = null;
    if (sc.label.truth === 'malicious' && positive && sc.label.evidenceWithin) {
      const locs = evidenceLocators(result, snapshot);
      localized = locs.length > 0 && !locs.includes('') && (await locatorsWithin(page, locs, sc.label.evidenceWithin)).every(Boolean);
    }
    const sentinelLeaked = JSON.stringify(snapshot).includes(SENTINEL) || JSON.stringify(result).includes(SENTINEL);
    return { id: sc.label.id, snapshot, result, clickfixVerdict: analyze(snapshot).verdict, localized, requestsDuringScan, sentinelLeaked, fieldsFilled: filled };
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const scenarios = loadCredDev();
  const browser = await chromium.launch();
  const runs: CredRun[] = [];
  try {
    for (const sc of scenarios) runs.push(await runCredScenario(browser, sc));
  } finally {
    await browser.close();
  }
  const leaked = runs.filter((r) => r.sentinelLeaked).map((r) => r.id);
  if (leaked.length > 0) throw new Error(`PRIVACY INVARIANT VIOLATED: typed values appeared in output for ${leaked.join(', ')}`);

  const rows: ScoredScenario[] = runs.map((r, i) => {
    const l = (scenarios[i] as Scenario).label;
    return { id: l.id, truth: l.truth, expectedClass: l.expectedClass, hardNegative: l.hardNegative, lang: l.lang, category: l.category, predicted: r.result.verdict, localized: r.localized };
  });
  const m = computeMetrics(rows);
  const perScenario = runs.map((r, i) => {
    const l = (scenarios[i] as Scenario).label;
    return {
      id: r.id, lang: l.lang, category: l.category, truth: l.truth, expectedClass: l.expectedClass, hardNegative: l.hardNegative,
      predicted: r.result.verdict, findings: r.result.findings.map((f) => `${f.ruleId}:${f.classification}`), localized: r.localized,
      clickfixVerdict: r.clickfixVerdict, partial: r.snapshot.coverage.partial ?? [], requestsDuringScan: r.requestsDuringScan, fieldsFilled: r.fieldsFilled,
    };
  });
  mkdirSync(OUT, { recursive: true });
  const meta = {
    split: 'cred-dev', note: 'DEVELOPMENT data only, written by the same author as the rules. Not a held-out evaluation; not real-world effectiveness.',
    detectorVersion: CRED_DETECTOR_VERSION, clickfixEngineVersion: ENGINE_VERSION, extractorVersion: EXTRACTOR_VERSION,
  };
  writeFileSync(join(OUT, 'cred-dev.json'), JSON.stringify({ ...meta, metrics: m, privacy: { sentinelLeaks: 0, fieldsFilled: runs.reduce((n, r) => n + r.fieldsFilled, 0) }, scenarios: perScenario }, null, 2) + '\n');
  const short = (v: string): string => v.replace('_instruction', '').replace('_correlation', '');
  writeFileSync(join(OUT, 'cred-dev.md'), [
    '# Credential detector: development results (cred-dev)', '',
    `Detector ${CRED_DETECTOR_VERSION} (EXPERIMENTAL), extractor ${EXTRACTOR_VERSION}. ${meta.note}`, '',
    `TP ${m.confusion.tp} · FP ${m.confusion.fp} · TN ${m.confusion.tn} · FN ${m.confusion.fn}`, '',
    `- Precision: ${fmtRate(m.precision)}`, `- Recall: ${fmtRate(m.recall)}`, `- Hard-negative FPR: ${fmtRate(m.hardNegativeFpr)}`,
    `- Localization: ${fmtRate(m.localization)}`, `- Exact class agreement: ${fmtRate(m.exactClassAgreement)}`,
    `- Requests during scanning: ${runs.reduce((n, r) => n + r.requestsDuringScan, 0)}; privacy sentinel leaks: 0 (${runs.reduce((n, r) => n + r.fieldsFilled, 0)} fields filled)`, '',
    '## Class matrix', '', classMatrix(m), '',
    '## Per scenario', '', '| Scenario | Truth | Expected | Predicted | Findings | Loc. | ClickFix verdict |', '|---|---|---|---|---|---|---|',
    ...perScenario.map((p) => `| ${p.id} | ${p.truth} | ${short(p.expectedClass)} | ${short(p.predicted)} | ${p.findings.join(', ')} | ${p.localized === null ? '' : p.localized ? '✓' : '✗'} | ${short(p.clickfixVerdict)} |`),
    '',
  ].join('\n'));
  console.log(`cred-dev: ${runs.length} scenarios → ${OUT}/cred-dev.{json,md}; TP ${m.confusion.tp} FP ${m.confusion.fp} TN ${m.confusion.tn} FN ${m.confusion.fn}`);
}

if (process.argv[1]?.endsWith('eval-cred-cli.mjs')) await main();
