import { describe, expect, it } from 'vitest';
import { LEXICON } from '../src/core/lexicon/index.js';
import { normalize } from '../src/core/normalize.js';
import type { SignalId } from '../src/core/types.js';

function matches(pattern: RegExp, original: string): boolean {
  pattern.lastIndex = 0;
  const ok = pattern.test(normalize(original).text);
  pattern.lastIndex = 0;
  return ok;
}

describe('lexicon', () => {
  it('has unique entry ids and g+u flags on every pattern', () => {
    const ids = LEXICON.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of LEXICON) {
      expect(e.pattern.flags, e.id).toContain('g');
      expect(e.pattern.flags, e.id).toContain('u');
      expect(e.examples.length, e.id).toBeGreaterThan(0);
    }
  });

  for (const e of LEXICON) {
    it(`${e.id} matches its examples`, () => {
      for (const ex of e.examples) expect(matches(e.pattern, ex), `${e.id} ⟵ "${ex}"`).toBe(true);
    });
  }

  const LANGUAGE_DEPENDENT: SignalId[] = ['A.OPEN_RUN', 'A.PASTE', 'A.EXECUTE', 'P.HUMAN_VERIFY', 'P.FAKE_FIX'];
  for (const signal of LANGUAGE_DEPENDENT) {
    for (const lang of ['en', 'id'] as const) {
      it(`${signal} has >= 5 ${lang} entries`, () => {
        expect(LEXICON.filter((e) => e.signal === signal && e.lang === lang).length).toBeGreaterThanOrEqual(5);
      });
    }
  }

  it('A.COMMAND has >= 8 strong language-neutral patterns', () => {
    expect(LEXICON.filter((e) => e.signal === 'A.COMMAND' && e.strength === 'strong').length).toBeGreaterThanOrEqual(8);
  });

  it('negation cues skip affirmative idioms', () => {
    const neg = LEXICON.filter((e) => e.signal === 'C.NEGATION');
    const any = (s: string) => neg.some((e) => matches(e.pattern, s));
    expect(any("don't worry")).toBe(false);
    expect(any("don't forget to")).toBe(false);
    expect(any('jangan khawatir')).toBe(false);
    expect(any('jangan lupa')).toBe(false);
    expect(any('never paste')).toBe(true);
    expect(any('jangan pernah tekan')).toBe(true);
  });

  it('does not match common benign phrasing', () => {
    const sig = (signal: SignalId, s: string) =>
      LEXICON.filter((e) => e.signal === signal).some((e) => matches(e.pattern, s));
    expect(sig('A.EXECUTE', 'Enter your email address')).toBe(false);
    expect(sig('A.OPEN_RUN', 'Windows 11 runs faster')).toBe(false);
    expect(sig('A.OPEN_RUN', 'Win a prize')).toBe(false);
    expect(sig('A.PASTE', 'Ctrl+Vision')).toBe(false);
    expect(sig('P.HUMAN_VERIFY', 'Masukkan kode verifikasi yang kami kirim')).toBe(false);
    expect(sig('P.HUMAN_VERIFY', 'Enter the verification code we sent you')).toBe(false);
  });
});
