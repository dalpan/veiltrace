import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { computeMetrics, percentile, wilson, type ScoredScenario } from '../src/eval/metrics.js';
import { pageLevel, SYSTEMS } from '../src/eval/systems.js';
import { inContainer, snapshot } from './fixtures/build.js';

describe('wilson interval', () => {
  it('matches reference values', () => {
    expect(wilson(12, 14)).toEqual({ k: 12, n: 14, value: 0.8571, ci95: [0.6006, 0.9599] });
    expect(wilson(0, 22).ci95).toEqual([0, 0.1487]);
    expect(wilson(0, 0)).toEqual({ k: 0, n: 0, value: null, ci95: null });
  });
});

describe('computeMetrics', () => {
  const row = (id: string, truth: 'malicious' | 'benign', predicted: ScoredScenario['predicted'], extra: Partial<ScoredScenario> = {}): ScoredScenario => ({
    id, truth, predicted, expectedClass: truth === 'malicious' ? 'manipulative_instruction' : 'none', hardNegative: truth === 'benign',
    lang: 'en', category: 'x', localized: truth === 'malicious' && predicted !== 'none' && predicted !== 'observed_instruction' ? true : null, ...extra,
  });
  it('counts the positive class as suspicious or manipulative only', () => {
    const m = computeMetrics([
      row('a', 'malicious', 'manipulative_instruction'),
      row('b', 'malicious', 'observed_instruction'),
      row('c', 'benign', 'observed_instruction'),
      row('d', 'benign', 'suspicious_correlation'),
      row('e', 'malicious', 'suspicious_correlation', { localized: false }),
    ]);
    expect(m.confusion).toEqual({ tp: 2, fp: 1, tn: 1, fn: 1 });
    expect(m.localization).toMatchObject({ k: 1, n: 2 });
    expect(m.observedOnNegatives).toBe(1);
    expect(m.hardNegativeFpr).toMatchObject({ k: 1, n: 2 });
    expect(m.classMatrix[3]).toEqual([0, 1, 1, 1]);
  });

  it('computes percentiles', () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([5, 1, 3, 2, 4], 95)).toBe(5);
  });
});

describe('baseline B0', () => {
  const b0 = SYSTEMS.find((s) => s.id === 'B0')!;
  it('correlates across regions and ignores context, unlike VEILTRACE', () => {
    const s = snapshot([...inContainer('banner', ['Verify you are human']), ...inContainer('docs', ['Press Win+R', 'Press Ctrl+V', 'Press Enter'])]);
    expect(SYSTEMS.find((x) => x.id === 'veiltrace')!.run(s).verdict).toBe('observed_instruction');
    expect(b0.run(s).verdict).toBe('manipulative_instruction');
    const negated = snapshot(['Never press Win+R and paste code. Do not press Ctrl+V then Enter to verify you are human.']);
    expect(b0.run(negated).verdict).not.toBe('none');
  });

  it('pageLevel keeps the snapshot otherwise identical', () => {
    const s = snapshot(['a', { t: 'b', c: 'x' }], { hidden: [{ text: 'h', containerId: 'x' }], triggers: [{ label: 'Copy', containerId: 'x' }] });
    const p = pageLevel(s);
    expect(p.blocks.map((b) => [b.id, b.text, b.containerId])).toEqual([['b0', 'a', 'page'], ['b1', 'b', 'page']]);
    expect(p.hiddenCopyCandidates[0]!.containerId).toBe('page');
    expect(p.copyTriggers[0]!.containerId).toBe('page');
  });
});

describe('held-out protection in the CLI', () => {
  it('refuses to run detection on the test split without --final', () => {
    const r = spawnSync('node', ['scripts/eval.mjs', 'run', '--split', 'test'], { encoding: 'utf8' });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('Refusing to evaluate the frozen test split without --final');
  }, 60_000);

  it('refuses research variants on the test split', () => {
    const r = spawnSync('node', ['scripts/eval.mjs', 'research', '--split', 'test'], { encoding: 'utf8' });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('research is dev-only');
  }, 60_000);
});
