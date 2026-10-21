// Text normalization with an exact map back to the original text (DETECTION_MODEL.md §7).

export interface NormalizedText {
  /** Normalized text used for matching. */
  text: string;
  /** For each UTF-16 unit of `text`: start offset of the original unit that produced it. */
  starts: number[];
  /** For each UTF-16 unit of `text`: end offset (exclusive) of that original unit. */
  ends: number[];
  /** For each UTF-16 unit of `text`: the unit was folded, or follows a dropped invisible character. */
  altered: boolean[];
}

const INVISIBLE = new Set(['​', '‌', '‍', '⁠', '﻿', '­']);

// Lookalikes that would otherwise defeat Latin-script lexicons. Applied after lowercasing.
const CONFUSABLES: Readonly<Record<string, string>> = {
  // Cyrillic
  'а': 'a', 'е': 'e', 'і': 'i', 'ј': 'j', 'к': 'k', 'о': 'o', 'р': 'p', 'с': 'c',
  'ѕ': 's', 'у': 'y', 'х': 'x', 'һ': 'h', 'ԁ': 'd', 'ԛ': 'q', 'ԝ': 'w', 'ӏ': 'l',
  // Greek
  'α': 'a', 'ι': 'i', 'κ': 'k', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'υ': 'u', 'χ': 'x',
  // Latin script variants
  'ɡ': 'g', 'ı': 'i',
};

const COMBINING_MARK = /\p{M}/u;
const COMBINING_MARKS = /\p{M}/gu;
const WHITESPACE = /\s/u;

export function normalize(original: string): NormalizedText {
  const out: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  const altered: boolean[] = [];
  let pendingAltered = false;

  const emit = (unit: string, start: number, end: number, wasAltered: boolean): void => {
    for (let k = 0; k < unit.length; k++) {
      out.push(unit[k] as string);
      starts.push(start);
      ends.push(end);
      altered.push(wasAltered);
    }
  };

  const emitSpace = (start: number, end: number): void => {
    const last = out.length - 1;
    if (last >= 0 && out[last] === ' ') {
      ends[last] = end; // collapse: the single space covers the whole whitespace run
      return;
    }
    emit(' ', start, end, false);
  };

  let i = 0;
  while (i < original.length) {
    const start = i;
    const cp = original.codePointAt(i) as number;
    i += cp > 0xffff ? 2 : 1;
    // A unit is one code point plus any following combining marks.
    while (i < original.length && COMBINING_MARK.test(original[i] as string)) i++;
    const unit = original.slice(start, i);
    const base = String.fromCodePoint(cp);

    if (INVISIBLE.has(base)) {
      pendingAltered = true;
      continue;
    }
    if (WHITESPACE.test(base)) {
      emitSpace(start, i);
      continue;
    }

    const folded = unit.normalize('NFKC').toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '');
    for (const ch of folded) {
      if (WHITESPACE.test(ch)) {
        emitSpace(start, i);
        continue;
      }
      const conf = CONFUSABLES[ch];
      emit(conf ?? ch, start, i, pendingAltered || conf !== undefined);
      pendingAltered = false;
    }
  }

  return { text: out.join(''), starts, ends, altered };
}

/** Maps a normalized half-open range [s, e) to the original half-open range. */
export function toOriginalRange(n: NormalizedText, s: number, e: number): { start: number; end: number } {
  if (e <= s) {
    const at = n.starts[s] ?? n.ends[n.ends.length - 1] ?? 0;
    return { start: at, end: at };
  }
  return { start: n.starts[s] as number, end: n.ends[e - 1] as number };
}

export function isAlteredRange(n: NormalizedText, s: number, e: number): boolean {
  for (let k = s; k < e; k++) if (n.altered[k]) return true;
  return false;
}
