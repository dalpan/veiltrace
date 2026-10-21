// `npm run eval -- <command> [--split dev|test] [--final]`. See EVALUATION_PLAN.md.
//   validate  --split S              structural checks only (no detection)
//   manifest  --split S [--refreeze] write hash manifest (test split refuses to refreeze by default)
//   run       --split dev            all systems on the dev split → eval/results/dev.{json,md,perf.json}
//   run       --split test --final   final held-out run (owner-requested only), logged in eval/runs.md
//   research  --split dev            R-1…R-3 variants and container ablation (dev only)
//   perf                             latency / size on large synthetic pages
import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { chromium, type Browser } from 'playwright';
import { computeManifest, loadSplit, validateLabel, verifyManifest, type Split } from './corpus.js';
import { extractInPage } from './inject.js';
import { computeMetrics, percentile, type SystemMetrics } from './metrics.js';
import { perfPages } from './perfpages.js';
import { classMatrix, composition, systemsTable } from './report.js';
import { runScenario, scored, type ScenarioRun } from './runner.js';
import { routeScenario, VIEWPORT, type RequestLog } from './serve.js';
import { m41Variants, researchVariants, SYSTEMS, type SystemDef } from './systems.js';
import { analyze } from '../core/analyze.js';
import { ENGINE_VERSION, ENGINE_VERSION_M1 } from '../core/constants.js';
import { EXTRACTOR_VERSION } from '../extract/extract.js';

const ROOT = 'corpus';
const OUT = join('eval', 'results');

const entryUrl = (sc: { label: { pages: Array<{ url: string }> } }): string => (sc.label.pages[0] as { url: string }).url;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string): boolean => process.argv.includes(`--${name}`);

function splitArg(): Split {
  const s = arg('split');
  if (s !== 'dev' && s !== 'test') throw new Error('--split dev|test is required');
  return s;
}

function write(name: string, data: unknown): void {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
}

function git(cmd: string): string {
  try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return 'unknown'; }
}

/** Structural validation only: schema, hashes, offline loading, steps and evidence selectors. No detection runs. */
export async function validate(split: Split): Promise<string[]> {
  const errors: string[] = [];
  const scenarios = loadSplit(ROOT, split);
  for (const sc of scenarios) errors.push(...validateLabel(sc.label, sc.dir.split('/').pop() as string, split));
  if (split === 'test') errors.push(...verifyManifest(ROOT, 'test').map((d) => `MANIFEST mismatch: ${d}`));
  const browser = await chromium.launch();
  try {
    for (const sc of scenarios) {
      const context = await browser.newContext({ viewport: VIEWPORT });
      const log: RequestLog = { served: [], blocked: [] };
      await routeScenario(context, sc, log);
      const page = await context.newPage();
      await page.goto(entryUrl(sc), { waitUntil: 'load' });
      for (const step of sc.label.steps) await page.click(step.click, { timeout: 2000 }).catch(() => errors.push(`${sc.label.id}: step ${step.click} failed`));
      if (sc.label.evidenceWithin && (await page.$(sc.label.evidenceWithin)) === null) errors.push(`${sc.label.id}: evidenceWithin ${sc.label.evidenceWithin} not found`);
      if (log.blocked.length > 0) errors.push(`${sc.label.id}: fixture attempted external requests: ${log.blocked.join(', ')}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return errors;
}

async function runAll(browser: Browser, split: Split, systems: readonly SystemDef[], extractOptions = {}): Promise<ScenarioRun[]> {
  const runs: ScenarioRun[] = [];
  for (const sc of loadSplit(ROOT, split)) runs.push(await runScenario(browser, sc, systems, extractOptions));
  return runs;
}

function metricsFor(runs: readonly ScenarioRun[], systems: readonly SystemDef[]): Record<string, SystemMetrics> {
  return Object.fromEntries(systems.map((s) => [s.id, computeMetrics(scored(runs, s.id))]));
}

async function run(split: Split): Promise<void> {
  if (split === 'test') {
    if (!flag('final')) throw new Error('Refusing to evaluate the frozen test split without --final (EVALUATION_PLAN.md §3).');
    const diffs = verifyManifest(ROOT, 'test');
    if (diffs.length > 0) throw new Error(`Test split does not match its manifest: ${diffs.join(', ')}`);
  }
  const browser = await chromium.launch();
  const runs = await runAll(browser, split, SYSTEMS).finally(() => browser.close());
  const metrics = metricsFor(runs, SYSTEMS);
  const scenarios = runs.map((r) => r.scenario);
  const meta = { split, engineVersion: ENGINE_VERSION, baselineEngineVersion: ENGINE_VERSION_M1, extractorVersion: EXTRACTOR_VERSION, systems: SYSTEMS.map(({ id, description }) => ({ id, description })) };

  // Deterministic part (no timings): byte-identical across runs on the same commit.
  write(`${split}.json`, {
    ...meta,
    composition: composition(scenarios),
    metrics,
    scenarios: runs.map((r) => ({
      id: r.scenario.label.id, truth: r.scenario.label.truth, expectedClass: r.scenario.label.expectedClass,
      hardNegative: r.scenario.label.hardNegative, lang: r.scenario.label.lang,
      blocks: r.snapshot.blocks.length, coverage: r.snapshot.coverage, requestsDuringScan: r.requestsDuringScan,
      outcomes: Object.fromEntries(Object.entries(r.outcomes).map(([k, o]) => [k, { verdict: o.verdict, rules: o.rules, localized: o.localized }])),
    })),
  });
  const ex = runs.map((r) => r.extract.elapsedMs);
  const an = runs.map((r) => (r.outcomes.veiltrace as { analyzeMs: number }).analyzeMs);
  const tot = runs.map((r, i) => (ex[i] as number) + (an[i] as number));
  const perf = {
    note: 'Wall-clock timings vary between runs; machine-dependent.',
    extractMs: { p50: percentile(ex, 50), p95: percentile(ex, 95), max: percentile(ex, 100) },
    analyzeMs: { p50: percentile(an, 50), p95: percentile(an, 95), max: percentile(an, 100) },
    totalMs: { p50: percentile(tot, 50), p95: percentile(tot, 95), max: percentile(tot, 100) },
    snapshotBytes: { p50: percentile(runs.map((r) => r.snapshotBytes), 50), max: percentile(runs.map((r) => r.snapshotBytes), 100) },
    requestsDuringScan: runs.reduce((s, r) => s + r.requestsDuringScan, 0),
  };
  write(`${split}.perf.json`, perf);

  const v = metrics.veiltrace as SystemMetrics;
  const scenarioRows = runs.map((r) => {
    const l = r.scenario.label;
    const o = (id: string): string => {
      const x = r.outcomes[id];
      return x ? `${x.verdict.replace('_instruction', '').replace('_correlation', '')}${x.localized === false ? ' ✗loc' : ''}` : '';
    };
    return `| ${l.id} | ${l.truth} | ${l.expectedClass.replace('_instruction', '').replace('_correlation', '')} | ${o('veiltrace')} | ${o('B0')} | ${o('A1-page+context')} | ${o('A2-region-only')} |`;
  });
  write(`${split}.md`, [
    `# Evaluation: ${split} split`, '',
    `Engine ${ENGINE_VERSION}, extractor ${EXTRACTOR_VERSION}. Synthetic fixtures; **not** real-world effectiveness.`, '',
    `Composition: ${Object.entries(composition(scenarios)).map(([k, n]) => `${k}=${n}`).join(', ')}`, '',
    '## Systems', '', systemsTable(metrics), '',
    '## VEILTRACE class matrix', '', classMatrix(v), '',
    `Observed-instruction (informational) results on benign scenarios: ${v.observedOnNegatives}.`, '',
    `Requests during scanning: ${perf.requestsDuringScan}. Partial scans: ${runs.filter((r) => (r.snapshot.coverage.partial ?? []).length > 0).map((r) => `${r.scenario.label.id} (${(r.snapshot.coverage.partial ?? []).join(', ')})`).join('; ') || 'none'}.`, '',
    'Latency is machine-specific and kept out of this file: see `' + split + '.perf.json` (not committed).', '',
    '## Per scenario', '', '| Scenario | Truth | Expected | VEILTRACE | B0 | A1 page+context | A2 region-only |', '|---|---|---|---|---|---|---|', ...scenarioRows, '',
  ].join('\n'));
  if (split === 'test') {
    appendFileSync(join('eval', 'runs.md'), `- ${new Date().toISOString()} · commit ${git('rev-parse HEAD')}${git('status --porcelain') ? ' (dirty)' : ''} · engine ${ENGINE_VERSION} · test split · results in eval/results/test.json\n`);
  }
  console.log(`${split}: ${runs.length} scenarios → ${OUT}/${split}.{json,md,perf.json}`);
}

async function research(): Promise<void> {
  if (arg('split') !== 'dev') throw new Error('research is dev-only (never on the frozen test split)');
  const variants = researchVariants();
  const browser = await chromium.launch();
  try {
    const semantic = await runAll(browser, 'dev', [...SYSTEMS, ...variants]);
    const coarse = await runAll(browser, 'dev', [{ id: 'coarse-containers', description: 'extractor containerStrategy=coarse (M1 table)', run: (s) => analyze(s, { ruleset: 'm1' }) }], { containerStrategy: 'coarse' });
    const metrics = { ...metricsFor(semantic, [...SYSTEMS, ...variants]), 'coarse-containers': computeMetrics(scored(coarse, 'coarse-containers')) };
    const changed = (id: string, runs: readonly ScenarioRun[]): string[] => runs
      .filter((r) => r.outcomes[id]?.verdict !== semantic.find((s) => s.scenario.label.id === r.scenario.label.id)?.outcomes['veiltrace-m1']?.verdict)
      .map((r) => `${r.scenario.label.id}: ${semantic.find((s) => s.scenario.label.id === r.scenario.label.id)?.outcomes['veiltrace-m1']?.verdict} → ${r.outcomes[id]?.verdict}`);
    const diffs: Record<string, string[]> = Object.fromEntries([...variants.map((v) => [v.id, changed(v.id, semantic)]), ['coarse-containers', changed('coarse-containers', coarse)]]);
    write('dev.research.json', { engineVersion: ENGINE_VERSION_M1, note: 'Research variants are defined on the M1 table and compared against veiltrace-m1.', metrics, verdictChangesVsVeiltraceM1: diffs });
    write('dev.research.md', ['# Dev research variants (not the accepted model)', '', systemsTable(metrics), '', '## Verdict changes vs veiltrace-m1 (M1 baseline)', '',
      ...Object.entries(diffs).map(([k, d]) => `- **${k}**: ${d.length === 0 ? 'no change' : d.join('; ')}`), ''].join('\n'));
    console.log(`research: ${Object.keys(metrics).length} systems → ${OUT}/dev.research.{json,md}`);
  } finally {
    await browser.close();
  }
}

/** M4.1: candidate rule sets vs the M3 baseline on the dev split (never the test split). */
async function refine(): Promise<void> {
  if (arg('split') !== 'dev') throw new Error('refine is dev-only (never on the frozen test split)');
  const variants = m41Variants();
  const browser = await chromium.launch();
  const runs = await runAll(browser, 'dev', variants).finally(() => browser.close());
  const metrics = metricsFor(runs, variants);
  const pos = (v: string): boolean => v === 'suspicious_correlation' || v === 'manipulative_instruction';
  const changes: Record<string, string[]> = {};
  for (const v of variants.slice(1)) {
    changes[v.id] = runs.flatMap((r) => {
      const a = r.outcomes['M3-baseline']?.verdict as string;
      const b = r.outcomes[v.id]?.verdict as string;
      if (a === b) return [];
      const l = r.scenario.label;
      const effect = pos(a) === pos(b) ? 'class change' : l.truth === 'malicious' ? (pos(b) ? 'FIXED FN' : 'NEW FN') : (pos(b) ? 'NEW FP' : 'FIXED FP');
      return [`${l.id} [${l.truth}] ${a} → ${b} (${effect})`];
    });
  }
  // C.OVERLAY / C.UGC: do these contexts separate malicious from benign on their own? (M3 strongest finding evidence)
  const ctxTable = { overlayOrDialog: { malicious: 0, benign: 0 }, ugc: { malicious: 0, benign: 0 }, anyFinding: { malicious: 0, benign: 0 } };
  for (const r of runs) {
    const res = (variants[0] as SystemDef).run(r.snapshot);
    const top = [...res.findings].sort((x, y) => ['observed_instruction', 'suspicious_correlation', 'manipulative_instruction'].indexOf(y.classification)
      - ['observed_instruction', 'suspicious_correlation', 'manipulative_instruction'].indexOf(x.classification))[0];
    if (!top) continue;
    const t = r.scenario.label.truth;
    ctxTable.anyFinding[t]++;
    const ids = new Set(top.observationIds);
    const blocks = res.observations.filter((o) => ids.has(o.id) && o.source.type === 'block')
      .map((o) => r.snapshot.blocks.find((b) => b.id === (o.source as { blockId: string }).blockId));
    if (blocks.some((b) => b?.ctx?.overlay || b?.ctx?.dialog)) ctxTable.overlayOrDialog[t]++;
    if (blocks.some((b) => b?.ctx?.ugc)) ctxTable.ugc[t]++;
  }
  const scenarios = runs.map((r) => ({ id: r.scenario.label.id, truth: r.scenario.label.truth, expectedClass: r.scenario.label.expectedClass,
    verdicts: Object.fromEntries(variants.map((v) => [v.id, r.outcomes[v.id]?.verdict])) }));
  write('dev.m41.json', { engineVersion: ENGINE_VERSION_M1, composition: composition(runs.map((r) => r.scenario)), metrics, changesVsM3: changes, contextSignals: ctxTable, scenarios });
  write('dev.m41.md', ['# M4.1 dev comparison (development split only; synthetic)', '', `Composition: ${Object.entries(composition(runs.map((r) => r.scenario))).map(([k, n]) => `${k}=${n}`).join(', ')}`, '',
    systemsTable(metrics), '', '## Verdict changes vs M3 baseline', '',
    ...Object.entries(changes).map(([k, d]) => `- **${k}**: ${d.length === 0 ? 'no change' : ''}\n${d.map((x) => `  - ${x}`).join('\n')}`), '',
    '## Context signals in the strongest M3 finding (scenarios with any finding)', '',
    '| Context | malicious | benign |', '|---|---|---|',
    ...Object.entries(ctxTable).map(([k, v]) => `| ${k} | ${v.malicious} | ${v.benign} |`), ''].join('\n'));
  console.log(`refine: ${variants.length} systems → ${OUT}/dev.m41.{json,md}`);
}

async function perf(): Promise<void> {
  const repeats = Number(arg('repeats') ?? 5);
  const browser = await chromium.launch();
  const rows: Array<Record<string, unknown>> = [];
  try {
    for (const p of perfPages()) {
      const context = await browser.newContext({ viewport: VIEWPORT });
      const blocked: string[] = [];
      await context.route('**/*', async (route) => {
        if (route.request().url() === 'https://perf.test/') await route.fulfill({ status: 200, body: p.html, headers: { 'content-type': 'text/html' } });
        else { blocked.push(route.request().url()); await route.abort(); }
      });
      const page = await context.newPage();
      await page.goto('https://perf.test/', { waitUntil: 'load' });
      const nodes = await page.evaluate('document.getElementsByTagName("*").length') as number;
      const ex: number[] = [];
      const an: number[] = [];
      let last: Awaited<ReturnType<typeof extractInPage>> | undefined;
      let verdict = 'none';
      for (let i = 0; i < repeats; i++) {
        last = await extractInPage(page);
        ex.push(last.stats.elapsedMs);
        const t0 = performance.now();
        verdict = analyze(last.snapshot).verdict;
        an.push(performance.now() - t0);
      }
      rows.push({
        id: p.id, description: p.description, elements: nodes, blocks: last?.snapshot.blocks.length, truncated: last?.snapshot.coverage.truncated,
        budgetHit: last?.stats.budgetHit, snapshotBytes: Buffer.byteLength(JSON.stringify(last?.snapshot)),
        extractMs: { p50: percentile(ex, 50), max: percentile(ex, 100) }, analyzeMs: { p50: percentile(an, 50), max: percentile(an, 100) },
        totalP50Ms: Math.round((percentile(ex, 50) + percentile(an, 50)) * 100) / 100,
        verdict, expectedPositive: p.expectPositive, externalRequests: blocked.length,
      });
      await context.close();
    }
    // Dynamic page: burst of DOM mutations → debounced notifications, then a rescan.
    const context = await browser.newContext({ viewport: VIEWPORT });
    await context.route('**/*', (route) => route.fulfill({ status: 200, body: '<!doctype html><body><main id="m"></main></body>', headers: { 'content-type': 'text/html' } }));
    const page = await context.newPage();
    await page.goto('https://perf.test/', { waitUntil: 'load' });
    const { extractorSource } = await import('./inject.js');
    const src = await extractorSource();
    const dyn = await page.evaluate(`(async () => { ${src};
      let n = 0; const stop = VeiltraceExtractor.watchForChanges(document, () => n++, { debounceMs: 100 });
      const m = document.getElementById('m');
      for (let i = 0; i < 2000; i++) { const p = document.createElement('p'); p.textContent = 'item ' + i; m.appendChild(p); if (i % 200 === 0) await new Promise((r) => setTimeout(r, 10)); }
      await new Promise((r) => setTimeout(r, 300)); stop();
      const t0 = performance.now(); const r = VeiltraceExtractor.extractSnapshot(document); return { notifications: n, mutationsApplied: 2000, rescanMs: performance.now() - t0, blocks: r.snapshot.blocks.length }; })()`);
    await context.close();
    write('perf.json', { note: 'Synthetic large pages; machine-dependent wall-clock times.', engineVersion: ENGINE_VERSION, extractorVersion: EXTRACTOR_VERSION, repeats, pages: rows, dynamic: dyn });
    console.log(JSON.stringify({ pages: rows, dynamic: dyn }, null, 1));
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === 'manifest') {
    const split = splitArg();
    const path = join(ROOT, split, 'MANIFEST.json');
    if (split === 'test' && existsSync(path) && !flag('refreeze')) throw new Error('Test split is frozen. Refreezing requires --refreeze and an owner-approved DECISIONS.md entry.');
    const m = computeManifest(ROOT, split, arg('date') ?? new Date().toISOString().slice(0, 10));
    writeFileSync(path, JSON.stringify(m, null, 2) + '\n');
    console.log(`${split}: ${m.scenarios} scenarios, ${Object.keys(m.files).length} files, aggregate ${m.aggregate}`);
  } else if (cmd === 'validate') {
    const split = splitArg();
    const errors = await validate(split);
    if (errors.length > 0) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else console.log(`${split}: valid (${loadSplit(ROOT, split).length} scenarios)`);
  } else if (cmd === 'run') await run(splitArg());
  else if (cmd === 'research') await research();
  else if (cmd === 'refine') await refine();
  else if (cmd === 'perf') await perf();
  else throw new Error(`Unknown command: ${String(cmd)}`);
}

await main();
