// `npm run eval:pay` — development evaluation of the EXPERIMENTAL payment detector (M5.2) on corpus/pay-dev.
// Separate from the frozen v1 harness (cli.ts). Development data only: these numbers are not held-out results.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { analyze, analyzeCredentials, analyzePayments, PAY_DETECTOR_VERSION, type PageSnapshot, type PaymentResult } from '../core/index.js';
import { EXTRACTOR_VERSION } from '../extract/extract.js';
import type { Scenario, ScenarioLabel } from './corpus.js';
import { extractInPage, locatorsWithin } from './inject.js';
import { computeMetrics, type ScoredScenario } from './metrics.js';
import { classMatrix, fmtRate } from './report.js';
import { routeScenario, VIEWPORT, type RequestLog } from './serve.js';

const SPLIT_DIR = join('corpus', 'pay-dev');
const OUT = join('eval', 'results');
/** A card-number-like value typed into every visible field; it must never appear in any output (privacy invariant). */
export const PAY_SENTINEL = '4111-VT-PAY-SENTINEL-1111';

export function loadPayDev(): Scenario[] {
  return readdirSync(SPLIT_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort().map((name) => {
    const dir = join(SPLIT_DIR, name);
    return { dir, label: JSON.parse(readFileSync(join(dir, 'label.json'), 'utf8')) as ScenarioLabel };
  });
}

/** Locators of every evidence block of the strongest payment finding. */
function evidenceLocators(r: PaymentResult, s: PageSnapshot): string[] {
  const tier = ['observed_instruction', 'suspicious_correlation', 'manipulative_instruction'];
  const top = [...r.findings].sort((a, b) => tier.indexOf(b.classification) - tier.indexOf(a.classification))[0];
  if (!top) return [];
  return top.observationIds.map((id) => {
    const blockId = r.observations.find((o) => o.id === id)?.blockId;
    return s.blocks.find((b) => b.id === blockId)?.locator ?? '';
  });
}

export interface PayRun {
  id: string;
  snapshot: PageSnapshot;
  result: PaymentResult;
  clickfixVerdict: string;
  credentialVerdict: string;
  localized: boolean | null;
  requestsDuringScan: number;
  sentinelLeaked: boolean;
  fieldsFilled: number;
}

export async function runPayScenario(browser: Browser, sc: Scenario): Promise<PayRun> {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const log: RequestLog = { served: [], blocked: [] };
  await routeScenario(context, sc, log);
  try {
    const page = await context.newPage();
    await page.goto((sc.label.pages[0] as { url: string }).url, { waitUntil: 'load' });
    const fields = page.locator('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea');
    let filled = 0;
    for (let i = 0; i < (await fields.count()); i++) {
      const f = fields.nth(i);
      if ((await f.isVisible()) && (await f.isEditable())) {
        await f.fill(PAY_SENTINEL);
        filled++;
      }
    }
    const before = log.served.length + log.blocked.length;
    const { snapshot } = await extractInPage(page, {});
    const requestsDuringScan = log.served.length + log.blocked.length - before;
    const result = analyzePayments(snapshot);
    const positive = result.verdict === 'suspicious_correlation' || result.verdict === 'manipulative_instruction';
    let localized: boolean | null = null;
    if (sc.label.truth === 'malicious' && positive && sc.label.evidenceWithin) {
      const locs = evidenceLocators(result, snapshot);
      localized = locs.length > 0 && !locs.includes('') && (await locatorsWithin(page, locs, sc.label.evidenceWithin)).every(Boolean);
    }
    const sentinelLeaked = JSON.stringify(snapshot).includes(PAY_SENTINEL) || JSON.stringify(result).includes(PAY_SENTINEL);
    return {
      id: sc.label.id, snapshot, result, clickfixVerdict: analyze(snapshot).verdict, credentialVerdict: analyzeCredentials(snapshot).verdict,
      localized, requestsDuringScan, sentinelLeaked, fieldsFilled: filled,
    };
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const scenarios = loadPayDev();
  const browser = await chromium.launch();
  const runs: PayRun[] = [];
  try {
    for (const sc of scenarios) runs.push(await runPayScenario(browser, sc));
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
      clickfixVerdict: r.clickfixVerdict, credentialVerdict: r.credentialVerdict, partial: r.snapshot.coverage.partial ?? [],
      requestsDuringScan: r.requestsDuringScan, fieldsFilled: r.fieldsFilled,
    };
  });
  mkdirSync(OUT, { recursive: true });
  const meta = {
    split: 'pay-dev', note: 'DEVELOPMENT data only, written by the same author as the rules. Not a held-out evaluation; not real-world effectiveness.',
    detectorVersion: PAY_DETECTOR_VERSION, extractorVersion: EXTRACTOR_VERSION,
  };
  const fieldsFilled = runs.reduce((n, r) => n + r.fieldsFilled, 0);
  writeFileSync(join(OUT, 'pay-dev.json'), JSON.stringify({ ...meta, metrics: m, privacy: { sentinelLeaks: 0, fieldsFilled }, scenarios: perScenario }, null, 2) + '\n');
  const short = (v: string): string => v.replace('_instruction', '').replace('_correlation', '');
  writeFileSync(join(OUT, 'pay-dev.md'), [
    '# Payment detector: development results (pay-dev)', '',
    `Detector ${PAY_DETECTOR_VERSION} (EXPERIMENTAL), extractor ${EXTRACTOR_VERSION}. ${meta.note}`, '',
    `TP ${m.confusion.tp} · FP ${m.confusion.fp} · TN ${m.confusion.tn} · FN ${m.confusion.fn}`, '',
    `- Precision: ${fmtRate(m.precision)}`, `- Recall: ${fmtRate(m.recall)}`, `- Hard-negative FPR: ${fmtRate(m.hardNegativeFpr)}`,
    `- Localization: ${fmtRate(m.localization)}`, `- Exact class agreement: ${fmtRate(m.exactClassAgreement)}`,
    `- Requests during scanning: ${runs.reduce((n, r) => n + r.requestsDuringScan, 0)}; privacy sentinel leaks: 0 (${fieldsFilled} fields filled)`, '',
    '## Class matrix', '', classMatrix(m), '',
    '## Per scenario', '', '| Scenario | Truth | Expected | Predicted | Findings | Loc. | ClickFix | Credential |', '|---|---|---|---|---|---|---|---|',
    ...perScenario.map((p) => `| ${p.id} | ${p.truth} | ${short(p.expectedClass)} | ${short(p.predicted)} | ${p.findings.join(', ')} | ${p.localized === null ? '' : p.localized ? '✓' : '✗'} | ${short(p.clickfixVerdict)} | ${short(p.credentialVerdict)} |`),
    '',
  ].join('\n'));
  console.log(`pay-dev: ${runs.length} scenarios → ${OUT}/pay-dev.{json,md}; TP ${m.confusion.tp} FP ${m.confusion.fp} TN ${m.confusion.tn} FN ${m.confusion.fn}`);
}

if (process.argv[1]?.endsWith('eval-pay-cli.mjs')) await main();
