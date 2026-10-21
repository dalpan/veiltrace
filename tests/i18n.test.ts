import { describe, expect, it } from 'vitest';
import { detectLang, formatCount, MESSAGES } from '../src/extension/popup/i18n.js';

type Tree = Record<string, unknown>;

function leaves(obj: Tree, prefix = ''): Array<[string, unknown]> {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? leaves(v as Tree, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));
}

describe('UI dictionaries', () => {
  const en = new Map(leaves(MESSAGES.en as unknown as Tree));
  const id = new Map(leaves(MESSAGES.id as unknown as Tree));

  it('have identical keys', () => {
    expect([...id.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it('have no empty strings and translate every user-facing string', () => {
    // Technical identifiers that are deliberately identical in both languages.
    const tones = ['manipulative_instruction', 'suspicious_correlation', 'observed_instruction', 'none'];
    const same = new Set([...tones.map((v) => `dash.headline.${v}.tone`), ...['command', 'credential', 'payment', 'support'].map((c) => `dash.categoryCode.${c}`), 'auto.modeLabel.manual', 'pwa.source.chat', 'pwa.source.sms', 'pwa.source.email']);
    for (const [k, v] of en) {
      const other = id.get(k);
      if (typeof v === 'function') {
        const a = (v as (...x: unknown[]) => string)('X', 'Y', 3);
        const b = (other as (...x: unknown[]) => string)('X', 'Y', 3);
        expect(a.length, k).toBeGreaterThan(0);
        expect(b, k).not.toBe(a);
        continue;
      }
      expect(typeof v === 'string' && v.length > 0, k).toBe(true);
      expect(typeof other === 'string' && other.length > 0, k).toBe(true);
      if (!same.has(k)) expect(other, k).not.toBe(v);
    }
  });

  it('never call a page safe', () => {
    for (const [, v] of [...en, ...id]) if (typeof v === 'string') expect(v.toLowerCase()).not.toMatch(/\bsafe\b|\baman\b/);
  });
});

describe('language selection', () => {
  it('is deterministic from the browser UI language', () => {
    for (const l of ['id', 'id-ID', 'id_ID', 'in', 'ID']) expect(detectLang(l), l).toBe('id');
    for (const l of ['en', 'en-US', 'ms', 'nl', 'indonesian', '', undefined]) expect(detectLang(l), String(l)).toBe('en');
  });

  it('formats counts per locale', () => {
    expect(formatCount(5000, 'en')).toBe('5,000');
    expect(formatCount(5000, 'id')).toBe('5.000');
  });
});
