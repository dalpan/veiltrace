// Unit tests for the unified dashboard model (M5.4): aggregation, sorting and grouping over a validated ScanReport.
import { describe, expect, it } from 'vitest';
import { analyze, analyzeCredentials, analyzePayments, analyzeSupport } from '../src/core/index.js';
import type { PageSnapshot } from '../src/core/index.js';
import { buildReport } from '../src/extension/content/report.js';
import { aggregate, compareRefs, groupRefs, type FindingRef } from '../src/extension/popup/aggregate.js';
import { parseScanReport } from '../src/extension/popup/validate.js';
import { snapshot } from './fixtures/build.js';

const report = (s: PageSnapshot) => parseScanReport(JSON.parse(JSON.stringify(buildReport(s, analyze(s), { engine: 'e', extractor: 'x' },
  { extractMs: 0, analyzeMs: 0 }, analyzeCredentials(s), analyzePayments(s), analyzeSupport(s)))))!;

/** A ClickFix lure in a dialog, and one tech-support block that is also an advance-fee payment request. */
const multi = () => snapshot([
  { t: 'Verify you are human', c: 'dialog:#v' }, { t: 'Press Win+R, then Ctrl+V and press Enter.', c: 'dialog:#v' },
  { t: 'Your computer is infected. Call Windows Support at +1 888 555 0199 immediately and pay the unlock fee of $199 to unlock your computer.', c: 'main' },
]);

const ref = (over: Partial<FindingRef>): FindingRef => ({
  key: 'x', category: 'command', id: 'f', ruleId: 'R1', classification: 'manipulative_instruction', confidence: 'high', actionRisk: 'high', locators: [], index: 0, ...over,
});

describe('dashboard aggregation', () => {
  it('summarizes all four detectors: highest classification, actionable count, affected categories', () => {
    const r = report(multi());
    const d = aggregate(r);
    expect(d.highest).toBe('manipulative_instruction');
    expect(d.categories.command).toMatchObject({ verdict: 'manipulative_instruction', actionable: 1 });
    expect(d.categories.payment.verdict).toBe('manipulative_instruction');
    expect(d.categories.support.verdict).toBe('manipulative_instruction');
    expect(d.categories.credential).toEqual({ verdict: 'none', total: 0, actionable: 0 });
    expect(d.affected).toEqual(['command', 'payment', 'support']);
    expect(d.actionable).toBe(3);
    expect(d.complete).toBe(true);
  });

  it('groups findings that cite the same page element, keeping each member and recording which detectors share it', () => {
    const d = aggregate(report(multi()));
    const shared = d.groups.find((g) => g.members.length > 1)!;
    expect(shared.members.map((m) => m.category).sort()).toEqual(['payment', 'support']);
    expect([...shared.shared.values()]).toEqual([['payment', 'support']]);
    // The ClickFix lure cites other elements and stays on its own.
    expect(d.groups.filter((g) => g.members.length === 1).map((g) => g.members[0]!.category)).toEqual(['command']);
    // Grouping never drops a finding.
    expect(d.groups.flatMap((g) => g.members).length + d.observed.flatMap((g) => g.members).length).toBe(3);
  });

  it('empty page: nothing to report, no groups, nothing affected', () => {
    const d = aggregate(report(snapshot(['Weather today: sunny.'])));
    expect(d).toMatchObject({ highest: 'none', actionable: 0, affected: [], groups: [], observed: [] });
  });

  it('observed-only findings go to the collapsed observed list', () => {
    const d = aggregate(report(snapshot(['Contact us', 'Call our customer service at +1 800 555 0100.'])));
    expect(d.highest).toBe('observed_instruction');
    expect(d.groups).toEqual([]);
    expect(d.observed.map((g) => g.members[0]!.ruleId)).toEqual(['SR5']);
  });

  it('partial scans are reported as incomplete', () => {
    const s = multi();
    const d = aggregate(report({ ...s, coverage: { ...s.coverage, framesSkipped: 1, partial: ['frames-skipped'] } }));
    expect(d.complete).toBe(false);
  });
});

describe('dashboard ordering', () => {
  it('sorts by classification, then action risk, then confidence, then detector order', () => {
    const refs = [
      ref({ key: 'a', category: 'support', classification: 'suspicious_correlation', actionRisk: 'high' }),
      ref({ key: 'b', category: 'payment', classification: 'manipulative_instruction', actionRisk: 'medium' }),
      ref({ key: 'c', category: 'credential', classification: 'manipulative_instruction', actionRisk: 'high', confidence: 'medium' }),
      ref({ key: 'd', category: 'command', classification: 'manipulative_instruction', actionRisk: 'high', confidence: 'high' }),
      ref({ key: 'e', category: 'payment', classification: 'suspicious_correlation', actionRisk: 'high' }),
    ];
    expect([...refs].sort(compareRefs).map((x) => x.key)).toEqual(['d', 'c', 'b', 'e', 'a']);
  });

  it('a group is placed by its strongest member and lists members strongest first', () => {
    const groups = groupRefs([
      ref({ key: 'p', category: 'payment', classification: 'suspicious_correlation', locators: ['#x'] }),
      ref({ key: 'q', category: 'command', classification: 'observed_instruction', locators: ['#y'] }),
      ref({ key: 's', category: 'support', classification: 'manipulative_instruction', locators: ['#x', '#z'] }),
    ]);
    expect(groups.map((g) => g.members.map((m) => m.key))).toEqual([['s', 'p'], ['q']]);
    expect(groups[0]!.classification).toBe('manipulative_instruction');
    expect([...groups[0]!.shared.keys()]).toEqual(['#x']);
  });

  it('findings without locators are never grouped', () => {
    expect(groupRefs([ref({ key: 'a' }), ref({ key: 'b' })]).map((g) => g.members.length)).toEqual([1, 1]);
  });
});
