// Held-out v2 (D-085): 60 scenarios across the four categories, written by a separate author blind to the rules and
// hash-locked before any detector ran on them (docs/EVAL_PREREGISTRATION_V2.md). This harness runs ONLY with --final,
// on owner request, and appends one line per run to eval/runs-v2.md. Node-only, never shipped.
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium, type Browser } from 'playwright';
import {
  analyze, analyzeCredentials, analyzePayments, analyzeSupport, CRED_DETECTOR_VERSION, ENGINE_VERSION, PAY_DETECTOR_VERSION, SUPPORT_DETECTOR_VERSION,
  type PageSnapshot, type Verdict,
} from '../core/index.js';
import { EXTRACTOR_VERSION } from '../extract/extract.js';
import { extractInPage, locatorsWithin } from './inject.js';
import { wilson, type Rate } from './metrics.js';
import { routeScenario, VIEWPORT, type RequestLog } from './serve.js';
import type { Scenario, ScenarioLabel } from './corpus.js';

export const V2_DIR = join('corpus', 'test-v2');
const OUT = join('eval', 'results');

export type ThreatCategory = 'cmd' | 'cred' | 'pay' | 'sup';
export interface V2Label extends Omit<ScenarioLabel, 'split' | 'threatClass'> { split: 'test-v2'; threatCategory: ThreatCategory }

/** Every file's SHA-256 must match MANIFEST.json (README.md and the manifest itself excluded). */
export function manifestProblems(dir = V2_DIR): string[] {
  const manifest = JSON.parse(readFileSync(join(dir, 'MANIFEST.json'), 'utf8')) as { files: Record<string, string> };
  const out: string[] = [];
  const seen = new Set<string>();
  for (const d of readdirSync(dir, { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name)) {
    for (const f of readdirSync(join(dir, d))) {
      const key = `${d}/${f}`;
      seen.add(key);
      const hash = createHash('sha256').update(readFileSync(join(dir, d, f))).digest('hex');
      if (manifest.files[key] === undefined) out.push(`added: ${key}`);
      else if (manifest.files[key] !== hash) out.push(`changed: ${key}`);
    }
  }
  for (const key of Object.keys(manifest.files)) if (!seen.has(key)) out.push(`removed: ${key}`);
  return out;
}

const TIER: Record<Verdict, number> = { none: 0, observed_instruction: 1, suspicious_correlation: 2, manipulative_instruction: 3 };
const alerts = (v: Verdict): boolean => TIER[v] >= 2;

function detectAll(s: PageSnapshot, cmdRuleset: 'm5' | 'm4.1'): Record<ThreatCategory, Verdict> {
  return { cmd: analyze(s, { ruleset: cmdRuleset }).verdict, cred: analyzeCredentials(s).verdict, pay: analyzePayments(s).verdict, sup: analyzeSupport(s).verdict };
}

interface Row { id: string; category: ThreatCategory; truth: 'malicious' | 'benign'; lang: string; hardNegative: boolean; verdicts: Record<ThreatCategory, Verdict>; baselineCmd: Verdict; localized: boolean | null; requests: number }

async function runOne(browser: Browser, dir: string, label: V2Label): Promise<Row> {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const log: RequestLog = { served: [], blocked: [] };
  await routeScenario(context, { dir, label } as unknown as Scenario, log);
  try {
    const page = await context.newPage();
    await page.goto((label.pages[0] as { url: string }).url, { waitUntil: 'load' });
    for (const step of label.steps) await page.click(step.click);
    if (label.steps.length > 0) await page.waitForTimeout(300);
    const before = log.served.length + log.blocked.length;
    const { snapshot } = await extractInPage(page, {});
    const requests = log.served.length + log.blocked.length - before;
    const verdicts = detectAll(snapshot, 'm5');
    const baselineCmd = analyze(snapshot, { ruleset: 'm4.1' }).verdict;
    let localized: boolean | null = null;
    if (label.truth === 'malicious' && alerts(verdicts[label.threatCategory]) && label.evidenceWithin) {
      const locs = evidenceLocators(snapshot, label.threatCategory);
      localized = locs.length > 0 && (await locatorsWithin(page, locs, label.evidenceWithin)).every(Boolean);
    }
    return { id: label.id, category: label.threatCategory, truth: label.truth as Row['truth'], lang: label.lang, hardNegative: label.hardNegative, verdicts, baselineCmd, localized, requests };
  } finally {
    await context.close();
  }
}

/** Block locators of the strongest finding of the category's own detector. */
function evidenceLocators(s: PageSnapshot, cat: ThreatCategory): string[] {
  const byId = new Map(s.blocks.map((b) => [b.id, b.locator]));
  const top = <F extends { classification: string; observationIds: string[] }>(fs: F[]): F | undefined => [...fs].sort((a, b) => TIER[b.classification as Verdict] - TIER[a.classification as Verdict])[0];
  if (cat === 'cmd') {
    const r = analyze(s);
    const f = top(r.findings);
    return f ? f.observationIds.flatMap((id) => { const o = r.observations.find((x) => x.id === id); return o?.source.type === 'block' ? [byId.get(o.source.blockId) ?? ''] : []; }) : [];
  }
  if (cat === 'cred') {
    const r = analyzeCredentials(s);
    const f = top(r.findings);
    return f ? f.observationIds.flatMap((id) => { const o = r.observations.find((x) => x.id === id); return o?.source.type === 'block' ? [byId.get(o.source.blockId) ?? ''] : []; }) : [];
  }
  const r = cat === 'pay' ? analyzePayments(s) : analyzeSupport(s);
  const f = top(r.findings as Array<{ classification: string; observationIds: string[] }>);
  return f ? f.observationIds.map((id) => byId.get((r.observations as Array<{ id: string; blockId: string }>).find((x) => x.id === id)?.blockId ?? '') ?? '') : [];
}

interface Metrics { tp: number; fp: number; tn: number; fn: number; recall: Rate; precision: Rate; hardNegativeFpr: Rate; localization: Rate }

/**
 * Primary (preregistered): a malicious scenario is a true positive when the detector of its own category alerts
 * (suspicious or manipulative). A benign scenario is a false positive when ANY detector alerts.
 */
export function metrics(rows: readonly Row[]): Metrics {
  const tp = rows.filter((r) => r.truth === 'malicious' && alerts(r.verdicts[r.category])).length;
  const fn = rows.filter((r) => r.truth === 'malicious').length - tp;
  const fp = rows.filter((r) => r.truth === 'benign' && Object.values(r.verdicts).some(alerts)).length;
  const tn = rows.filter((r) => r.truth === 'benign').length - fp;
  const hn = rows.filter((r) => r.hardNegative);
  const loc = rows.filter((r) => r.localized !== null);
  return {
    tp, fp, tn, fn, recall: wilson(tp, tp + fn), precision: wilson(tp, tp + fp),
    hardNegativeFpr: wilson(hn.filter((r) => Object.values(r.verdicts).some(alerts)).length, hn.length),
    localization: wilson(loc.filter((r) => r.localized).length, loc.length),
  };
}

async function main(): Promise<void> {
  if (!process.argv.includes('--final')) throw new Error('held-out v2 runs only with --final, on owner request (docs/EVAL_PREREGISTRATION_V2.md)');
  const problems = manifestProblems();
  if (problems.length > 0) throw new Error(`test-v2 does not match its manifest:\n${problems.join('\n')}`);
  const dirs = readdirSync(V2_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const browser = await chromium.launch();
  const rows: Row[] = [];
  try {
    for (const d of dirs) rows.push(await runOne(browser, join(V2_DIR, d), JSON.parse(readFileSync(join(V2_DIR, d, 'label.json'), 'utf8')) as V2Label));
  } finally {
    await browser.close();
  }
  const overall = metrics(rows);
  const perCategory = Object.fromEntries((['cmd', 'cred', 'pay', 'sup'] as const).map((c) => [c, metrics(rows.filter((r) => r.category === c))]));
  const perLang = Object.fromEntries(['id', 'en'].map((l) => [l, metrics(rows.filter((r) => r.lang === l))]));
  const cmdBaseline = metrics(rows.filter((r) => r.category === 'cmd').map((r) => ({ ...r, verdicts: { ...r.verdicts, cmd: r.baselineCmd } })));
  const commit = (() => { try { return execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(); } catch { return 'unknown'; } })();
  const versions = { engine: ENGINE_VERSION, credential: CRED_DETECTOR_VERSION, payment: PAY_DETECTOR_VERSION, support: SUPPORT_DETECTOR_VERSION, extractor: EXTRACTOR_VERSION };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'test-v2.json'), JSON.stringify({ commit, versions, overall, perCategory, perLang, cmdBaselineEngine020: cmdBaseline, requests: rows.reduce((n, r) => n + r.requests, 0), rows }, null, 2) + '\n');
  const line = `| ${new Date().toISOString()} | ${commit} | ${JSON.stringify(versions)} | TP ${overall.tp} FP ${overall.fp} TN ${overall.tn} FN ${overall.fn} |\n`;
  if (!existsSync('eval/runs-v2.md')) writeFileSync('eval/runs-v2.md', '# Held-out v2 runs (append-only)\n\n| Time | Commit | Versions | Result |\n|---|---|---|---|\n');
  appendFileSync('eval/runs-v2.md', line);
  console.log(`test-v2: ${rows.length} scenarios; TP ${overall.tp} FP ${overall.fp} TN ${overall.tn} FN ${overall.fn} → ${OUT}/test-v2.json`);
}

if (process.argv[1]?.endsWith('eval-v2-cli.mjs')) await main();
