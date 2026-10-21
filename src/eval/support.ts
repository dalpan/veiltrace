// `npm run eval:support` — development evaluation of the EXPERIMENTAL fake-support detector (M5.3) on corpus/sup-dev.
// Separate from the frozen v1 harness (cli.ts). Development data only: these numbers are not held-out results.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { analyze, analyzeCredentials, analyzePayments, analyzeSupport, SUPPORT_DETECTOR_VERSION, type PageSnapshot, type SupportResult } from '../core/index.js';
import { EXTRACTOR_VERSION } from '../extract/extract.js';
import type { Scenario, ScenarioLabel } from './corpus.js';
import { extractInPage, locatorsWithin } from './inject.js';
import { computeMetrics, type ScoredScenario } from './metrics.js';
import { classMatrix, fmtRate } from './report.js';
import { routeScenario, VIEWPORT, type RequestLog } from './serve.js';

const SPLIT_DIR = join('corpus', 'sup-dev');
const OUT = join('eval', 'results');
/** A phone-number-like value typed into every visible field; it must never appear in any output (privacy invariant). */
export const SUP_SENTINEL = '0812-VT-SUP-SENTINEL-9999';

export function loadSupDev(): Scenario[] {
  return readdirSync(SPLIT_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort().map((name) => {
    const dir = join(SPLIT_DIR, name);
    return { dir, label: JSON.parse(readFileSync(join(dir, 'label.json'), 'utf8')) as ScenarioLabel };
  });
}

/** Locators of every evidence block of the strongest support finding. */
function evidenceLocators(r: SupportResult, s: PageSnapshot): string[] {
  const tier = ['observed_instruction', 'suspicious_correlation', 'manipulative_instruction'];
  const top = [...r.findings].sort((a, b) => tier.indexOf(b.classification) - tier.indexOf(a.classification))[0];
  if (!top) return [];
  return top.observationIds.map((id) => {
    const blockId = r.observations.find((o) => o.id === id)?.blockId;
    return s.blocks.find((b) => b.id === blockId)?.locator ?? '';
  });
}

export interface SupRun {
  id: string;
  snapshot: PageSnapshot;
  result: SupportResult;
  clickfixVerdict: string;
  credentialVerdict: string;
  paymentVerdict: string;
  /** A phone number or another digit run of 5+ appeared in the result (privacy invariant). */
  digitsLeaked: boolean;
  localized: boolean | null;
  requestsDuringScan: number;
  sentinelLeaked: boolean;
  fieldsFilled: number;
}

export async function runSupScenario(browser: Browser, sc: Scenario): Promise<SupRun> {
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
        await f.fill(SUP_SENTINEL);
        filled++;
      }
    }
    const before = log.served.length + log.blocked.length;
    const { snapshot } = await extractInPage(page, {});
    const requestsDuringScan = log.served.length + log.blocked.length - before;
    const result = analyzeSupport(snapshot);
    const positive = result.verdict === 'suspicious_correlation' || result.verdict === 'manipulative_instruction';
    let localized: boolean | null = null;
    if (sc.label.truth === 'malicious' && positive && sc.label.evidenceWithin) {
      const locs = evidenceLocators(result, snapshot);
      localized = locs.length > 0 && !locs.includes('') && (await locatorsWithin(page, locs, sc.label.evidenceWithin)).every(Boolean);
    }
    const sentinelLeaked = JSON.stringify(snapshot).includes(SUP_SENTINEL) || JSON.stringify(result).includes(SUP_SENTINEL);
    const digitsLeaked = result.observations.some((o) => /\d{5,}/u.test(o.text) || ((o.signal === 'SX.PHONE' || o.signal === 'SX.MOBILE') && o.text !== ''));
    return {
      id: sc.label.id, snapshot, result, clickfixVerdict: analyze(snapshot).verdict, credentialVerdict: analyzeCredentials(snapshot).verdict,
      paymentVerdict: analyzePayments(snapshot).verdict, digitsLeaked, localized, requestsDuringScan, sentinelLeaked, fieldsFilled: filled,
    };
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const scenarios = loadSupDev();
  const browser = await chromium.launch();
  const runs: SupRun[] = [];
  try {
    for (const sc of scenarios) runs.push(await runSupScenario(browser, sc));
  } finally {
    await browser.close();
  }
  const leaked = runs.filter((r) => r.sentinelLeaked || r.digitsLeaked).map((r) => r.id);
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
      clickfixVerdict: r.clickfixVerdict, credentialVerdict: r.credentialVerdict, paymentVerdict: r.paymentVerdict, partial: r.snapshot.coverage.partial ?? [],
      requestsDuringScan: r.requestsDuringScan, fieldsFilled: r.fieldsFilled,
    };
  });
  mkdirSync(OUT, { recursive: true });
  const meta = {
    split: 'sup-dev', note: 'DEVELOPMENT data only, written by the same author as the rules. Not a held-out evaluation; not real-world effectiveness.',
    detectorVersion: SUPPORT_DETECTOR_VERSION, extractorVersion: EXTRACTOR_VERSION,
  };
  const fieldsFilled = runs.reduce((n, r) => n + r.fieldsFilled, 0);
  writeFileSync(join(OUT, 'sup-dev.json'), JSON.stringify({ ...meta, metrics: m, privacy: { sentinelLeaks: 0, digitLeaks: 0, fieldsFilled }, scenarios: perScenario }, null, 2) + '\n');
  const short = (v: string): string => v.replace('_instruction', '').replace('_correlation', '');
  writeFileSync(join(OUT, 'sup-dev.md'), [
    '# Support-impersonation detector: development results (sup-dev)', '',
    `Detector ${SUPPORT_DETECTOR_VERSION} (EXPERIMENTAL), extractor ${EXTRACTOR_VERSION}. ${meta.note}`, '',
    `TP ${m.confusion.tp} · FP ${m.confusion.fp} · TN ${m.confusion.tn} · FN ${m.confusion.fn}`, '',
    `- Precision: ${fmtRate(m.precision)}`, `- Recall: ${fmtRate(m.recall)}`, `- Hard-negative FPR: ${fmtRate(m.hardNegativeFpr)}`,
    `- Localization: ${fmtRate(m.localization)}`, `- Exact class agreement: ${fmtRate(m.exactClassAgreement)}`,
    `- Requests during scanning: ${runs.reduce((n, r) => n + r.requestsDuringScan, 0)}; privacy sentinel leaks: 0 (${fieldsFilled} fields filled); phone numbers or digit runs in results: 0`, '',
    '## Class matrix', '', classMatrix(m), '',
    '## Per scenario', '', '| Scenario | Truth | Expected | Predicted | Findings | Loc. | ClickFix | Credential | Payment |', '|---|---|---|---|---|---|---|---|---|',
    ...perScenario.map((p) => `| ${p.id} | ${p.truth} | ${short(p.expectedClass)} | ${short(p.predicted)} | ${p.findings.join(', ')} | ${p.localized === null ? '' : p.localized ? '✓' : '✗'} | ${short(p.clickfixVerdict)} | ${short(p.credentialVerdict)} | ${short(p.paymentVerdict)} |`),
    '',
  ].join('\n'));
  console.log(`sup-dev: ${runs.length} scenarios → ${OUT}/sup-dev.{json,md}; TP ${m.confusion.tp} FP ${m.confusion.fp} TN ${m.confusion.tn} FN ${m.confusion.fn}`);
}

if (process.argv[1]?.endsWith('eval-support-cli.mjs')) await main();
