// Runs scenarios through extraction + one or more systems, offline. Shared by `run`, `research` and `perf`.
import { performance } from 'node:perf_hooks';
import type { Browser } from 'playwright';
import type { AnalysisResult, Classification, PageSnapshot, Verdict } from '../core/types.js';
import type { ExtractOptions, ExtractStats } from '../extract/index.js';
import type { Scenario } from './corpus.js';
import { extractInPage, locatorsWithin } from './inject.js';
import { isPositive, type ScoredScenario } from './metrics.js';
import { routeScenario, VIEWPORT, type RequestLog } from './serve.js';
import type { SystemDef } from './systems.js';

export interface SystemOutcome {
  verdict: Verdict;
  rules: string[];
  localized: boolean | null;
  analyzeMs: number;
}

export interface ScenarioRun {
  scenario: Scenario;
  snapshot: PageSnapshot;
  extract: ExtractStats;
  extractWallMs: number;
  snapshotBytes: number;
  requestsDuringScan: number;
  externalRequestsBlocked: number;
  outcomes: Record<string, SystemOutcome>;
}

const TIER: Record<Classification, number> = { observed_instruction: 0, suspicious_correlation: 1, manipulative_instruction: 2 };

/** Locators of every evidence source of the strongest finding. */
export function evidenceLocators(result: AnalysisResult, snapshot: PageSnapshot): string[] {
  const top = [...result.findings].sort((a, b) => TIER[b.classification] - TIER[a.classification])[0];
  if (!top) return [];
  const ids = new Set(top.observationIds);
  const out: string[] = [];
  for (const o of result.observations) {
    if (!ids.has(o.id)) continue;
    const src = o.source;
    const loc = src.type === 'block' ? snapshot.blocks.find((b) => b.id === src.blockId)?.locator
      : src.type === 'hiddenCopy' ? snapshot.hiddenCopyCandidates.find((h) => h.id === src.candidateId)?.locator
        : snapshot.copyTriggers.find((t) => t.id === src.triggerId)?.locator;
    out.push(loc ?? '');
  }
  return out;
}

export async function runScenario(browser: Browser, sc: Scenario, systems: readonly SystemDef[], extractOptions: ExtractOptions = {}): Promise<ScenarioRun> {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const log: RequestLog = { served: [], blocked: [] };
  try {
    await routeScenario(context, sc, log);
    const page = await context.newPage();
    await page.goto((sc.label.pages[0] as { url: string }).url, { waitUntil: 'load' });
    for (const step of sc.label.steps) await page.click(step.click);
    if (sc.label.steps.length > 0) await page.waitForTimeout(100);

    const before = log.served.length + log.blocked.length;
    const t0 = performance.now();
    const { snapshot, stats } = await extractInPage(page, extractOptions);
    const extractWallMs = performance.now() - t0;
    const requestsDuringScan = log.served.length + log.blocked.length - before;

    const outcomes: Record<string, SystemOutcome> = {};
    for (const sys of systems) {
      const a0 = performance.now();
      const result = sys.run(snapshot);
      const analyzeMs = performance.now() - a0;
      let localized: boolean | null = null;
      if (sc.label.truth === 'malicious' && isPositive(result.verdict) && sc.label.evidenceWithin) {
        const locs = evidenceLocators(result, snapshot);
        localized = locs.length > 0 && (await locatorsWithin(page, locs, sc.label.evidenceWithin)).every(Boolean);
      }
      outcomes[sys.id] = { verdict: result.verdict, rules: result.findings.map((f) => `${f.ruleId}:${f.classification}`), localized, analyzeMs };
    }
    return {
      scenario: sc, snapshot, extract: stats, extractWallMs,
      snapshotBytes: Buffer.byteLength(JSON.stringify(snapshot)),
      requestsDuringScan, externalRequestsBlocked: log.blocked.length, outcomes,
    };
  } finally {
    await context.close();
  }
}

export function scored(runs: readonly ScenarioRun[], systemId: string): ScoredScenario[] {
  return runs.map((r) => {
    const o = r.outcomes[systemId] as SystemOutcome;
    const l = r.scenario.label;
    return {
      id: l.id, truth: l.truth, expectedClass: l.expectedClass, hardNegative: l.hardNegative, lang: l.lang, category: l.category,
      predicted: o.verdict, localized: o.localized,
    };
  });
}
