// Lexicon matching → observations with exact source offsets, plus negation / reported-speech binding.
import { NEGATION_MAX_GAP, WINDOW_BLOCKS } from './constants.js';
import { kindOf, LEXICON } from './lexicon/index.js';
import { isAlteredRange, toOriginalRange, type NormalizedText } from './normalize.js';
import type { RegionInfo } from './regions.js';
import type { Block, LexiconEntry, Observation, SignalId, SourceRef } from './types.js';

/** A clause break between a cue and an action: punctuation or a coordinating conjunction. */
const CLAUSE_BREAK = /[,;:.!?]|(?<![\p{L}\p{N}_])(?:and|then|or|but|dan|lalu|kemudian|atau|tapi|tetapi)(?![\p{L}\p{N}_])/u;
const SENTENCE_BREAK = /[.!?]/u;

export interface Source {
  ref: SourceRef;
  /** Original text (after core truncation). */
  text: string;
  norm: NormalizedText;
  region: RegionInfo;
  /** Reading-order position inside the region: block index, or index + 0.5 for auxiliary sources. */
  pos: number;
  /** Tie-breaker among auxiliary sources at the same position. */
  order: number;
  block?: Block;
}

/** Observation plus internal bookkeeping that is stripped from the public result. */
export interface Obs {
  o: Observation;
  src: Source;
  nStart: number;
  nEnd: number;
  /** Context observation that bound this action, if any. */
  boundBy?: Obs;
}

function matchSource(src: Source): Obs[] {
  const raw: Array<{ entry: LexiconEntry; s: number; e: number }> = [];
  for (const entry of LEXICON) {
    // Structural copy triggers are handled separately; aux sources only carry action signals.
    if (src.ref.type !== 'block' && kindOf(entry.signal) !== 'action') continue;
    entry.pattern.lastIndex = 0;
    for (const m of src.norm.text.matchAll(entry.pattern)) {
      if (m[0].length === 0) continue;
      raw.push({ entry, s: m.index, e: m.index + m[0].length });
    }
  }
  // Per signal, keep non-overlapping matches: strong entries first (they are the more precise evidence,
  // e.g. "Windows + R" over "press the Windows key"), then earliest, then longest.
  const rank = (x: (typeof raw)[number]): number => (x.entry.strength === 'strong' ? 0 : 1);
  raw.sort((a, b) => rank(a) - rank(b) || a.s - b.s || b.e - a.e || a.entry.id.localeCompare(b.entry.id));
  const kept = new Map<SignalId, Array<[number, number]>>();
  const out: Obs[] = [];
  for (const r of raw) {
    const spans = kept.get(r.entry.signal) ?? [];
    if (spans.some(([s, e]) => r.s < e && s < r.e)) continue;
    spans.push([r.s, r.e]);
    kept.set(r.entry.signal, spans);
    const range = toOriginalRange(src.norm, r.s, r.e);
    out.push({
      src,
      nStart: r.s,
      nEnd: r.e,
      o: {
        id: '',
        signal: r.entry.signal,
        kind: kindOf(r.entry.signal),
        entryId: r.entry.id,
        lang: r.entry.lang,
        strength: r.entry.strength,
        source: src.ref,
        start: range.start,
        end: range.end,
        text: src.text.slice(range.start, range.end),
        deobfuscated: isAlteredRange(src.norm, r.s, r.e),
        regionId: src.region.region.id,
        negated: false,
        reported: false,
      },
    });
  }
  return out;
}

function structuralTrigger(src: Source): Obs {
  return {
    src,
    nStart: 0,
    nEnd: src.norm.text.length,
    o: {
      id: '',
      signal: 'A.COPY_TRIGGER',
      kind: 'action',
      entryId: 'structural.copy_trigger',
      lang: 'any',
      strength: 'strong',
      source: src.ref,
      start: 0,
      end: src.text.length,
      text: src.text,
      deobfuscated: false,
      regionId: src.region.region.id,
      negated: false,
      reported: false,
    },
  };
}

/** Matches every source. Returns action/pretext observations and all context cue candidates. */
export function observeAll(sources: readonly Source[], negation = true): { signals: Obs[]; cues: Obs[] } {
  const signals: Obs[] = [];
  const cues: Obs[] = [];
  for (const src of sources) {
    if (src.ref.type === 'copyTrigger' && src.text.length > 0) signals.push(structuralTrigger(src));
    for (const ob of matchSource(src)) (ob.o.kind === 'context' ? cues : signals).push(ob);
  }
  if (negation) bindNegation(signals, cues);
  bindReported(signals, cues);
  return { signals, cues };
}

function cuesIn(cues: readonly Obs[], src: Source, signal: SignalId): Obs[] {
  return cues.filter((c) => c.src === src && c.o.signal === signal);
}

function bindNegation(signals: Obs[], cues: readonly Obs[]): void {
  for (const a of signals) {
    if (a.o.kind !== 'action' || a.src.ref.type !== 'block' || a.o.signal === 'A.COMMAND') continue;
    let best: Obs | undefined;
    for (const c of cuesIn(cues, a.src, 'C.NEGATION')) {
      if (c.nEnd > a.nStart || a.nStart - c.nEnd > NEGATION_MAX_GAP) continue;
      if (CLAUSE_BREAK.test(a.src.norm.text.slice(c.nEnd, a.nStart))) continue;
      if (!best || c.nEnd > best.nEnd) best = c;
    }
    if (best) {
      a.o.negated = true;
      a.boundBy = best;
    }
  }
}

function bindReported(signals: Obs[], cues: readonly Obs[]): void {
  for (const a of signals) {
    if (a.o.kind !== 'action' || a.src.ref.type !== 'block' || a.o.negated) continue;
    // Same block, same sentence, cue before the action.
    let cue = cuesIn(cues, a.src, 'C.REPORTED').find(
      (c) => c.nEnd <= a.nStart && !SENTENCE_BREAK.test(a.src.norm.text.slice(c.nEnd, a.nStart)),
    );
    // Or the nearest preceding block in the region that ends with ":" introduces a list.
    if (!cue) cue = listIntroCue(a, cues);
    if (cue) {
      a.o.reported = true;
      a.boundBy = cue;
    }
  }
}

/** The nearest earlier block (within the window) that ends with ":" introduces the list; use its reported cue. */
function listIntroCue(a: Obs, cues: readonly Obs[]): Obs | undefined {
  const region = a.src.region;
  for (let p = a.src.pos - 1; p >= 0 && a.src.pos - p < WINDOW_BLOCKS; p--) {
    const block = region.blocks[p];
    if (!block || !/:\s*$/u.test(block.text)) continue;
    return cues.find((c) => c.src.block === block && c.o.signal === 'C.REPORTED');
  }
  return undefined;
}

/** True when the action is addressed to the reader directly: not reported, not inside a quotation. */
export function isDirect(a: Obs): boolean {
  return !a.o.reported && !(a.src.block?.ctx?.quote ?? false);
}
