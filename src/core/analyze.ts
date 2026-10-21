// Entry point: PageSnapshot → AnalysisResult. Pure and deterministic; never reads url or title.
import { ENGINE_VERSION, ENGINE_VERSION_M1, ENGINE_VERSION_M41, MAX_AUX_CHARS, MAX_AUX_SOURCES, MAX_BLOCK_CHARS, MAX_BLOCKS } from './constants.js';
import { findCandidates, RULE_RANK, readingOrder, type Candidate } from './correlate.js';
import { applyModifiers, TIERS, type HeadingMemo, type ScoredCandidate } from './modifiers.js';
import { normalize } from './normalize.js';
import { observeAll, type Obs, type Source } from './observe.js';
import { buildRegions, unplacedRegion, type RegionInfo } from './regions.js';
import type { AnalysisResult, AnalyzeOptions, AppliedModifier, Finding, PageSnapshot, SourceRef, Verdict } from './types.js';

function validate(s: PageSnapshot): void {
  if (s.schemaVersion !== 1) throw new Error(`Unsupported PageSnapshot schemaVersion: ${String(s.schemaVersion)}`);
  const seen = new Set<string>();
  const check = (kind: string, id: string): void => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) throw new Error(`Duplicate ${kind} id in PageSnapshot: ${id}`);
    seen.add(key);
  };
  for (const b of s.blocks) check('block', b.id);
  for (const h of s.hiddenCopyCandidates) check('hiddenCopy', h.id);
  for (const t of s.copyTriggers) check('copyTrigger', t.id);
}

interface Placement {
  region: RegionInfo;
  pos: number;
}

function buildSources(s: PageSnapshot, regions: RegionInfo[]): { sources: Source[]; truncated: boolean } {
  let truncated = s.blocks.length > MAX_BLOCKS;
  const clip = (text: string, max: number): string => {
    if (text.length <= max) return text;
    truncated = true;
    return text.slice(0, max);
  };

  const blockPlacement = new Map<string, Placement>();
  for (const r of regions) r.blocks.forEach((b, i) => blockPlacement.set(b.id, { region: r, pos: i }));
  const firstRegionOf = new Map<string, RegionInfo>();
  for (const r of regions) if (!firstRegionOf.has(r.region.containerId)) firstRegionOf.set(r.region.containerId, r);

  const place = (containerId: string, afterBlockId: string | undefined): Placement => {
    const anchor = afterBlockId === undefined ? undefined : blockPlacement.get(afterBlockId);
    if (anchor) return { region: anchor.region, pos: anchor.pos + 0.5 };
    let region = firstRegionOf.get(containerId);
    if (!region) {
      region = unplacedRegion(containerId, regions.length);
      regions.push(region);
      firstRegionOf.set(containerId, region);
    }
    return { region, pos: -0.5 };
  };

  const sources: Source[] = [];
  for (const r of regions.slice()) {
    r.blocks.forEach((b, i) => {
      const text = clip(b.text, MAX_BLOCK_CHARS);
      sources.push({ ref: { type: 'block', blockId: b.id }, text, norm: normalize(text), region: r, pos: i, order: 0, block: b });
    });
  }
  if (s.hiddenCopyCandidates.length > MAX_AUX_SOURCES || s.copyTriggers.length > MAX_AUX_SOURCES) truncated = true;
  s.hiddenCopyCandidates.slice(0, MAX_AUX_SOURCES).forEach((h, i) => {
    const text = clip(h.text, MAX_AUX_CHARS);
    const p = place(h.containerId, h.afterBlockId);
    sources.push({ ref: { type: 'hiddenCopy', candidateId: h.id }, text, norm: normalize(text), region: p.region, pos: p.pos, order: 1 + i });
  });
  s.copyTriggers.slice(0, MAX_AUX_SOURCES).forEach((t, i) => {
    const text = clip(t.label, MAX_AUX_CHARS);
    const p = place(t.containerId, t.afterBlockId);
    sources.push({ ref: { type: 'copyTrigger', triggerId: t.id }, text, norm: normalize(text), region: p.region, pos: p.pos, order: 1 + MAX_AUX_SOURCES + i });
  });
  return { sources, truncated };
}

function overlaps(a: ScoredCandidate, b: ScoredCandidate): boolean {
  return a.region === b.region && a.spanMin <= b.spanMax && b.spanMin <= a.spanMax;
}

/** Highest final classification first, then rule precedence, then earliest evidence. Overlapping candidates are dropped. */
function select(cands: ScoredCandidate[]): ScoredCandidate[] {
  const ranked = [...cands].sort(
    (a, b) =>
      TIERS.indexOf(b.classification) - TIERS.indexOf(a.classification) ||
      RULE_RANK[a.rule.id] - RULE_RANK[b.rule.id] ||
      a.region.index - b.region.index ||
      a.spanMin - b.spanMin ||
      a.windowStart - b.windowStart,
  );
  const chosen: ScoredCandidate[] = [];
  for (const c of ranked) if (!chosen.some((k) => overlaps(k, c))) chosen.push(c);
  return chosen.sort((a, b) => a.region.index - b.region.index || a.spanMin - b.spanMin || RULE_RANK[a.rule.id] - RULE_RANK[b.rule.id]);
}

function blockIdAt(c: Candidate, pos: number): string {
  const i = Math.min(c.region.blocks.length - 1, Math.max(0, Math.floor(pos)));
  return c.region.blocks[i]?.id ?? '';
}

const SUMMARY: Record<string, string> = {
  R1: 'This region tells the reader to open a command surface, paste and execute, presented as a human-verification step.',
  R2: 'This region delivers an executable command to the reader, presented as a human-verification step.',
  R3: 'This region contains part of an open-paste-execute sequence, presented as a human-verification step.',
  R4: 'This region tells the reader to execute code and uses a pressure or problem-fixing pretext',
  R5: 'This region contains an instruction to execute code. No manipulation pretext was found in the same region.',
};

function summarize(c: ScoredCandidate): string {
  let text = SUMMARY[c.rule.id] as string;
  if (c.rule.id === 'R4') text += ` (${c.weakFamilies.map((f) => f.slice(2).toLowerCase()).join(', ')}).`;
  if (c.modifiers.length > 0) text += ` Context: ${c.modifiers.map((m) => m.reason).join(' ')}`;
  if (c.overrides.length > 0) text += ` Not lowered: ${c.overrides.map((o) => o.reason).join(' ')}`;
  return text;
}

function refKey(r: SourceRef): string {
  return r.type === 'block' ? `b:${r.blockId}` : r.type === 'hiddenCopy' ? `h:${r.candidateId}` : `t:${r.triggerId}`;
}

/** The M4.1 rule set approved at M4.1 (D-041) and adopted as the production default in M4.3A (D-055). */
export const M41_RULESET: NonNullable<AnalyzeOptions['experimental']> = {
  r4AuthorityOnlyUnlessConcealed: true,
  concealedPayloadOverride: true,
  proceduralDocModifier: true,
};

/** The m5 rule set (engine 0.3.0, D-083), the production default. */
export const M5_RULESET: NonNullable<AnalyzeOptions['experimental']> = {
  ...M41_RULESET,
  ownVoiceGateOverride: true,
  proceduralDialogs: true,
};

function resolveOptions(options: AnalyzeOptions): AnalyzeOptions {
  if (options.ruleset === 'm1') return options;
  const base = options.ruleset === 'm4.1' || options.ruleset === 'm4.1-rc1' ? M41_RULESET : M5_RULESET;
  return { ...options, experimental: { ...base, ...options.experimental } };
}

/** Strong-command observations in hidden-copy sources whose payload text is not visible anywhere on the page. */
function concealedPayloads(sources: readonly Source[], signals: readonly Obs[]): Set<Obs> {
  const visible = sources.filter((s) => s.ref.type === 'block').map((s) => s.norm.text).join('\n');
  const out = new Set<Obs>();
  for (const o of signals) {
    if (o.src.ref.type !== 'hiddenCopy' || o.o.signal !== 'A.COMMAND' || o.o.strength !== 'strong') continue;
    const payload = o.src.norm.text.trim();
    if (payload && !visible.includes(payload)) out.add(o);
  }
  return out;
}

export function analyze(snapshot: PageSnapshot, rawOptions: AnalyzeOptions = {}): AnalysisResult {
  validate(snapshot);
  const options = resolveOptions(rawOptions);
  const x = options.experimental ?? {};
  const regions = buildRegions(snapshot.blocks.slice(0, MAX_BLOCKS));
  const { sources, truncated } = buildSources(snapshot, regions);
  const { signals, cues } = observeAll(sources, options.negation !== false, x.reportedListIntroOutsideDialogsOnly === true);
  const concealed = concealedPayloads(sources, signals);

  const byRegion = new Map<RegionInfo, Obs[]>();
  for (const o of signals) {
    const list = byRegion.get(o.src.region) ?? [];
    list.push(o);
    byRegion.set(o.src.region, list);
  }

  const memo: HeadingMemo = new Map();
  const scored: ScoredCandidate[] = [];
  for (const r of regions) {
    for (const c of findCandidates(r, byRegion.get(r) ?? [], options, concealed)) scored.push(applyModifiers(c, cues, memo, options));
  }
  const selected = select(scored);

  // Output observations: all action/pretext observations plus context cues that bound an action or a selected modifier.
  const usedCues = new Set<Obs>();
  for (const o of signals) if (o.boundBy) usedCues.add(o.boundBy);
  for (const c of selected) for (const m of c.modifiers) for (const e of m.evidence) if (typeof e !== 'string') usedCues.add(e);
  const outObs = [...signals, ...[...usedCues].filter((c) => c.o.kind === 'context')]
    .filter((o, i, arr) => arr.indexOf(o) === i)
    .sort((a, b) => a.src.region.index - b.src.region.index || readingOrder(a, b) || a.o.signal.localeCompare(b.o.signal) || refKey(a.o.source).localeCompare(refKey(b.o.source)));
  const idOf = new Map<Obs, string>();
  outObs.forEach((o, i) => idOf.set(o, `o${i}`));

  const findings: Finding[] = selected.map((c, i) => ({
    id: `f${i}`,
    ruleId: c.rule.id,
    ruleName: c.rule.name,
    classification: c.classification,
    ruleClassification: c.rule.classification,
    confidence: c.confidence,
    actionRisk: c.actionRisk,
    regionId: c.region.region.id,
    span: { firstBlockId: blockIdAt(c, c.spanMin), lastBlockId: blockIdAt(c, c.spanMax) },
    observationIds: [...c.actions, ...c.pretexts].sort(readingOrder).map((o) => idOf.get(o) as string),
    modifiers: c.modifiers.map((m): AppliedModifier => ({
      id: m.id,
      demoteBy: m.demoteBy,
      reason: m.reason,
      evidence: m.evidence.map((e) => (typeof e === 'string' ? e : (idOf.get(e) as string))),
    })),
    ...(c.overrides.length > 0 ? { overrides: c.overrides.map((o) => ({ ...o, evidence: o.evidence.map((e) => idOf.get(e) as string) })) } : {}),
    summary: summarize(c),
  }));

  let verdict: Verdict = 'none';
  for (const f of findings) if (verdict === 'none' || TIERS.indexOf(f.classification) > TIERS.indexOf(verdict)) verdict = f.classification;

  return {
    engineVersion: options.ruleset === 'm1' ? ENGINE_VERSION_M1 : options.ruleset === 'm4.1' || options.ruleset === 'm4.1-rc1' ? ENGINE_VERSION_M41 : ENGINE_VERSION,
    schemaVersion: 1,
    verdict,
    findings,
    observations: outObs.map((o) => ({ ...o.o, id: idOf.get(o) as string })),
    regions: regions.map((r) => r.region),
    coverage: { ...snapshot.coverage, coreTruncated: truncated },
  };
}
