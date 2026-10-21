// Windowed, region-local correlation and the R1–R5 decision table (DETECTION_MODEL.md §4–§5).
import { WINDOW_BLOCKS } from './constants.js';
import { isDirect, type Obs } from './observe.js';
import type { RegionInfo } from './regions.js';
import type { ActionRisk, Classification, Level, RuleId, SignalId } from './types.js';

export interface RuleDef {
  id: RuleId;
  name: string;
  classification: Classification;
}

/** Listed in precedence order. */
export const RULES: readonly RuleDef[] = [
  { id: 'R1', name: 'VERIFICATION_EXEC_CHAIN', classification: 'manipulative_instruction' },
  { id: 'R2', name: 'VERIFICATION_DELIVERED_COMMAND', classification: 'manipulative_instruction' },
  { id: 'R3', name: 'VERIFICATION_PARTIAL_CHAIN', classification: 'suspicious_correlation' },
  { id: 'R4', name: 'PRESSURE_EXEC_CORRELATION', classification: 'suspicious_correlation' },
  { id: 'R5', name: 'OBSERVED_EXEC_INSTRUCTION', classification: 'observed_instruction' },
];

export const RULE_RANK: Readonly<Record<RuleId, number>> = { R1: 0, R2: 1, R3: 2, R4: 3, R5: 4 };

const WEAK_PRETEXTS: readonly SignalId[] = ['P.FAKE_FIX', 'P.URGENCY', 'P.AUTHORITY'];

export interface Candidate {
  rule: RuleDef;
  region: RegionInfo;
  /** Window [windowStart, windowEnd) in block positions. */
  windowStart: number;
  windowEnd: number;
  /** Action observations the rule relied on. */
  actions: Obs[];
  /** Pretext observations the rule relied on. */
  pretexts: Obs[];
  baseConfidence: Level;
  actionRisk: ActionRisk;
  weakFamilies: SignalId[];
  spanMin: number;
  spanMax: number;
}

export function readingOrder(a: Obs, b: Obs): number {
  return a.src.pos - b.src.pos || a.src.order - b.src.order || a.nStart - b.nStart;
}

const after = (x: Obs, y: Obs): boolean => readingOrder(x, y) > 0;
const of = (list: readonly Obs[], signal: SignalId): Obs[] => list.filter((o) => o.o.signal === signal);

type Match = Omit<Candidate, 'region' | 'windowStart' | 'windowEnd' | 'spanMin' | 'spanMax'>;

/** Evaluates R1–R5 on one window. `actions` must exclude negated actions. */
export function evaluateWindow(actions: readonly Obs[], pretexts: readonly Obs[]): Match | null {
  const opens = of(actions, 'A.OPEN_RUN');
  const pastes = of(actions, 'A.PASTE');
  const execs = of(actions, 'A.EXECUTE');
  const triggers = of(actions, 'A.COPY_TRIGGER');
  const strongCommands = of(actions, 'A.COMMAND').filter((o) => o.o.strength === 'strong');

  // Earliest open gives the widest choice of later steps, so checking it is sufficient.
  const open = opens[0];
  const paste = open && pastes.find((p) => after(p, open));
  const exec = paste && execs.find((e) => after(e, paste));
  const chain = open && paste && exec ? [open, paste, exec] : null;
  const second = open && [...pastes, ...execs].sort(readingOrder).find((x) => after(x, open));
  const partial = !chain && open && second ? [open, second] : null;

  const hiddenCommand = strongCommands.find((c) => c.src.ref.type === 'hiddenCopy');
  const command = hiddenCommand ?? strongCommands[0];
  const delivery = triggers[0] ?? opens[0] ?? pastes[0] ?? execs[0];
  const delivered = command && (hiddenCommand || delivery) ? [command, ...(delivery ? [delivery] : [])] : null;

  const verify = of(pretexts, 'P.HUMAN_VERIFY');
  const weak = pretexts.filter((p) => WEAK_PRETEXTS.includes(p.o.signal));
  const weakFamilies = WEAK_PRETEXTS.filter((s) => weak.some((p) => p.o.signal === s));

  const rule = (id: RuleId): RuleDef => RULES[RULE_RANK[id]] as RuleDef;

  if (chain && verify.length > 0) {
    return { rule: rule('R1'), actions: chain, pretexts: verify, baseConfidence: 'high', actionRisk: 'high', weakFamilies };
  }
  if (delivered && verify.length > 0) {
    return { rule: rule('R2'), actions: delivered, pretexts: verify, baseConfidence: 'high', actionRisk: 'high', weakFamilies };
  }
  if (partial && verify.length > 0) {
    return { rule: rule('R3'), actions: partial, pretexts: verify, baseConfidence: 'medium', actionRisk: 'medium', weakFamilies };
  }
  const execution = chain ?? delivered;
  if (execution && weakFamilies.length > 0) {
    return {
      rule: rule('R4'), actions: execution, pretexts: weak,
      baseConfidence: weakFamilies.length >= 2 ? 'medium' : 'low', actionRisk: 'high', weakFamilies,
    };
  }
  const observed = chain ?? delivered ?? partial;
  if (observed) {
    return {
      rule: rule('R5'), actions: observed, pretexts: [],
      baseConfidence: 'high', actionRisk: chain || delivered ? 'high' : 'medium', weakFamilies,
    };
  }
  return null;
}

/**
 * Slides a window of WINDOW_BLOCKS blocks over the region. Each window is evaluated twice: once with
 * direct actions only (not reported, not quoted) and once with all non-negated actions, so a reported
 * or quoted decoy cannot absorb a direct lure (the selection step keeps the strongest interpretation).
 */
export function findCandidates(region: RegionInfo, regionObs: readonly Obs[]): Candidate[] {
  if (region.unplaced) return [];
  const sorted = [...regionObs].sort(readingOrder);
  const n = region.blocks.length;
  const lastStart = Math.max(0, n - WINDOW_BLOCKS);
  const out: Candidate[] = [];
  let lo = 0;
  let hi = 0;
  for (let s = 0; s <= lastStart; s++) {
    const end = s + WINDOW_BLOCKS;
    while (lo < sorted.length && (sorted[lo] as Obs).src.pos < s - 0.5) lo++;
    while (hi < sorted.length && (sorted[hi] as Obs).src.pos < end) hi++;
    const win = sorted.slice(lo, hi);
    const actions = win.filter((o) => o.o.kind === 'action' && !o.o.negated);
    const pretexts = win.filter((o) => o.o.kind === 'pretext');
    const seen = new Set<string>();
    for (const pass of [actions.filter(isDirect), actions]) {
      const m = evaluateWindow(pass, pretexts);
      if (!m) continue;
      const evidence = [...m.actions, ...m.pretexts];
      const key = `${m.rule.id}|${evidence.map((o) => `${o.src.pos}:${o.src.order}:${o.nStart}:${o.o.signal}`).join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const positions = evidence.map((o) => o.src.pos);
      out.push({ ...m, region, windowStart: s, windowEnd: end, spanMin: Math.min(...positions), spanMax: Math.max(...positions) });
    }
  }
  return out;
}
