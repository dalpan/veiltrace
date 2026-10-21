// Context modifiers applied to rule candidates (DETECTION_MODEL.md §6, D-020).
import { CODE_EXAMPLE_MIN_PROSE_WORDS } from './constants.js';
import type { Candidate } from './correlate.js';
import { LEXICON } from './lexicon/index.js';
import { normalize } from './normalize.js';
import type { Obs } from './observe.js';
import type { Block, Classification, Level, ModifierId } from './types.js';

export const TIERS: readonly Classification[] = ['observed_instruction', 'suspicious_correlation', 'manipulative_instruction'];
const LEVELS: readonly Level[] = ['low', 'medium', 'high'];
const MAX_TOTAL_DEMOTION = 2;

const EDUCATIONAL = LEXICON.filter((e) => e.signal === 'C.EDUCATIONAL');

/** Evidence entries are observations (resolved to ids later) or literal references such as "heading:b3". */
export interface PendingModifier {
  id: ModifierId;
  demoteBy: 1 | 2;
  reason: string;
  evidence: Array<Obs | string>;
}

export interface ScoredCandidate extends Candidate {
  modifiers: PendingModifier[];
  classification: Classification;
  confidence: Level;
}

function isCodeBlock(b: Block | undefined): boolean {
  return Boolean(b?.ctx && (b.ctx.code || b.ctx.pre) && b.ctx.article);
}

/** Per-analysis memo of heading → educational? (headings repeat across many blocks). */
export type HeadingMemo = Map<string, boolean>;

function headingIsEducational(heading: string, memo: HeadingMemo): boolean {
  let hit = memo.get(heading);
  if (hit === undefined) {
    const text = normalize(heading).text;
    hit = EDUCATIONAL.some((e) => {
      e.pattern.lastIndex = 0;
      const ok = e.pattern.test(text);
      e.pattern.lastIndex = 0;
      return ok;
    });
    memo.set(heading, hit);
  }
  return hit;
}

function proseWords(blocks: readonly Block[]): number {
  let words = 0;
  for (const b of blocks) if (!(b.ctx?.code || b.ctx?.pre)) words += b.text.split(/\s+/u).filter(Boolean).length;
  return words;
}

export function applyModifiers(c: Candidate, cues: readonly Obs[], memo: HeadingMemo): ScoredCandidate {
  const mods: PendingModifier[] = [];
  const blockActions = c.actions.filter((a) => a.src.ref.type === 'block');

  const quoted = blockActions.filter((a) => a.src.block?.ctx?.quote);
  if (blockActions.length > 0 && quoted.length * 2 >= blockActions.length) {
    mods.push({ id: 'C.QUOTED', demoteBy: 2, reason: 'The instruction is inside a quotation.', evidence: quoted });
  }

  const reported = c.actions.filter((a) => a.o.reported);
  if (reported.length > 0) {
    const cueObs = reported.map((a) => a.boundBy).filter((x): x is Obs => x !== undefined);
    mods.push({
      id: 'C.REPORTED', demoteBy: 2,
      reason: 'The text reports what someone else was told to do rather than instructing the reader.',
      evidence: [...new Set(cueObs)],
    });
  }

  const eduCues = cues.filter(
    (k) => k.o.signal === 'C.EDUCATIONAL' && k.src.region === c.region && k.src.pos >= c.windowStart && k.src.pos < c.windowEnd,
  );
  const evidenceBlocks = [...new Set([...c.actions, ...c.pretexts].map((o) => o.src.block).filter((b): b is Block => !!b))];
  const eduHeadings = evidenceBlocks.filter((b) => b.headingContext && headingIsEducational(b.headingContext, memo));
  if (eduCues.length > 0 || eduHeadings.length > 0) {
    mods.push({
      id: 'C.EDUCATIONAL', demoteBy: 1, reason: 'The surrounding text is educational or awareness material.',
      evidence: [...eduCues, ...eduHeadings.map((b) => `heading:${b.id}`)],
    });
  }

  const codeExample =
    blockActions.length > 0 &&
    c.actions.every((a) => a.src.ref.type === 'copyTrigger' || (a.src.ref.type === 'block' && isCodeBlock(a.src.block))) &&
    proseWords(c.region.blocks) >= CODE_EXAMPLE_MIN_PROSE_WORDS;
  if (codeExample) {
    mods.push({
      id: 'C.CODE_EXAMPLE', demoteBy: 1, reason: 'The instruction is a code example inside an article with explanatory prose.',
      evidence: [...new Set(blockActions.map((a) => `block:${a.src.block?.id ?? ''}`))],
    });
  }

  const demotion = Math.min(MAX_TOTAL_DEMOTION, mods.reduce((sum, m) => sum + m.demoteBy, 0));
  const tier = TIERS.indexOf(c.rule.classification);
  const level = LEVELS.indexOf(c.baseConfidence);
  return {
    ...c,
    modifiers: mods,
    classification: TIERS[Math.max(0, tier - demotion)] as Classification,
    confidence: LEVELS[Math.max(0, level - mods.length)] as Level,
  };
}
