// EXPERIMENTAL payment-manipulation detector (M5.2): PageSnapshot → PaymentResult. Pure and deterministic.
// It reads block text only: never url, title or form fields, so it never sees card numbers, balances typed by the user or
// any input value. Amount values are matched but never reported. It never changes the ClickFix or credential results.
// Decision table: docs/DETECTION_MODEL.md §13.
import { MAX_BLOCK_CHARS, MAX_BLOCKS, NEGATION_MAX_GAP, WINDOW_BLOCKS } from '../constants.js';
import { LEXICON } from '../lexicon/index.js';
import { normalize, toOriginalRange, type NormalizedText } from '../normalize.js';
import { buildRegions, type RegionInfo } from '../regions.js';
import type { Block, Classification, Level, PageSnapshot, Verdict } from '../types.js';
import { PAY_LEXICON } from './lexicon.js';
import type {
  PayDestination, PayFinding, PayLimitation, PayModifier, PayObservation, PayPressure, PayPromise, PayRuleId, PaySignalId, PaySignalKind,
  PaymentResult, PayTrustContext,
} from './types.js';

export const PAY_DETECTOR_VERSION = 'pay-0.8.0-exp';

/** Same clause and sentence breaks as the ClickFix binding, except that a period inside a number ("Rp 150.000") is not a break. */
const CLAUSE_BREAK = /[,;:!?]|\.(?=\s|$)|(?<![\p{L}\p{N}_])(?:and|then|or|but|dan|lalu|kemudian|atau|tapi|tetapi)(?![\p{L}\p{N}_])/u;
const SENTENCE_BREAK = /[!?]|\.(?=\s|$)/u;

const TIERS: readonly Classification[] = ['observed_instruction', 'suspicious_correlation', 'manipulative_instruction'];
const LEVELS: readonly Level[] = ['low', 'medium', 'high'];
const EDUCATIONAL = LEXICON.filter((e) => e.signal === 'C.EDUCATIONAL');

const DESTINATION_OF: Partial<Record<PaySignalId, PayDestination>> = {
  'PD.PERSONAL': 'personal-account', 'PD.OFF_PLATFORM': 'off-platform', 'PD.GIFT_CARD': 'gift-card', 'PD.CRYPTO': 'crypto',
};
const PROMISE_OF: Partial<Record<PaySignalId, PayPromise>> = {
  'PR.REFUND': 'refund', 'PR.PRIZE': 'prize', 'PR.UNLOCK': 'account-unlock', 'PF.RELEASE_FEE': 'release', 'PR.RECRUIT': 'recruitment', 'PR.JOB': 'job', 'PR.INVEST': 'investment-return', 'PR.LOAN': 'loan',
};
const PRESSURE_OF: Partial<Record<PaySignalId, PayPressure>> = { 'PP.THREAT': 'threat', 'PP.URGENCY': 'urgency', 'PP.AUTHORITY': 'claimed-authority', 'PP.FAMILY': 'claimed-family' };
/** Reporting order of the finding's lists (deterministic, independent of where the evidence sits on the page). */
const ORDER: readonly string[] = ['refund', 'prize', 'account-unlock', 'release', 'recruitment', 'job', 'investment-return', 'loan', 'personal-account', 'off-platform', 'gift-card', 'crypto', 'claimed-authority', 'claimed-family', 'threat', 'urgency'];
const ordered = <T extends string>(xs: Iterable<T>): T[] => [...new Set(xs)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

/** Highest classification each rule can produce; the actual one depends on the pressure found (DETECTION_MODEL.md §13). */
export const PAY_RULES: Readonly<Record<PayRuleId, { name: string; classification: Classification }>> = {
  PR1: { name: 'ADVANCE_FEE_TO_RECEIVE', classification: 'manipulative_instruction' },
  PR2: { name: 'OFF_CHANNEL_PAYMENT', classification: 'manipulative_instruction' },
  PR3: { name: 'PAYMENT_UNDER_THREAT', classification: 'manipulative_instruction' },
  PR4: { name: 'OBSERVED_PAYMENT_REQUEST', classification: 'observed_instruction' },
};

const SUMMARY: Record<PayRuleId, string> = {
  PR1: 'This part of the page asks the reader to pay first in order to receive something (a refund, a prize, released funds or an unlocked account). Legitimate refunds and prizes do not require an upfront payment.',
  PR2: 'This part of the page asks the reader to pay outside an ordinary checkout: to a personal account, off the platform, with gift cards or with cryptocurrency, together with pressure.',
  PR3: 'This part of the page asks for a payment together with a threat (account closure, arrest or legal action) and urgency or a claimed authority.',
  PR4: 'A request to pay was found with no manipulation signs nearby (for example, a checkout, an invoice or a donation).',
};

interface Src {
  block: Block;
  text: string;
  norm: NormalizedText;
  region: RegionInfo;
  pos: number;
}

interface Ob {
  o: PayObservation;
  src: Src;
  nStart: number;
  nEnd: number;
  boundBy?: Ob;
}

/** One payment request: the block that asks for money and the evidence tied to it. */
interface Unit {
  src: Src;
  anchors: Ob[];
  objects: Ob[];
  destinations: Ob[];
  conditions: Ob[];
}

function kindOfSignal(s: PaySignalId): PaySignalKind {
  if (s === 'PY.PAY') return 'request';
  if (s.startsWith('PA.') || s.startsWith('PF.')) return 'object';
  if (s.startsWith('PD.')) return 'destination';
  if (s.startsWith('PR.') || s.startsWith('PC.')) return 'receive';
  if (s.startsWith('PP.')) return 'pressure';
  return 'context';
}

/** Page text of an observation: amounts are never reported, and long digit runs (account or card numbers) are masked. */
function reportedText(signal: PaySignalId, text: string): string {
  // Grouped numbers ("0813 0000 2222") are masked as a whole, like long digit runs.
  return signal === 'PA.AMOUNT' ? '' : text.replace(/\d(?:[\d\s-]{7,}\d)|\d{5,}/gu, (d) => d.replace(/\d/gu, '•'));
}

function match(src: Src): Ob[] {
  const raw: Array<{ id: string; signal: PaySignalId; strong: boolean; s: number; e: number }> = [];
  for (const entry of PAY_LEXICON) {
    for (const m of src.norm.text.matchAll(entry.pattern)) {
      if (m[0].length > 0) raw.push({ id: entry.id, signal: entry.signal, strong: entry.strength === 'strong', s: m.index, e: m.index + m[0].length });
    }
  }
  raw.sort((a, b) => Number(b.strong) - Number(a.strong) || a.s - b.s || b.e - a.e || a.id.localeCompare(b.id));
  const kept = new Map<PaySignalId, Array<[number, number]>>();
  const out: Ob[] = [];
  for (const r of raw) {
    const spans = kept.get(r.signal) ?? [];
    if (spans.some(([s, e]) => r.s < e && s < r.e)) continue;
    spans.push([r.s, r.e]);
    kept.set(r.signal, spans);
    const range = toOriginalRange(src.norm, r.s, r.e);
    out.push({
      src, nStart: r.s, nEnd: r.e,
      o: {
        id: '', signal: r.signal, kind: kindOfSignal(r.signal), entryId: r.id, blockId: src.block.id, start: range.start, end: range.end,
        text: reportedText(r.signal, src.text.slice(range.start, range.end)), regionId: src.region.region.id, negated: false, reported: false,
      },
    });
  }
  return out;
}

/** Binds negation ("never pay", "jangan transfer") and reported speech ("scammers ask victims to pay") to request anchors. */
function bindContext(anchors: Ob[], cues: Ob[]): void {
  for (const d of anchors) {
    const sameSrc = cues.filter((c) => c.src === d.src);
    const neg = sameSrc.filter((c) => c.o.signal === 'C.NEGATION' && c.nEnd <= d.nStart && d.nStart - c.nEnd <= NEGATION_MAX_GAP
      && !CLAUSE_BREAK.test(d.src.norm.text.slice(c.nEnd, d.nStart)));
    if (neg.length > 0) {
      d.o.negated = true;
      d.boundBy = neg[neg.length - 1];
      continue;
    }
    let rep = sameSrc.find((c) => c.o.signal === 'C.REPORTED' && c.nEnd <= d.nStart && !SENTENCE_BREAK.test(d.src.norm.text.slice(c.nEnd, d.nStart)));
    if (!rep) {
      // A list introduced by a reported-speech line ending with ":" ("Scammers ask victims to:").
      const region = d.src.region;
      for (let p = d.src.pos - 1; p >= 0 && d.src.pos - p < WINDOW_BLOCKS; p--) {
        const block = region.blocks[p];
        if (!block || !/:\s*$/u.test(block.text)) continue;
        rep = cues.find((c) => c.src.block === block && c.o.signal === 'C.REPORTED');
        break;
      }
    }
    if (rep) {
      d.o.reported = true;
      d.boundBy = rep;
    }
  }
}

/**
 * A request is a block with a non-negated pay verb and something to pay (an amount, a fee or a destination) in the same
 * block or the block just before it ("Your refund is on hold. A release fee of Rp 250.000 applies." / "Transfer it now."),
 * or a release fee stated with an amount. One unit per block.
 */
function requestUnits(sources: readonly Src[], signals: readonly Ob[]): Unit[] {
  const units: Unit[] = [];
  for (const src of sources) {
    const here = signals.filter((s) => s.src === src);
    const prev = signals.filter((s) => s.src.region === src.region && s.src.pos === src.pos - 1);
    const pays = here.filter((s) => s.o.signal === 'PY.PAY' && !s.o.negated);
    const releaseFees = here.filter((s) => s.o.signal === 'PF.RELEASE_FEE' && !s.o.negated);
    const isObj = (s: Ob): boolean => s.o.kind === 'object' || s.o.kind === 'destination';
    let objects = here.filter(isObj);
    if (pays.length > 0 && objects.length === 0) objects = prev.filter(isObj);
    const amountHere = here.some((s) => s.o.signal === 'PA.AMOUNT');
    const anchors = pays.length > 0 && objects.length > 0 ? pays : releaseFees.length > 0 && amountHere ? releaseFees : [];
    if (anchors.length === 0) continue;
    units.push({
      src, anchors, objects: objects.filter((s) => s.o.kind === 'object'),
      destinations: [...objects, ...here].filter((s, i, a) => s.o.kind === 'destination' && a.indexOf(s) === i),
      conditions: here.filter((s) => s.o.signal === 'PC.CONDITION'),
    });
  }
  return units;
}

function containerKind(src: Src): string {
  const id = src.block.containerId;
  return id.slice(0, id.indexOf(':') + 1);
}

function trustOf(src: Src): PayTrustContext[] {
  const ctx = src.block.ctx ?? {};
  const kind = containerKind(src);
  const out: PayTrustContext[] = [];
  if (kind === 'ugc:' || ctx.ugc) out.push('user-content');
  if (kind === 'widget:') out.push('third-party-widget');
  if (kind === 'frame:') out.push('embedded-frame');
  if (kind === 'dialog:' || ctx.dialog) out.push('dialog');
  if (kind === 'overlay:' || ctx.overlay) out.push('overlay');
  if (ctx.form) out.push('form');
  return out;
}

const UNTRUSTED: readonly PayTrustContext[] = ['user-content', 'third-party-widget', 'embedded-frame'];

const near = (src: Src, u: Unit): boolean => src.region === u.src.region && Math.abs(src.pos - u.src.pos) < WINDOW_BLOCKS;
const inQuoteOrCode = (src: Src): boolean => Boolean(src.block.ctx?.quote || src.block.ctx?.code || src.block.ctx?.pre);

function headingEducational(heading: string | null | undefined): boolean {
  if (!heading) return false;
  const text = normalize(heading).text;
  return EDUCATIONAL.some((e) => [...text.matchAll(e.pattern)].length > 0);
}

interface Scored {
  units: Unit[];
  region: RegionInfo;
  ruleId: PayRuleId;
  ruleClassification: Classification;
  classification: Classification;
  confidence: Level;
  /** Pressure and receive signals that the decision used. */
  context: Ob[];
  promises: PayPromise[];
  destinations: PayDestination[];
  pressures: PayPressure[];
  modifiers: Array<Omit<PayModifier, 'evidence'> & { evidence: Array<Ob | string> }>;
}

const RULE_RANK: Readonly<Record<PayRuleId, number>> = { PR1: 0, PR2: 1, PR3: 2, PR4: 3 };

function scoreOne(u: Unit, region: RegionInfo, signals: readonly Ob[], cues: readonly Ob[]): Scored {
  // Pretexts count when near the request and addressed to the reader: inside a quotation or code sample, only in the same block.
  const nearby = signals.filter((p) => (p.o.kind === 'pressure' || p.o.kind === 'receive') && p.o.signal !== 'PC.CONDITION'
    && near(p.src, u) && (!inQuoteOrCode(p.src) || p.src === u.src));
  const has = (sig: PaySignalId): boolean => nearby.some((p) => p.o.signal === sig);
  const threat = has('PP.THREAT');
  const urgency = has('PP.URGENCY');
  // A claimed family member on a new number weighs like a claimed authority: both borrow trust the sender cannot prove.
  const authority = has('PP.AUTHORITY') || has('PP.FAMILY');
  // Urgency plus a claimed authority without a threat counts only when the claim is made by the request itself (its own block);
  // a "contact customer service" footer near an ordinary "pay within 24 hours" checkout does not.
  const authorityHere = nearby.some((p) => p.o.signal === 'PP.AUTHORITY' && p.src === u.src);
  const untrusted = trustOf(u.src).some((t) => UNTRUSTED.includes(t));
  const releaseFees = u.objects.filter((o) => o.o.signal === 'PF.RELEASE_FEE');
  const receive = nearby.filter((p) => p.o.kind === 'receive');
  const destinations = ordered(u.destinations.map((d) => DESTINATION_OF[d.o.signal] as PayDestination));

  // PR1: pay first to receive. A fee whose purpose is a release, or a promised refund/prize/unlock tied to the payment by a clause.
  // A paid guarantee of selection (recruitment, admission) is pay-to-receive by itself, like a release fee.
  const recruit = receive.filter((p) => p.o.signal === 'PR.RECRUIT');
  // A guaranteed or fixed return (a percentage per day or week, "dijamin berlipat") is never real for an investment: paying in
  // for it is pay-to-receive by itself (D-102).
  const invest = receive.filter((p) => p.o.signal === 'PR.INVEST');
  const advanceFee = releaseFees.length > 0 || recruit.length > 0 || invest.length > 0 || (receive.length > 0 && u.conditions.length > 0);
  const extras = [authority, threat, urgency, destinations.length > 0, untrusted].filter(Boolean).length;

  let ruleId: PayRuleId;
  let cls: Classification;
  let base: Level;
  const used: Ob[] = [];
  if (advanceFee) {
    ruleId = 'PR1';
    [cls, base] = extras > 0 ? ['manipulative_instruction', 'high'] : ['suspicious_correlation', 'medium'];
    used.push(...receive, ...u.conditions, ...nearby.filter((p) => p.o.kind === 'pressure'));
  } else if (destinations.length > 0 && (authority || threat)) {
    [ruleId, cls, base] = ['PR2', 'manipulative_instruction', 'high'];
    used.push(...nearby.filter((p) => p.o.kind === 'pressure'));
  } else if (destinations.length > 0 && (urgency || untrusted || destinations.includes('off-platform'))) {
    [ruleId, cls, base] = ['PR2', 'suspicious_correlation', 'medium'];
    used.push(...nearby.filter((p) => p.o.kind === 'pressure'));
  } else if (threat && (authority || urgency)) {
    ruleId = 'PR3';
    [cls, base] = authority && urgency ? ['manipulative_instruction', 'high'] : ['suspicious_correlation', 'medium'];
    used.push(...nearby.filter((p) => p.o.kind === 'pressure'));
  } else if (threat && untrusted) {
    // A payment demanded under a threat in a message or post from someone else (extortion, "pay or the parcel is returned").
    [ruleId, cls, base] = ['PR3', 'suspicious_correlation', 'medium'];
    used.push(...nearby.filter((p) => p.o.kind === 'pressure'));
  } else if (authorityHere && urgency) {
    [ruleId, cls, base] = ['PR3', 'suspicious_correlation', 'medium'];
    used.push(...nearby.filter((p) => p.o.kind === 'pressure'));
  } else {
    [ruleId, cls, base] = ['PR4', 'observed_instruction', 'high'];
  }

  const anchor = u.anchors[0] as Ob;
  const mods: Scored['modifiers'] = [];
  if (u.src.block.ctx?.quote) mods.push({ id: 'C.QUOTED', demoteBy: 2, reason: 'The request is inside a quotation.', evidence: [anchor] });
  const reported = u.anchors.find((a) => a.o.reported);
  if (reported) {
    mods.push({ id: 'C.REPORTED', demoteBy: 2, reason: 'The text reports what someone else was asked to do rather than asking the reader.',
      evidence: reported.boundBy ? [reported.boundBy] : [] });
  }
  if (u.src.block.ctx?.code || u.src.block.ctx?.pre) {
    mods.push({ id: 'C.CODE_EXAMPLE', demoteBy: 2, reason: 'The request text is inside a code sample.', evidence: [`block:${u.src.block.id}`] });
  }
  const eduCues = cues.filter((c) => c.o.signal === 'C.EDUCATIONAL' && near(c.src, u));
  const eduHeading = headingEducational(u.src.block.headingContext) ? [`heading:${u.src.block.id}`] : [];
  if (eduCues.length > 0 || eduHeading.length > 0) {
    mods.push({ id: 'C.EDUCATIONAL', demoteBy: 1, reason: 'The surrounding text is educational or awareness material.', evidence: [...eduCues, ...eduHeading] });
  }
  const demotion = Math.min(2, mods.reduce((n, m) => n + m.demoteBy, 0));
  const context = [...new Set(used)];
  return {
    units: [u], region, ruleId, ruleClassification: cls, modifiers: mods, context,
    classification: TIERS[Math.max(0, TIERS.indexOf(cls) - demotion)] as Classification,
    confidence: LEVELS[Math.max(0, LEVELS.indexOf(base) - mods.length)] as Level,
    promises: ruleId === 'PR1' ? ordered([...releaseFees, ...receive].map((o) => PROMISE_OF[o.o.signal] as PayPromise)) : [],
    destinations,
    pressures: ordered(context.flatMap((o) => (PRESSURE_OF[o.o.signal] ? [PRESSURE_OF[o.o.signal] as PayPressure] : []))),
  };
}

/** A cluster's finding is its strongest request; the evidence of all its requests is kept. */
function score(units: Unit[], region: RegionInfo, signals: readonly Ob[], cues: readonly Ob[]): Scored {
  const scored = units.map((u) => scoreOne(u, region, signals, cues));
  const best = [...scored].sort((a, b) => TIERS.indexOf(b.classification) - TIERS.indexOf(a.classification) || RULE_RANK[a.ruleId] - RULE_RANK[b.ruleId])[0] as Scored;
  return { ...best, units };
}

function cluster(units: Unit[]): Array<{ region: RegionInfo; units: Unit[] }> {
  const sorted = [...units].sort((a, b) => a.src.region.index - b.src.region.index || a.src.pos - b.src.pos);
  const out: Array<{ region: RegionInfo; units: Unit[] }> = [];
  for (const u of sorted) {
    const last = out[out.length - 1];
    if (last && last.region === u.src.region && u.src.pos - (last.units[0] as Unit).src.pos < WINDOW_BLOCKS) last.units.push(u);
    else out.push({ region: u.src.region, units: [u] });
  }
  return out;
}

export function analyzePayments(snapshot: PageSnapshot): PaymentResult {
  const regions = buildRegions(snapshot.blocks.slice(0, MAX_BLOCKS));
  const sources: Src[] = regions.flatMap((r) => r.blocks.map((b, i) => {
    const text = b.text.slice(0, MAX_BLOCK_CHARS);
    return { block: b, text, norm: normalize(text), region: r, pos: i };
  }));
  const signals: Ob[] = [];
  const cues: Ob[] = [];
  for (const src of sources) for (const ob of match(src)) (ob.o.kind === 'context' ? cues : signals).push(ob);
  bindContext(signals.filter((s) => s.o.signal === 'PY.PAY' || s.o.signal === 'PF.RELEASE_FEE'), cues);

  const scored = cluster(requestUnits(sources, signals)).map((c) => score(c.units, c.region, signals, cues));

  const used = new Set<Ob>();
  for (const s of scored) {
    for (const u of s.units) for (const o of [...u.anchors, ...u.objects, ...u.destinations, ...u.conditions]) used.add(o);
    for (const o of s.context) used.add(o);
    for (const m of s.modifiers) for (const e of m.evidence) if (typeof e !== 'string') used.add(e);
  }
  const sortedObs = [...used].sort((a, b) => a.src.region.index - b.src.region.index || a.src.pos - b.src.pos || a.nStart - b.nStart
    || a.o.signal.localeCompare(b.o.signal));
  const idOf = new Map<Ob, string>();
  sortedObs.forEach((o, i) => idOf.set(o, `po${i}`));
  const ids = (list: Iterable<Ob>): string[] => [...new Set([...list].map((o) => idOf.get(o) as string))].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));

  const findings: PayFinding[] = scored.map((s, i) => {
    const trust = [...new Set(s.units.flatMap((u) => trustOf(u.src)))];
    const evidence = [...s.units.flatMap((u) => [...u.anchors, ...u.objects, ...u.destinations, ...u.conditions]), ...s.context];
    const limitations: PayLimitation[] = [];
    if (s.pressures.includes('claimed-authority')) limitations.push('claimed-identity-unverifiable');
    if (trust.some((t) => UNTRUSTED.includes(t))) limitations.push('trust-boundary-heuristic');
    if (evidence.some((o) => o.o.signal === 'PA.AMOUNT')) limitations.push('amount-not-reported');
    let summary = SUMMARY[s.ruleId];
    if (s.modifiers.length > 0) summary += ` Context: ${s.modifiers.map((m) => m.reason).join(' ')}`;
    const irreversible = s.destinations.length > 0 || s.ruleId === 'PR1';
    return {
      id: `p${i}`,
      category: 'payment_manipulation',
      ruleId: s.ruleId,
      ruleName: PAY_RULES[s.ruleId].name,
      classification: s.classification,
      ruleClassification: s.ruleClassification,
      confidence: s.confidence,
      actionRisk: irreversible ? 'high' : 'medium',
      promises: s.promises,
      destinations: s.destinations,
      pressures: s.pressures,
      trustContext: trust,
      regionId: s.region.region.id,
      observationIds: ids(evidence),
      modifiers: s.modifiers.map((m) => ({ ...m, evidence: m.evidence.map((e) => (typeof e === 'string' ? e : idOf.get(e) as string)) })),
      limitations,
      summary,
    };
  });

  let verdict: Verdict = 'none';
  for (const f of findings) if (verdict === 'none' || TIERS.indexOf(f.classification) > TIERS.indexOf(verdict)) verdict = f.classification;
  return {
    detector: 'payment',
    detectorVersion: PAY_DETECTOR_VERSION,
    experimental: true,
    schemaVersion: 1,
    verdict,
    findings,
    observations: sortedObs.map((o) => ({ ...o.o, id: idOf.get(o) as string })),
  };
}
