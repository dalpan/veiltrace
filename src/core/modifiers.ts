// Context modifiers applied to rule candidates (DETECTION_MODEL.md §6, D-020).
import { CODE_EXAMPLE_MIN_PROSE_WORDS } from './constants.js';
import type { Candidate } from './correlate.js';
import { LEXICON } from './lexicon/index.js';
import { normalize } from './normalize.js';
import type { Obs } from './observe.js';
import type { AnalyzeOptions, Block, Classification, ContextOverride, Level, ModifierId } from './types.js';

/** Override before observation ids are assigned. */
export type PendingOverride = Omit<ContextOverride, 'evidence'> & { evidence: Obs[] };

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
  overrides: PendingOverride[];
  classification: Classification;
  confidence: Level;
}

/** P2-B/C: a verification dialog is "terse" when the region has fewer words than this outside the evidence blocks. */
export const GATE_MAX_OTHER_WORDS = 25;

const words = (t: string): number => t.split(/\s+/u).filter(Boolean).length;

function blockEvidence(c: Candidate): Block[] {
  return [...new Set([...c.actions, ...c.pretexts].map((o) => o.src.block).filter((b): b is Block => !!b))];
}

/** P2-B/C condition: all evidence in a dialog/overlay, a human-verification pretext, and little other text in the region. */
function isVerificationGate(c: Candidate): boolean {
  const ev = blockEvidence(c);
  if (ev.length === 0 || !ev.every((b) => b.ctx?.dialog || b.ctx?.overlay)) return false;
  if (!c.pretexts.some((p) => p.o.signal === 'P.HUMAN_VERIFY')) return false;
  const evIds = new Set(ev.map((b) => b.id));
  const other = c.region.blocks.filter((b) => !evIds.has(b.id)).reduce((n, b) => n + words(b.text), 0);
  return other < GATE_MAX_OTHER_WORDS;
}

/** R4-β condition: single weak pretext family, evidence in an article outside dialogs/overlays, a code block in the region. */
function isProceduralDoc(c: Candidate): boolean {
  if (c.rule.id !== 'R4' || c.weakFamilies.length !== 1 || c.concealedPayloads.length > 0) return false;
  const ev = blockEvidence(c);
  if (ev.length === 0 || ev.some((b) => b.ctx?.dialog || b.ctx?.overlay || !b.ctx?.article)) return false;
  return c.region.blocks.some((b) => b.ctx?.pre || b.ctx?.code);
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

export function applyModifiers(
  c: Candidate, cues: readonly Obs[], memo: HeadingMemo, options: AnalyzeOptions = {},
): ScoredCandidate {
  const mods: PendingModifier[] = [];
  const x = options.experimental ?? {};
  const evidenceInDialog = [...c.actions, ...c.pretexts].every((o) => o.src.block?.ctx?.dialog || o.src.block?.ctx?.overlay || o.src.ref.type !== 'block');
  if (options.contextModifiers === false || (x.noDemotionInDialogs && evidenceInDialog)) {
    return { ...c, modifiers: mods, overrides: [], classification: c.rule.classification, confidence: c.baseConfidence };
  }
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

  if (x.proceduralDocModifier && isProceduralDoc(c)) {
    mods.push({
      id: 'C.PROCEDURAL', demoteBy: 1,
      reason: 'The instruction is a step in a procedural document (article with code) and its only pretext is a common troubleshooting or notice phrase.',
      evidence: [...new Set(blockEvidence(c).map((b) => `block:${b.id}`))],
    });
  }

  // M4.1 overrides: direct-instruction evidence that contradicts a quote/report/education reading.
  // C.PROCEDURAL is never overridden (it only applies outside dialogs and without concealed payloads).
  const overrides: PendingOverride[] = [];
  const contextual = mods.filter((m) => m.id !== 'C.PROCEDURAL');
  if (contextual.length > 0) {
    const suppressed = contextual.map((m) => m.id);
    if (x.concealedPayloadOverride && c.concealedPayloads.length > 0) {
      overrides.push({
        id: 'O.CONCEALED_PAYLOAD', effect: 'suppressed', suppressed, evidence: c.concealedPayloads,
        reason: 'The same part of the page places hidden text on the clipboard, which a quotation, report or tutorial would not do.',
      });
    } else if (x.verificationGateOverride && isVerificationGate(c)) {
      overrides.push({
        id: 'O.VERIFICATION_GATE', effect: x.verificationGateOverride === 'skip' ? 'suppressed' : 'capped-at-1', suppressed,
        evidence: c.pretexts.filter((p) => p.o.signal === 'P.HUMAN_VERIFY'),
        reason: 'The instruction sits in a short verification dialog addressed to the reader.',
      });
    }
  }
  const effect = overrides[0]?.effect;
  const kept = effect === 'suppressed' ? mods.filter((m) => m.id === 'C.PROCEDURAL') : mods;
  const total = kept.reduce((sum, m) => sum + m.demoteBy, 0);
  const demotion = Math.min(effect === 'capped-at-1' ? 1 : MAX_TOTAL_DEMOTION, total);
  const tier = TIERS.indexOf(c.rule.classification);
  const level = LEVELS.indexOf(c.baseConfidence);
  // Each modifier and each override lowers confidence: they are signs of ambiguity.
  return {
    ...c,
    modifiers: kept,
    overrides,
    classification: TIERS[Math.max(0, tier - demotion)] as Classification,
    confidence: LEVELS[Math.max(0, level - kept.length - overrides.length)] as Level,
  };
}
