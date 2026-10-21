// Shared regex fragments. All patterns run on normalized text (lowercase, NFKC, folded, single spaces).
import type { Lang, LexiconEntry, SignalId, Strength } from '../types.js';

/** Start boundary: not preceded by a letter, digit or underscore (Unicode-aware). */
export const B = '(?<![\\p{L}\\p{N}_])';
/** End boundary: not followed by a letter, digit or underscore. */
export const E = '(?![\\p{L}\\p{N}_])';
/** Separator between key names: "+", "plus", "and", "dan", "&", "-", or nothing. */
export const SEP = '\\s*(?:\\+|plus|and|dan|&|-)?\\s*';
export const APOS = "['’]";
export const QUOTE = '["\'“”‘’«»]?';

/** Windows key: "win", "windows", "windows key", "windows logo key", "tombol windows", "⊞". */
export const WIN = '(?:(?:tombol\\s+)?(?:logo\\s+)?win(?:dows)?(?:\\s+logo)?(?:\\s+key)?|⊞|❖)';
export const CTRL = '(?:ctrl|control|ctl|strg|⌃)';
export const CMD = '(?:cmd|command|⌘)';
export const SHELL = '(?:windows\\s+)?(?:powershell|pwsh|terminal|command\\s+prompt|cmd(?:\\.exe)?)';

export function entry(
  id: string,
  signal: SignalId,
  lang: Lang,
  strength: Strength,
  source: string,
  examples: string[],
): LexiconEntry {
  return { id, signal, lang, strength, pattern: new RegExp(source, 'gu'), examples };
}
