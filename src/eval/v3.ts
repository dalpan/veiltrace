// Held-out v3 (D-096): scenarios written by a separate author blind to the rules, after research into current public scam
// reports, with at least half message contexts; hash-locked before any detector ran on them (docs/EVAL_PREREGISTRATION_V3.md).
// Runs ONLY with --final, on owner request, and appends one line per run to eval/runs-v3.md. Node-only, never shipped.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { CRED_DETECTOR_VERSION, ENGINE_VERSION, PAY_DETECTOR_VERSION, SUPPORT_DETECTOR_VERSION, type Verdict } from '../core/index.js';
import { EXTRACTOR_VERSION } from '../extract/extract.js';
import { wilson } from './metrics.js';
import { manifestProblems, metrics, runOne, type Row, type V2Label } from './v2.js';

export const V3_DIR = join('corpus', 'test-v3');
const OUT = join('eval', 'results');
const alerts = (v: Verdict): boolean => v === 'suspicious_correlation' || v === 'manipulative_instruction';

type V3Row = Row & { context: 'message' | 'page' };

/**
 * Primary (preregistered for v3): a malicious scenario is a true positive when ANY detector alerts, as a user sees it; a
 * benign scenario is a false positive when any detector alerts. The v2 per-category definition is reported as secondary.
 */
export function anyAlertMetrics(rows: readonly Row[]) {
  const tp = rows.filter((r) => r.truth === 'malicious' && Object.values(r.verdicts).some(alerts)).length;
  const fn = rows.filter((r) => r.truth === 'malicious').length - tp;
  const fp = rows.filter((r) => r.truth === 'benign' && Object.values(r.verdicts).some(alerts)).length;
  const tn = rows.filter((r) => r.truth === 'benign').length - fp;
  const hn = rows.filter((r) => r.hardNegative);
  return { tp, fp, tn, fn, recall: wilson(tp, tp + fn), precision: wilson(tp, tp + fp), hardNegativeFpr: wilson(hn.filter((r) => Object.values(r.verdicts).some(alerts)).length, hn.length) };
}

async function main(): Promise<void> {
  if (!process.argv.includes('--final')) throw new Error('held-out v3 runs only with --final, on owner request (docs/EVAL_PREREGISTRATION_V3.md)');
  const problems = manifestProblems(V3_DIR);
  if (problems.length > 0) throw new Error(`test-v3 does not match its manifest:\n${problems.join('\n')}`);
  const dirs = readdirSync(V3_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const browser = await chromium.launch();
  const rows: V3Row[] = [];
  try {
    for (const d of dirs) {
      const label = JSON.parse(readFileSync(join(V3_DIR, d, 'label.json'), 'utf8')) as V2Label & { context: 'message' | 'page' };
      rows.push({ ...(await runOne(browser, join(V3_DIR, d), label)), context: label.context });
    }
  } finally {
    await browser.close();
  }
  const by = <K extends string>(key: (r: V3Row) => K, keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, anyAlertMetrics(rows.filter((r) => key(r) === k))]));
  const result = {
    overall: anyAlertMetrics(rows),
    perCategory: by((r) => r.category, ['cmd', 'cred', 'pay', 'sup'] as const),
    perLang: by((r) => r.lang as 'id' | 'en', ['id', 'en'] as const),
    perContext: by((r) => r.context, ['message', 'page'] as const),
    secondaryOwnDetector: metrics(rows),
  };
  const commit = (() => { try { return execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(); } catch { return 'unknown'; } })();
  const versions = { engine: ENGINE_VERSION, credential: CRED_DETECTOR_VERSION, payment: PAY_DETECTOR_VERSION, support: SUPPORT_DETECTOR_VERSION, extractor: EXTRACTOR_VERSION };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'test-v3.json'), JSON.stringify({ commit, versions, ...result, requests: rows.reduce((n, r) => n + r.requests, 0), rows }, null, 2) + '\n');
  const o = result.overall;
  if (!existsSync('eval/runs-v3.md')) writeFileSync('eval/runs-v3.md', '# Held-out v3 runs (append-only)\n\n| Time | Commit | Versions | Result (any detector) |\n|---|---|---|---|\n');
  appendFileSync('eval/runs-v3.md', `| ${new Date().toISOString()} | ${commit} | ${JSON.stringify(versions)} | TP ${o.tp} FP ${o.fp} TN ${o.tn} FN ${o.fn} |\n`);
  console.log(`test-v3: ${rows.length} scenarios; TP ${o.tp} FP ${o.fp} TN ${o.tn} FN ${o.fn} → ${OUT}/test-v3.json`);
}

if (process.argv[1]?.endsWith('eval-v3-cli.mjs')) await main();
