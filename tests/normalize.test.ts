import { describe, expect, it } from 'vitest';
import { normalize, toOriginalRange } from '../src/core/normalize.js';

function roundTrip(original: string, needle: string): string {
  const n = normalize(original);
  const at = n.text.indexOf(needle);
  expect(at, `"${needle}" not found in "${n.text}"`).toBeGreaterThanOrEqual(0);
  const r = toOriginalRange(n, at, at + needle.length);
  return original.slice(r.start, r.end);
}

describe('normalize', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalize('Press   WIN\n\t+  R').text).toBe('press win + r');
  });

  it('removes zero-width characters and soft hyphens', () => {
    expect(normalize('Win​+‍R pow­er﻿shell').text).toBe('win+r powershell');
  });

  it('applies NFKC (full-width letters and digits)', () => {
    expect(normalize('ＣＴＲＬ＋Ｖ ２４').text).toBe('ctrl+v 24');
  });

  it('strips combining marks', () => {
    expect(normalize('vérify').text).toBe('verify');
  });

  it('folds Cyrillic and Greek lookalikes to Latin', () => {
    // "р", "о", "е", "ѕ", "һ" are Cyrillic; "ο" is Greek.
    expect(normalize('роwerѕһell').text).toBe('powershell');
    expect(normalize('rοbot').text).toBe('robot');
  });

  it('maps normalized ranges back to exact original text', () => {
    expect(roundTrip('Please   PRESS  Win+R now', 'press win+r')).toBe('PRESS  Win+R');
    expect(roundTrip('ＣＴＲＬ＋Ｖ', 'ctrl+v')).toBe('ＣＴＲＬ＋Ｖ');
    expect(roundTrip('a​b verify', 'ab')).toBe('a​b');
    expect(roundTrip('vérify you', 'verify')).toBe('vérify');
  });

  it('marks units altered by deobfuscation', () => {
    const n = normalize('рower shell');
    expect(n.altered[0]).toBe(true);
    expect(n.altered[1]).toBe(false);
    const z = normalize('a​b');
    // The character after a dropped zero-width char is flagged.
    expect(z.altered).toEqual([false, true]);
  });

  it('handles empty and whitespace-only input', () => {
    expect(normalize('').text).toBe('');
    expect(normalize('   ').text).toBe(' ');
  });

  it('keeps surrogate pairs intact', () => {
    const n = normalize('a😀b');
    expect(n.text).toBe('a😀b');
    expect(roundTrip('x 😀 y', '😀')).toBe('😀');
  });
});
