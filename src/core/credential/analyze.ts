// EXPERIMENTAL credential-disclosure detector (M5.1): PageSnapshot → CredentialResult. Pure and deterministic.
// It never reads url or title, never reads field values (the snapshot does not contain them) and never changes the
// ClickFix engine's result. Decision table: docs/DETECTION_MODEL.md §12.
import { MAX_AUX_SOURCES, MAX_BLOCK_CHARS, MAX_BLOCKS, NEGATION_MAX_GAP, WINDOW_BLOCKS } from '../constants.js';
import { LEXICON } from '../lexicon/index.js';
import { normalize, toOriginalRange, type NormalizedText } from '../normalize.js';
import { buildRegions, unplacedRegion, type RegionInfo } from '../regions.js';
import type { Block, Classification, FieldKind, FormField, FormInfo, Level, PageSnapshot, Verdict } from '../types.js';
import { CRED_LEXICON } from './lexicon.js';
import type {
  CredFinding, CredModifier, CredObservation, CredOverride, CredPretextSignalId, CredRuleId, CredSignalId, CredSignalKind,
  CredSourceRef, CredentialResult, SecretSignalId, SecretType, TrustContext, CredLexiconEntry,
} from './types.js';

export const CRED_DETECTOR_VERSION = 'cred-0.3.0-exp';

/** Same clause/sentence breaks as the ClickFix negation and reported-speech binding (observe.ts). */
const CLAUSE_BREAK = /[,;:.!?]|(?<![\p{L}\p{N}_])(?:and|then|or|but|dan|lalu|kemudian|atau|tapi|tetapi)(?![\p{L}\p{N}_])/u;
const SENTENCE_BREAK = /[.!?]/u;
/** Max normalized characters between a disclosure verb and the secret it asks for ("send me the 6-digit code"). */
const REQUEST_MAX_GAP = 60;
/** A secret named earlier in the same sentence can be the object of a later verb ("ada kode masuk ke hp kakak, tolong kirim ke sini"). */
const REQUEST_MAX_GAP_BEFORE = 90;
/**
 * The sender is the site or a first person ("we will send you a code", "kode yang kami kirim", "sistem akan mengirim"): a notice,
 * not a request to the reader. Matched on the text just before the verb.
 */
const SELF_SENDER = /(?:^|[\s,])(?:we|we['’]ll|we['’]ve|kami|sistem|system|aplikasi|akan\s+kami|yang\s+kami|sudah\s+kami|telah\s+kami)(?:\s+(?:will|have|has|just|already|are|akan|sudah|telah|baru(?:\s+saja)?|segera|otomatis))*\s*$/u;

const TIERS: readonly Classification[] = ['observed_instruction', 'suspicious_correlation', 'manipulative_instruction'];
const LEVELS: readonly Level[] = ['low', 'medium', 'high'];
const EDUCATIONAL = LEXICON.filter((e) => e.signal === 'C.EDUCATIONAL');
/** Pretexts that make a plain sign-in or code request suspicious. Deadlines and offers alone are common on legitimate shops. */
const ESCALATING: readonly CredPretextSignalId[] = ['CP.ACCOUNT_THREAT'];

const SECRET_OF_SIGNAL: Record<SecretSignalId, SecretType> = {
  'S.PASSWORD': 'password', 'S.OTP': 'otp', 'S.PIN': 'pin', 'S.RECOVERY_CODE': 'recovery-code', 'S.SEED_PHRASE': 'recovery-phrase', 'S.TOKEN': 'token',
};
const SECRET_OF_FIELD: Partial<Record<FieldKind, SecretType>> = {
  password: 'password', otp: 'otp', pin: 'pin', 'recovery-code': 'recovery-code', 'secret-phrase': 'recovery-phrase',
};
const HIGH_RISK_SECRETS: readonly SecretType[] = ['otp', 'recovery-code', 'recovery-phrase', 'token'];

export const CRED_RULES: Readonly<Record<CredRuleId, { name: string; classification: Classification }>> = {
  CR1: { name: 'SECRET_TO_THIRD_PARTY', classification: 'manipulative_instruction' },
  CR2: { name: 'RECOVERY_PHRASE_UNDER_PRETEXT', classification: 'manipulative_instruction' },
  CR3: { name: 'SECRET_IN_UNTRUSTED_CONTENT', classification: 'suspicious_correlation' },
  CR4: { name: 'SECRET_UNDER_PRESSURE', classification: 'suspicious_correlation' },
  CR5: { name: 'OBSERVED_SECRET_REQUEST', classification: 'observed_instruction' },
};

const SUMMARY: Record<CredRuleId, string> = {
  CR1: 'This part of the page asks the reader to send a secret (password, code or recovery phrase) to a person or channel. Legitimate services ask you to type codes into their own sign-in form, not to pass them on.',
  CR2: 'This part of the page asks for a wallet recovery phrase and wraps the request in a pretext (verification, support, deadline, threat or reward).',
  CR3: 'A secret is requested inside user-generated content, a widget or an embedded frame, together with a pretext.',
  CR4: 'A secret is requested together with a threat to suspend, lock or close the account.',
  CR5: 'A request for a password or code was found with no manipulation signs nearby (for example, an ordinary sign-in or verification step).',
};

interface Src {
  ref: CredSourceRef;
  text: string;
  norm: NormalizedText;
  region: RegionInfo;
  pos: number;
  /** Correlation scope: the region itself, or for a form the surrounding region it continues (see scopeOf). */
  scope: RegionInfo;
  /** Position inside the scope. */
  spos: number;
  block?: Block;
  field?: FormField;
}

interface Ob {
  o: CredObservation;
  src: Src;
  nStart: number;
  nEnd: number;
  boundBy?: Ob;
}

interface Unit {
  action: 'send' | 'enter';
  actionObs?: Ob;
  secretObs: Ob[];
  secrets: SecretType[];
  src: Src;
  isField: boolean;
}

function kindOfSignal(s: CredSignalId): CredSignalKind {
  if (s.startsWith('S.')) return 'secret';
  if (s.startsWith('D.')) return 'disclosure';
  if (s.startsWith('CP.')) return 'pretext';
  if (s.startsWith('F.')) return 'field';
  return 'context';
}

function makeObs(src: Src, signal: CredSignalId, entryId: string, nStart: number, nEnd: number): Ob {
  const range = src.ref.type === 'field' && signal === 'F.SECRET_FIELD' ? { start: 0, end: src.text.length } : toOriginalRange(src.norm, nStart, nEnd);
  return {
    src, nStart, nEnd,
    o: {
      id: '', signal, kind: kindOfSignal(signal), entryId, source: src.ref, start: range.start, end: range.end,
      text: src.text.slice(range.start, range.end), regionId: src.region.region.id, negated: false, reported: false,
      ...(signal === 'F.SECRET_FIELD' && src.field ? { fieldKind: src.field.kind } : {}),
    },
  };
}

function match(src: Src, lexicon: readonly CredLexiconEntry[]): Ob[] {
  const raw: Array<{ id: string; signal: CredSignalId; strong: boolean; s: number; e: number }> = [];
  for (const entry of lexicon) {
    for (const m of src.norm.text.matchAll(entry.pattern)) {
      if (m[0].length > 0) raw.push({ id: entry.id, signal: entry.signal, strong: entry.strength === 'strong', s: m.index, e: m.index + m[0].length });
    }
  }
  raw.sort((a, b) => Number(b.strong) - Number(a.strong) || a.s - b.s || b.e - a.e || a.id.localeCompare(b.id));
  const kept = new Map<CredSignalId, Array<[number, number]>>();
  const out: Ob[] = [];
  for (const r of raw) {
    const spans = kept.get(r.signal) ?? [];
    if (spans.some(([s, e]) => r.s < e && s < r.e)) continue;
    spans.push([r.s, r.e]);
    kept.set(r.signal, spans);
    out.push(makeObs(src, r.signal, r.id, r.s, r.e));
  }
  return out;
}

/**
 * A form is part of the dialog, card or section it sits in: a form region directly after a region of one of the
 * form's enclosing containers (FormInfo.ancestorContainerIds) continues that region's scope. Only forms are merged,
 * and the extractor stops the ancestor list at user-content, widget and frame boundaries.
 */
function scopes(regions: readonly RegionInfo[], forms: readonly FormInfo[]): Map<RegionInfo, { scope: RegionInfo; offset: number }> {
  const ancestorsOf = new Map(forms.map((f) => [f.containerId, f.ancestorContainerIds ?? []]));
  const out = new Map<RegionInfo, { scope: RegionInfo; offset: number }>();
  for (const r of regions) {
    const prev = regions[r.index - 1];
    const prevScope = prev ? out.get(prev) : undefined;
    if (prev && prevScope && !r.unplaced && (ancestorsOf.get(r.region.containerId) ?? []).includes(prev.region.containerId)) {
      out.set(r, { scope: prevScope.scope, offset: prevScope.offset + prev.blocks.length });
    } else {
      out.set(r, { scope: r, offset: 0 });
    }
  }
  return out;
}

function buildSources(s: PageSnapshot, regions: RegionInfo[]): Src[] {
  const sources: Src[] = [];
  const placement = new Map<string, { region: RegionInfo; pos: number }>();
  for (const r of regions) {
    r.blocks.forEach((b, i) => {
      placement.set(b.id, { region: r, pos: i });
      const text = b.text.slice(0, MAX_BLOCK_CHARS);
      sources.push({ ref: { type: 'block', blockId: b.id }, text, norm: normalize(text), region: r, pos: i, scope: r, spos: i, block: b });
    });
  }
  const firstRegionOf = new Map<string, RegionInfo>();
  for (const r of regions) if (!firstRegionOf.has(r.region.containerId)) firstRegionOf.set(r.region.containerId, r);
  for (const f of (s.formFields ?? []).slice(0, MAX_AUX_SOURCES)) {
    const anchor = f.afterBlockId === undefined ? undefined : placement.get(f.afterBlockId);
    let place: { region: RegionInfo; pos: number };
    if (anchor && anchor.region.region.containerId === f.containerId) place = { region: anchor.region, pos: anchor.pos + 0.5 };
    else if (firstRegionOf.has(f.containerId)) place = { region: firstRegionOf.get(f.containerId) as RegionInfo, pos: -0.5 };
    else if (anchor) place = { region: anchor.region, pos: anchor.pos + 0.5 };
    else {
      const region = unplacedRegion(f.containerId, regions.length);
      regions.push(region);
      firstRegionOf.set(f.containerId, region);
      place = { region, pos: -0.5 };
    }
    sources.push({ ref: { type: 'field', fieldId: f.id }, text: f.label, norm: normalize(f.label), region: place.region, pos: place.pos, scope: place.region, spos: place.pos, field: f });
  }
  const sc = scopes(regions, s.forms ?? []);
  for (const src of sources) {
    const x = sc.get(src.region) ?? { scope: src.region, offset: 0 };
    src.scope = x.scope;
    src.spos = x.offset + src.pos;
  }
  return sources;
}

function bindContext(signals: Ob[], cues: Ob[]): void {
  for (const d of signals) {
    if (d.o.kind !== 'disclosure' || d.src.ref.type !== 'block') continue;
    if (d.o.signal === 'D.SEND' && SELF_SENDER.test(d.src.norm.text.slice(Math.max(0, d.nStart - 30), d.nStart))) {
      d.o.negated = true;
      continue;
    }
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
      for (let p = Math.floor(d.src.pos) - 1; p >= 0 && d.src.pos - p < WINDOW_BLOCKS; p--) {
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

function textUnits(signals: readonly Ob[]): Unit[] {
  const units: Unit[] = [];
  for (const d of signals) {
    if (d.o.kind !== 'disclosure' || d.o.negated) continue;
    const text = d.src.norm.text;
    const after = signals.filter((s) => s.src === d.src && s.o.kind === 'secret' && s.nStart >= d.nEnd
      && s.nStart - d.nEnd <= REQUEST_MAX_GAP && !SENTENCE_BREAK.test(text.slice(d.nEnd, s.nStart)));
    const before = after.length > 0 ? [] : signals.filter((s) => s.src === d.src && s.o.kind === 'secret' && s.nEnd <= d.nStart
      && d.nStart - s.nEnd <= REQUEST_MAX_GAP_BEFORE && !SENTENCE_BREAK.test(text.slice(s.nEnd, d.nStart)));
    const secrets = after.length > 0 ? after : before;
    if (secrets.length === 0) continue;
    units.push({
      action: d.o.signal === 'D.SEND' ? 'send' : 'enter', actionObs: d, secretObs: secrets,
      secrets: [...new Set(secrets.map((s) => SECRET_OF_SIGNAL[s.o.signal as SecretSignalId]))], src: d.src, isField: false,
    });
  }
  // A send and an enter verb on the same secret ("type and send"): keep one unit per secret span, send first.
  units.sort((a, b) => Number(b.action === 'send') - Number(a.action === 'send'));
  const seen = new Set<Ob>();
  return units.filter((u) => {
    if (u.secretObs.every((s) => seen.has(s))) return false;
    for (const s of u.secretObs) seen.add(s);
    return true;
  });
}

function containerKind(src: Src): string {
  const id = src.block?.containerId ?? src.field?.containerId ?? '';
  return id.slice(0, id.indexOf(':') + 1);
}

function trustOf(u: Unit): TrustContext[] {
  const ctx = u.src.block?.ctx ?? u.src.field?.ctx ?? {};
  const kind = containerKind(u.src);
  const out: TrustContext[] = [];
  if (kind === 'ugc:' || ctx.ugc) out.push('user-content');
  if (kind === 'widget:') out.push('third-party-widget');
  if (kind === 'frame:') out.push('embedded-frame');
  if (kind === 'dialog:' || ctx.dialog) out.push('dialog');
  if (kind === 'overlay:' || ctx.overlay) out.push('overlay');
  if (ctx.form || u.src.field?.formId) out.push('form');
  return out;
}

const UNTRUSTED: readonly TrustContext[] = ['user-content', 'third-party-widget', 'embedded-frame'];

function near(src: Src, units: readonly Unit[]): boolean {
  return units.some((u) => u.src.scope === src.scope && Math.abs(u.src.spos - src.spos) < WINDOW_BLOCKS);
}

function headingEducational(heading: string | null | undefined): boolean {
  if (!heading) return false;
  const text = normalize(heading).text;
  return EDUCATIONAL.some((e) => [...text.matchAll(e.pattern)].length > 0);
}

interface Scored {
  units: Unit[];
  /** The request that determined the classification. */
  primary: Unit;
  region: RegionInfo;
  ruleId: CredRuleId;
  /** Classification the rule produced before context modifiers (CR1 without a pretext is suspicious). */
  ruleClassification: Classification;
  classification: Classification;
  confidence: Level;
  pretexts: Ob[];
  modifiers: Array<Omit<CredModifier, 'evidence'> & { evidence: Array<Ob | string> }>;
  overrides: Array<Omit<CredOverride, 'evidence'> & { evidence: Ob[] }>;
}

const RULE_RANK: Readonly<Record<CredRuleId, number>> = { CR1: 0, CR2: 1, CR3: 2, CR4: 3, CR5: 4 };

const inQuoteOrCode = (src: Src): boolean => Boolean(src.block?.ctx?.quote || src.block?.ctx?.code || src.block?.ctx?.pre);

/**
 * Scores one request in the context of its cluster. Pretexts count when they are near the request and addressed to
 * the reader: a pretext inside a quotation or code sample only counts for a request in that same block.
 */
function scoreOne(u: Unit, cluster: readonly Unit[], region: RegionInfo, signals: readonly Ob[], cues: readonly Ob[]): Scored {
  const pretexts = signals.filter((p) => p.o.kind === 'pretext' && near(p.src, [u]) && (!inQuoteOrCode(p.src) || p.src === u.src));
  const families = new Set(pretexts.map((p) => p.o.signal as CredPretextSignalId));
  const escalating = ESCALATING.filter((f) => families.has(f));
  const secrets = new Set(u.secrets);
  const untrusted = trustOf(u).some((t) => UNTRUSTED.includes(t));

  let ruleId: CredRuleId;
  let base: Level;
  let cls: Classification;
  if (u.action === 'send') {
    ruleId = 'CR1';
    cls = families.size > 0 ? 'manipulative_instruction' : 'suspicious_correlation';
    base = families.size > 0 ? 'high' : 'medium';
  } else if (secrets.has('recovery-phrase') && families.size > 0) {
    [ruleId, cls, base] = ['CR2', 'manipulative_instruction', 'high'];
  } else if (untrusted && families.size > 0) {
    [ruleId, cls, base] = ['CR3', 'suspicious_correlation', escalating.length > 0 && families.size >= 2 ? 'high' : 'medium'];
  } else if (escalating.length > 0) {
    [ruleId, cls, base] = ['CR4', 'suspicious_correlation', families.size >= 2 ? 'high' : 'medium'];
  } else {
    [ruleId, cls, base] = ['CR5', 'observed_instruction', 'high'];
  }

  // Context of this request: quotation, reported speech, code sample (text requests) and educational framing (any).
  const mods: Scored['modifiers'] = [];
  if (!u.isField && u.src.block?.ctx?.quote) {
    mods.push({ id: 'C.QUOTED', demoteBy: 2, reason: 'The request is inside a quotation.', evidence: [u.actionObs as Ob] });
  }
  if (!u.isField && u.actionObs?.o.reported) {
    mods.push({ id: 'C.REPORTED', demoteBy: 2, reason: 'The text reports what someone else was asked to do rather than asking the reader.',
      evidence: u.actionObs.boundBy ? [u.actionObs.boundBy] : [] });
  }
  if (!u.isField && (u.src.block?.ctx?.code || u.src.block?.ctx?.pre)) {
    mods.push({ id: 'C.CODE_EXAMPLE', demoteBy: 2, reason: 'The request text is inside a code sample.', evidence: [`block:${u.src.block?.id ?? ''}`] });
  }
  const eduCues = cues.filter((c) => c.o.signal === 'C.EDUCATIONAL' && near(c.src, [u]));
  const anchor = u.src.block ?? u.src.region.blocks[Math.max(0, Math.floor(u.src.pos))];
  const eduHeading = anchor && headingEducational(anchor.headingContext) ? [`heading:${anchor.id}`] : [];
  if (eduCues.length > 0 || eduHeading.length > 0) {
    mods.push({ id: 'C.EDUCATIONAL', demoteBy: 1, reason: 'The surrounding text is educational or awareness material.', evidence: [...eduCues, ...eduHeading] });
  }
  // A live field for the same kind of secret only sets aside the educational framing (a cue an attacker can plant next to
  // a form). Quotation, reported speech and code samples are structural evidence that the text is someone else's.
  const liveFields = cluster.filter((f) => f.isField && !(f.src.field?.ctx?.quote || f.src.field?.ctx?.code || f.src.field?.ctx?.pre)
    && f.secrets.some((x) => secrets.has(x)));
  const overrides: Scored['overrides'] = [];
  if (mods.some((m) => m.id === 'C.EDUCATIONAL') && liveFields.length > 0) {
    overrides.push({ id: 'O.LIVE_SECRET_FIELD', suppressed: ['C.EDUCATIONAL'], evidence: liveFields.flatMap((f) => f.secretObs),
      reason: 'The same part of the page has a working input field for the secret, which a lesson would not need.' });
  }
  const kept = overrides.length > 0 ? mods.filter((m) => m.id !== 'C.EDUCATIONAL') : mods;
  const demotion = Math.min(2, kept.reduce((n, m) => n + m.demoteBy, 0));
  return {
    units: [u], primary: u, region, ruleId, ruleClassification: cls, pretexts, modifiers: kept, overrides,
    classification: TIERS[Math.max(0, TIERS.indexOf(cls) - demotion)] as Classification,
    confidence: LEVELS[Math.max(0, LEVELS.indexOf(base) - kept.length - overrides.length)] as Level,
  };
}

/** A cluster's finding is its strongest request; evidence and pretexts of all its requests are kept. */
function score(units: Unit[], region: RegionInfo, signals: readonly Ob[], cues: readonly Ob[]): Scored {
  const scored = units.map((u) => scoreOne(u, units, region, signals, cues));
  const best = [...scored].sort((a, b) => TIERS.indexOf(b.classification) - TIERS.indexOf(a.classification) || RULE_RANK[a.ruleId] - RULE_RANK[b.ruleId])[0] as Scored;
  return { ...best, units, pretexts: [...new Set(scored.flatMap((x) => x.pretexts))] };
}

/** Groups requests of one region whose positions fit in one correlation window. */
function cluster(units: Unit[]): Array<{ region: RegionInfo; units: Unit[] }> {
  const sorted = [...units].sort((a, b) => a.src.scope.index - b.src.scope.index || a.src.spos - b.src.spos);
  const out: Array<{ region: RegionInfo; units: Unit[] }> = [];
  for (const u of sorted) {
    const last = out[out.length - 1];
    if (last && last.region === u.src.scope && u.src.spos - (last.units[0] as Unit).src.spos < WINDOW_BLOCKS) last.units.push(u);
    else out.push({ region: u.src.scope, units: [u] });
  }
  return out;
}

function refKey(r: CredSourceRef): string {
  return r.type === 'block' ? `b:${r.blockId}` : `f:${r.fieldId}`;
}

/**
 * `extra`: additional lexicon entries from a verified organization rule pack (D-109). They add signals of the existing
 * types and never replace or remove built-in entries; without them the result is exactly the built-in detector's.
 */
export function analyzeCredentials(snapshot: PageSnapshot, options: { extra?: readonly CredLexiconEntry[] } = {}): CredentialResult {
  const lexicon: readonly CredLexiconEntry[] = options.extra && options.extra.length > 0 ? [...CRED_LEXICON, ...options.extra] : CRED_LEXICON;
  const regions = buildRegions(snapshot.blocks.slice(0, MAX_BLOCKS));
  const sources = buildSources(snapshot, regions);
  const signals: Ob[] = [];
  const cues: Ob[] = [];
  for (const src of sources) {
    for (const ob of match(src, lexicon)) (ob.o.kind === 'context' ? cues : signals).push(ob);
    const kind = src.field?.kind;
    if (kind && SECRET_OF_FIELD[kind]) signals.push(makeObs(src, 'F.SECRET_FIELD', `structural.field.${kind}`, 0, src.norm.text.length));
  }
  bindContext(signals, cues);

  const units = textUnits(signals);
  for (const f of signals) {
    if (f.o.signal !== 'F.SECRET_FIELD' || !f.src.field) continue;
    units.push({ action: 'enter', secretObs: [f], secrets: [SECRET_OF_FIELD[f.src.field.kind] as SecretType], src: f.src, isField: true });
  }

  const scored = cluster(units).map((c) => score(c.units, c.region, signals, cues));

  // Output observations: the evidence of findings plus the context cues they used.
  const used = new Set<Ob>();
  for (const s of scored) {
    for (const u of s.units) {
      if (u.actionObs) used.add(u.actionObs);
      for (const o of u.secretObs) used.add(o);
    }
    for (const p of s.pretexts) used.add(p);
    for (const m of s.modifiers) for (const e of m.evidence) if (typeof e !== 'string') used.add(e);
  }
  const ordered = [...used].sort((a, b) => a.src.scope.index - b.src.scope.index || a.src.spos - b.src.spos || a.nStart - b.nStart
    || a.o.signal.localeCompare(b.o.signal) || refKey(a.o.source).localeCompare(refKey(b.o.source)));
  const idOf = new Map<Ob, string>();
  ordered.forEach((o, i) => idOf.set(o, `co${i}`));
  const ids = (list: Iterable<Ob>): string[] => [...new Set([...list].map((o) => idOf.get(o) as string))].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));

  const findings: CredFinding[] = scored.map((s, i) => {
    const firstField = s.units.find((u) => u.src.field?.formId)?.src.field;
    const formDestination = firstField ? snapshot.forms?.find((f) => f.id === firstField.formId)?.destination : undefined;
    const trust = [...new Set(s.units.flatMap(trustOf))];
    const secrets = [...new Set(s.units.flatMap((u) => u.secrets))];
    const pretexts = [...new Set(s.pretexts.map((p) => p.o.signal as CredPretextSignalId))].sort();
    const limitations: CredFinding['limitations'] = [];
    if (pretexts.includes('CP.SUPPORT')) limitations.push('claimed-identity-unverifiable');
    if (formDestination) limitations.push('destination-not-scored');
    if (trust.some((t) => UNTRUSTED.includes(t))) limitations.push('trust-boundary-heuristic');
    const send = s.primary.action === 'send';
    let summary = SUMMARY[s.ruleId];
    if (s.modifiers.length > 0) summary += ` Context: ${s.modifiers.map((m) => m.reason).join(' ')}`;
    if (s.overrides.length > 0) summary += ` Not lowered: ${s.overrides.map((o) => o.reason).join(' ')}`;
    return {
      id: `c${i}`,
      category: 'credential_disclosure',
      ruleId: s.ruleId,
      ruleName: CRED_RULES[s.ruleId].name,
      classification: s.classification,
      ruleClassification: s.ruleClassification,
      confidence: s.confidence,
      actionRisk: send || secrets.some((x) => HIGH_RISK_SECRETS.includes(x)) ? 'high' : 'medium',
      requestedAction: send ? 'send' : 'enter',
      secretTypes: secrets,
      pretexts,
      trustContext: trust,
      ...(formDestination ? { formDestination } : {}),
      regionId: s.region.region.id,
      observationIds: ids([...s.units.flatMap((u) => [...(u.actionObs ? [u.actionObs] : []), ...u.secretObs]), ...s.pretexts]),
      modifiers: s.modifiers.map((m) => ({ ...m, evidence: m.evidence.map((e) => (typeof e === 'string' ? e : idOf.get(e) as string)) })),
      overrides: s.overrides.map((o) => ({ ...o, evidence: ids(o.evidence) })),
      limitations,
      summary,
    };
  });

  let verdict: Verdict = 'none';
  for (const f of findings) if (verdict === 'none' || TIERS.indexOf(f.classification) > TIERS.indexOf(verdict)) verdict = f.classification;
  return {
    detector: 'credential',
    detectorVersion: CRED_DETECTOR_VERSION,
    experimental: true,
    schemaVersion: 1,
    verdict,
    findings,
    observations: ordered.map((o) => ({ ...o.o, id: idOf.get(o) as string })),
  };
}
