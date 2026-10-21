// Unit tests for opt-in automatic scanning (D-081): the only data that leaves a tab, its validation, and the badge rule.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyze, analyzeCredentials, analyzePayments, analyzeSupport } from '../src/core/index.js';
import type { PageSnapshot } from '../src/core/index.js';
import { buildReport } from '../src/extension/content/report.js';
import { snapshot } from './fixtures/build.js';

(globalThis as { __VT_TEST__?: boolean }).__VT_TEST__ = false;
const { AUTO_ORIGINS, badgeFor, parseAutoSummary, summarize } = await import('../src/extension/auto/auto.js');

const report = (s: PageSnapshot) => buildReport(s, analyze(s), { engine: 'e', extractor: 'x' }, { extractMs: 0, analyzeMs: 0 },
  analyzeCredentials(s), analyzePayments(s), analyzeSupport(s));

describe('automatic scanning summary', () => {
  it('carries only the page-level verdict and the actionable count, never page text', () => {
    const s = snapshot([{ t: 'Verify you are human', c: 'dialog:#v' }, { t: 'Press Win+R, then Ctrl+V and press Enter.', c: 'dialog:#v' },
      { t: 'Secret page text that must not leave the tab.', c: 'main' }]);
    const summary = summarize(report(s));
    expect(summary).toEqual({ type: 'veiltrace:auto', v: 1, verdict: 'manipulative_instruction', actionable: 1 });
    expect(JSON.stringify(summary)).not.toContain('Win+R');
  });

  it('validates the exact shape of a received message', () => {
    const good = { type: 'veiltrace:auto', v: 1, verdict: 'none', actionable: 0 };
    expect(parseAutoSummary(good)).toEqual(good);
    for (const bad of [null, 'x', [], { ...good, v: 2 }, { ...good, verdict: 'safe' }, { ...good, actionable: -1 }, { ...good, actionable: 1.5 },
      { ...good, text: 'page text' }, { type: 'other', v: 1, verdict: 'none', actionable: 0 }]) {
      expect(parseAutoSummary(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('shows a badge only for manipulative pages', () => {
    const s = (verdict: string) => ({ type: 'veiltrace:auto', v: 1, verdict, actionable: 1 }) as Parameters<typeof badgeFor>[0];
    expect(badgeFor(s('manipulative_instruction')).text).toBe('!');
    for (const v of ['suspicious_correlation', 'observed_instruction', 'none']) expect(badgeFor(s(v)).text).toBe('');
  });

  it('production asks for exactly the optional http(s) origins declared in the manifest', () => {
    const manifest = JSON.parse(readFileSync('src/extension/manifest.json', 'utf8')) as { optional_host_permissions: string[] };
    expect(AUTO_ORIGINS).toEqual(manifest.optional_host_permissions);
  });
});
