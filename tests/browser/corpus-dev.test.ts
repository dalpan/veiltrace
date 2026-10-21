// Runs every DEV scenario through real extraction + analysis. Asserts invariants (offsets, offline,
// localization of evidence sources), not verdicts: verdicts are research results reported by `npm run eval`.
import type { Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyze } from '../../src/core/index.js';
import { loadSplit } from '../../src/eval/corpus.js';
import { evidenceLocators, runScenario } from '../../src/eval/runner.js';
import { SYSTEMS } from '../../src/eval/systems.js';
import { launch } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

describe('dev corpus through the real extractor', () => {
  for (const sc of loadSplit('corpus', 'dev')) {
    it(`${sc.label.id}: exact offsets, resolvable evidence, no network`, async () => {
      const run = await runScenario(browser, sc, SYSTEMS.filter((s) => s.id === 'veiltrace'));
      expect(run.requestsDuringScan).toBe(0);
      expect(run.externalRequestsBlocked).toBe(0);
      const result = analyze(run.snapshot);
      for (const o of result.observations) {
        const src = o.source;
        const text = src.type === 'block' ? run.snapshot.blocks.find((b) => b.id === src.blockId)!.text
          : src.type === 'hiddenCopy' ? run.snapshot.hiddenCopyCandidates.find((h) => h.id === src.candidateId)!.text
            : run.snapshot.copyTriggers.find((t) => t.id === src.triggerId)!.label;
        expect(o.text).toBe(text.slice(o.start, o.end));
      }
      for (const loc of evidenceLocators(result, run.snapshot)) expect(loc).not.toBe('');
    });
  }
});
