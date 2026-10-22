// EXPERIMENTAL fake-support and authority-impersonation detector (M5.3): PageSnapshot → SupportResult. Pure and deterministic.
// It reads block text only: never url, title or form fields. Phone numbers are matched but never reported, and digit runs and
// @handles in other evidence are masked. A claimed identity is reported as a claim; observable indicators are reported
// separately, and neither is a statement that an organization is fake. It never changes the other detectors' results.
// Decision table: docs/DETECTION_MODEL.md §14.
import { MAX_BLOCK_CHARS, MAX_BLOCKS, NEGATION_MAX_GAP, WINDOW_BLOCKS } from '../constants.js';
import { LEXICON } from '../lexicon/index.js';
import { normalize, toOriginalRange, type NormalizedText } from '../normalize.js';
import { buildRegions, type RegionInfo } from '../regions.js';
import type { Block, Classification, Level, PageSnapshot, Verdict } from '../types.js';
import { SUPPORT_LEXICON } from './lexicon.js';
import type {
  ImpersonationIndicator, SupportAction, SupportChannel, SupportClaim, SupportFinding, SupportLimitation, SupportModifier, SupportObservation,
  SupportPressure, SupportResult, SupportRuleId, SupportSignalId, SupportSignalKind, SupportTrustContext,
} from './types.js';

export const SUPPORT_DETECTOR_VERSION = 'sup-0.5.0-exp';

const CLAUSE_BREAK = /[,;:!?]|\.(?=\s|$)|(?<![\p{L}\p{N}_])(?:and|then|or|but|dan|lalu|kemudian|atau|tapi|tetapi)(?![\p{L}\p{N}_])/u;
/** Negation distributes over a disjunction ("never install AnyDesk or share your screen"), so "or"/"atau" does not end its scope. */
const NEGATION_BREAK = /[,;:!?]|\.(?=\s|$)|(?<![\p{L}\p{N}_])(?:and|then|but|dan|lalu|kemudian|tapi|tetapi)(?![\p{L}\p{N}_])/u;
const SENTENCE_BREAK = /[!?]|\.(?=\s|$)/u;
/** Max normalized characters between "if"/"jika" or "says"/"menyatakan" and the alert it makes unasserted. */
const HYPOTHETICAL_MAX_GAP = 60;
/** A phone number has 9–15 digits; shorter digit groups are dates, amounts or codes. */
const PHONE_DIGITS = [9, 15] as const;

const TIERS: readonly Classification[] = ['observed_instruction', 'suspicious_correlation', 'manipulative_instruction'];
const LEVELS: readonly Level[] = ['low', 'medium', 'high'];
const EDUCATIONAL = LEXICON.filter((e) => e.signal === 'C.EDUCATIONAL');

const ACTION_OF: Partial<Record<SupportSignalId, SupportAction>> = { 'SC.CONTACT': 'contact', 'SC.RESPOND': 'respond', 'SC.SURVEY': 'survey', 'SA.REMOTE': 'remote-access', 'SA.INSTALL': 'install' };
const CHANNEL_OF: Partial<Record<SupportSignalId, SupportChannel>> = { 'SX.PHONE': 'phone', 'SX.MOBILE': 'mobile', 'SX.MESSENGER': 'messenger', 'SX.LINK': 'link' };
const CLAIM_OF: Partial<Record<SupportSignalId, SupportClaim>> = { 'SI.SUPPORT': 'support', 'SI.BANK': 'bank', 'SI.ADMIN': 'administrator', 'SI.SECURITY': 'security-team', 'SI.OFFICIAL': 'official', 'SI.ORG': 'organization' };
const PRESSURE_OF: Partial<Record<SupportSignalId, SupportPressure>> = { 'SW.ALERT': 'system-alert', 'SW.ACCOUNT': 'account-alarm', 'ST.THREAT': 'threat', 'SU.URGENCY': 'urgency', 'SP.REWARD': 'reward', 'SP.WON': 'pre-won', 'SO.ILLICIT': 'illicit-access' };
const ORDER: readonly string[] = ['contact', 'respond', 'survey', 'remote-access', 'install', 'phone', 'mobile', 'messenger', 'link', 'support', 'bank', 'administrator', 'security-team', 'official', 'organization',
  'system-alert', 'account-alarm', 'threat', 'urgency', 'reward', 'pre-won', 'illicit-access', 'page-rendered-system-alert', 'alert-in-overlay', 'remote-access-request', 'software-install-request',
  'personal-channel-contact', 'claim-in-user-content'];
const ordered = <T extends string>(xs: Iterable<T>): T[] => [...new Set(xs)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

/** Highest classification each rule can produce; the actual one depends on the signals found (DETECTION_MODEL.md §14). */
export const SUPPORT_RULES: Readonly<Record<SupportRuleId, { name: string; classification: Classification }>> = {
  SR1: { name: 'FAKE_SYSTEM_ALERT_SUPPORT', classification: 'manipulative_instruction' },
  SR2: { name: 'IMPERSONATED_REMOTE_ACCESS_OR_INSTALL', classification: 'manipulative_instruction' },
  SR3: { name: 'SUPPORT_REDIRECT_UNDER_THREAT', classification: 'manipulative_instruction' },
  SR4: { name: 'CLAIMED_SUPPORT_IN_USER_CONTENT', classification: 'manipulative_instruction' },
  SR5: { name: 'OBSERVED_SUPPORT_DIRECTION', classification: 'observed_instruction' },
  SR6: { name: 'IMPERSONATED_NOTICE_LURE', classification: 'manipulative_instruction' },
  SR7: { name: 'PRIZE_SURVEY_LURE', classification: 'manipulative_instruction' },
  SR8: { name: 'ILLICIT_ACCESS_SERVICE', classification: 'manipulative_instruction' },
};

const SUMMARY: Record<SupportRuleId, string> = {
  SR1: 'The web page shows an alarm that the device is infected or locked and directs the reader to call a number, install software or allow remote access. Browsers and operating systems do not raise such alarms inside web pages.',
  SR2: 'Someone presenting as support, a bank or an administrator asks the reader to install software or allow remote access, together with pressure, user-posted content or a personal contact channel.',
  SR3: 'A claimed support, bank or administrator directs the reader to an outside contact together with a threat to the account or data, and urgency or a personal contact channel.',
  SR4: 'A comment or other user-posted content presents itself as official support and directs the reader to an outside contact.',
  SR5: 'A direction to contact support, install software or allow remote access was found with no impersonation or pressure signs nearby (for example, a help-center contact page).',
  SR6: 'A message presented as a notice from a bank, e-wallet, marketplace or its support raises an account alarm, a threat or a reward and asks the reader to reply, choose an option, open a link or fill in a form. Banks and platforms do not settle such matters through a reply or a link in a chat or text message.',
  SR7: 'The page congratulates the reader on a cash prize they did not enter for and asks them to answer a quiz or questionnaire, often in the name of a company\'s anniversary. Such quizzes are used to lead people to share the link or hand over data or money.',
  SR8: 'The page offers to get into someone else\'s messages, account or phone and directs the reader to a contact. Such services are illegal, and buyers are commonly cheated or blackmailed.',
};

interface Src {
  block: Block;
  text: string;
  norm: NormalizedText;
  region: RegionInfo;
  pos: number;
}

interface Ob {
  o: SupportObservation;
  src: Src;
  nStart: number;
  nEnd: number;
  boundBy?: Ob;
}

interface Unit {
  src: Src;
  actions: Ob[];
  channels: Ob[];
}

function kindOfSignal(s: SupportSignalId): SupportSignalKind {
  if (s.startsWith('SC.') || s.startsWith('SA.')) return 'action';
  if (s.startsWith('SX.')) return 'channel';
  if (s.startsWith('SI.')) return 'claim';
  if (s.startsWith('SW.') || s.startsWith('ST.') || s.startsWith('SU.') || s.startsWith('SP.') || s.startsWith('SO.')) return 'pressure';
  return 'context';
}

/** Reported page text: phone numbers are never reported; other digit runs and @handles are masked. */
function reportedText(signal: SupportSignalId, text: string): string {
  if (signal === 'SX.PHONE' || signal === 'SX.MOBILE' || signal === 'SX.LINK') return '';
  return text.replace(/\d{5,}/gu, (d) => '•'.repeat(d.length)).replace(/@[\p{L}\p{N}_.]+/gu, '@•');
}

function match(src: Src): Ob[] {
  const raw: Array<{ id: string; signal: SupportSignalId; strong: boolean; s: number; e: number }> = [];
  for (const entry of SUPPORT_LEXICON) {
    for (const m of src.norm.text.matchAll(entry.pattern)) {
      if (m[0].length === 0) continue;
      let signal = entry.signal;
      if (signal === 'SX.PHONE') {
        const digits = m[0].replace(/\D/gu, '');
        if (digits.length < PHONE_DIGITS[0] || digits.length > PHONE_DIGITS[1]) continue;
        // Indonesian mobile numbers (08…, +62 8…) are personal lines, not call-center numbers.
        if (/^(?:08|628)/u.test(digits)) signal = 'SX.MOBILE';
      }
      raw.push({ id: entry.id, signal, strong: entry.strength === 'strong', s: m.index, e: m.index + m[0].length });
    }
  }
  raw.sort((a, b) => Number(b.strong) - Number(a.strong) || a.s - b.s || b.e - a.e || a.id.localeCompare(b.id));
  const kept = new Map<SupportSignalId, Array<[number, number]>>();
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

const precedes = (c: Ob, d: Ob, gap: number, br: RegExp = CLAUSE_BREAK): boolean =>
  c.src === d.src && c.nEnd <= d.nStart && d.nStart - c.nEnd <= gap && !br.test(d.src.norm.text.slice(c.nEnd, d.nStart));

/**
 * Actions bind negation ("never call", "jangan hubungi") and reported speech ("scammers tell victims to call"); alerts bind
 * negation, conditionals ("if your computer is infected") and attribution ("a pop-up that says …"): none of them asserts it.
 */
function bindContext(signals: Ob[], cues: Ob[]): void {
  for (const d of signals) {
    const isAction = d.o.kind === 'action' || d.o.signal === 'SX.MESSENGER';
    const isAlert = d.o.signal === 'SW.ALERT';
    if (!isAction && !isAlert) continue;
    // The gap is measured from the negation cue, so a long list ("never call, text or …") still ends at NEGATION_MAX_GAP.
    const neg = cues.filter((c) => (c.o.signal === 'C.NEGATION' && precedes(c, d, NEGATION_MAX_GAP, NEGATION_BREAK))
      || (isAlert && c.o.signal === 'SH.UNASSERTED' && precedes(c, d, HYPOTHETICAL_MAX_GAP)));
    if (neg.length > 0) {
      d.o.negated = true;
      d.boundBy = neg[neg.length - 1];
      continue;
    }
    if (!isAction) continue;
    let rep = cues.find((c) => c.src === d.src && c.o.signal === 'C.REPORTED' && c.nEnd <= d.nStart && !SENTENCE_BREAK.test(d.src.norm.text.slice(c.nEnd, d.nStart)));
    if (!rep) {
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
 * A direction is a block with a non-negated remote-access or install request, or a contact verb with a phone number or
 * messenger in the same or an adjacent block ("Call Windows Support now:" / "+1 888 …"), or a messenger name followed by a
 * number ("WA 0812…"). One unit per block.
 */
function directionUnits(sources: readonly Src[], signals: readonly Ob[]): Unit[] {
  const units: Unit[] = [];
  for (const src of sources) {
    const here = signals.filter((s) => s.src === src && !s.o.negated);
    const isChannel = (s: Ob): boolean => s.o.kind === 'channel';
    const around = signals.filter((s) => s.src.region === src.region && Math.abs(s.src.pos - src.pos) === 1 && isChannel(s) && !s.o.negated);
    const remoteOrInstall = here.filter((s) => s.o.signal === 'SA.REMOTE' || s.o.signal === 'SA.INSTALL' || s.o.signal === 'SC.RESPOND' || s.o.signal === 'SC.SURVEY');
    const links = here.filter((s) => s.o.signal === 'SX.LINK');
    const contacts = here.filter((s) => s.o.signal === 'SC.CONTACT');
    const channelsHere = here.filter((s) => isChannel(s) && s.o.signal !== 'SX.LINK');
    const channels = channelsHere.length > 0 ? channelsHere : contacts.length > 0 ? around : [];
    const numberHere = channelsHere.some((s) => s.o.signal !== 'SX.MESSENGER');
    const messengerWithNumber = channelsHere.some((s) => s.o.signal === 'SX.MESSENGER') && numberHere;
    const actions = [...remoteOrInstall, ...(channels.length > 0 && (contacts.length > 0 || messengerWithNumber) ? contacts : [])];
    if (actions.length === 0 && !messengerWithNumber && links.length === 0) continue;
    units.push({ src, actions, channels: [...(actions.some((a) => a.o.signal === 'SC.CONTACT') || messengerWithNumber ? channels : []), ...links] });
  }
  return units;
}

function containerKind(src: Src): string {
  const id = src.block.containerId;
  return id.slice(0, id.indexOf(':') + 1);
}

function trustOf(src: Src): SupportTrustContext[] {
  const ctx = src.block.ctx ?? {};
  const kind = containerKind(src);
  const out: SupportTrustContext[] = [];
  if (kind === 'ugc:' || ctx.ugc) out.push('user-content');
  if (kind === 'widget:') out.push('third-party-widget');
  if (kind === 'frame:') out.push('embedded-frame');
  if (kind === 'dialog:' || ctx.dialog) out.push('dialog');
  if (kind === 'overlay:' || ctx.overlay) out.push('overlay');
  if (ctx.form) out.push('form');
  return out;
}

const UNTRUSTED: readonly SupportTrustContext[] = ['user-content', 'third-party-widget', 'embedded-frame'];
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
  ruleId: SupportRuleId;
  ruleClassification: Classification;
  classification: Classification;
  confidence: Level;
  context: Ob[];
  actions: SupportAction[];
  channels: SupportChannel[];
  claims: SupportClaim[];
  indicators: ImpersonationIndicator[];
  pressures: SupportPressure[];
  modifiers: Array<Omit<SupportModifier, 'evidence'> & { evidence: Array<Ob | string> }>;
}

const RULE_RANK: Readonly<Record<SupportRuleId, number>> = { SR1: 0, SR2: 1, SR3: 2, SR4: 3, SR6: 4, SR7: 5, SR8: 6, SR5: 7 };

function scoreOne(u: Unit, region: RegionInfo, signals: readonly Ob[], cues: readonly Ob[]): Scored {
  // Claims and pressure count when near the direction and addressed to the reader: inside a quotation or code sample, only in the same block.
  const nearby = signals.filter((p) => (p.o.kind === 'claim' || p.o.kind === 'pressure') && !p.o.negated && near(p.src, u) && (!inQuoteOrCode(p.src) || p.src === u.src));
  const alerts = nearby.filter((p) => p.o.signal === 'SW.ALERT');
  const threats = nearby.filter((p) => p.o.signal === 'ST.THREAT');
  const urgency = nearby.filter((p) => p.o.signal === 'SU.URGENCY');
  const claims = nearby.filter((p) => p.o.kind === 'claim');
  const actions = ordered(u.actions.map((a) => ACTION_OF[a.o.signal] as SupportAction));
  const channels = ordered(u.channels.map((c) => CHANNEL_OF[c.o.signal] as SupportChannel));
  const contact = u.channels.some((c) => c.o.signal !== 'SX.LINK');
  // A lure moves the reader into the sender's flow: a reply or choice, a form, or a link (SR6). Calling a published call-center
  // line is how genuine notices end; a personal number or messenger with a claim and a threat is SR3's case.
  const lure = actions.includes('respond') || channels.includes('link');
  const accountAlarms = nearby.filter((p) => p.o.signal === 'SW.ACCOUNT');
  const rewards = nearby.filter((p) => p.o.signal === 'SP.REWARD');
  const won = nearby.filter((p) => p.o.signal === 'SP.WON');
  const illicit = nearby.filter((p) => p.o.signal === 'SO.ILLICIT');
  const remote = actions.includes('remote-access');
  const install = actions.includes('install');
  const personal = channels.includes('mobile') || channels.includes('messenger');
  const trust = trustOf(u.src);
  const ugc = trust.includes('user-content');
  const untrusted = trust.some((t) => UNTRUSTED.includes(t));
  const hasClaim = claims.length > 0;

  // Every rule that applies is evaluated and the strongest wins (ties: lower rule number), so a weaker rule that happens to
  // match first never hides a stronger one.
  const pressure = [...claims, ...threats, ...urgency];
  const candidates: Array<[SupportRuleId, Classification, Ob[]]> = [];
  if (alerts.length > 0 && (contact || remote || install)) candidates.push(['SR1', 'manipulative_instruction', [...alerts, ...pressure]]);
  if ((remote || install) && hasClaim && (threats.length > 0 || urgency.length > 0 || untrusted || personal)) {
    candidates.push(['SR2', threats.length > 0 || (remote && (urgency.length > 0 || ugc)) ? 'manipulative_instruction' : 'suspicious_correlation', pressure]);
  }
  if (contact && hasClaim && threats.length > 0 && (personal || urgency.length > 0)) {
    candidates.push(['SR3', personal && urgency.length > 0 ? 'manipulative_instruction' : 'suspicious_correlation', pressure]);
  }
  if (contact && ugc && claims.some((c) => trustOf(c.src).includes('user-content'))) {
    candidates.push(['SR4', threats.length > 0 || urgency.length > 0 ? 'manipulative_instruction' : 'suspicious_correlation', pressure]);
  }
  // SR6: an impersonated notice. A claim, a lure and an alarm, threat or reward. Manipulative when the alarm or threat comes with
  // urgency, a personal channel or user content (a chat, SMS or comment), or when both an alarm and a threat are present.
  // Only in a message from someone else (chat, SMS, email, comment) or with a personal channel: an institution's own page that
  // announces a change and links to its site is ordinary, and the page address is never used to tell them apart.
  if (lure && hasClaim && (untrusted || personal) && (accountAlarms.length > 0 || threats.length > 0 || rewards.length > 0)) {
    const danger = accountAlarms.length > 0 || threats.length > 0;
    const strong = danger && (urgency.length > 0 || personal || ugc || (accountAlarms.length > 0 && threats.length > 0));
    candidates.push(['SR6', strong ? 'manipulative_instruction' : 'suspicious_correlation', [...pressure, ...accountAlarms, ...rewards]]);
  }
  // SR7: a prize the reader did not enter for, won by answering a quiz. Manipulative in a company's name or in a message.
  if (actions.includes('survey') && won.length > 0 && rewards.length > 0) {
    candidates.push(['SR7', hasClaim || untrusted ? 'manipulative_instruction' : 'suspicious_correlation', [...claims, ...won, ...rewards, ...urgency]]);
  }
  // SR8: an offer to get into someone else's account or phone, with a contact or reply direction.
  if (illicit.length > 0 && (contact || actions.includes('respond'))) {
    candidates.push(['SR8', urgency.length > 0 || personal ? 'manipulative_instruction' : 'suspicious_correlation', [...illicit, ...urgency]]);
  }
  const [ruleId, cls, used] = candidates.sort((x, y) => TIERS.indexOf(y[1]) - TIERS.indexOf(x[1]) || RULE_RANK[x[0]] - RULE_RANK[y[0]])[0]
    ?? ['SR5', 'observed_instruction', []];
  const base: Level = cls === 'suspicious_correlation' ? 'medium' : 'high';

  const anchor = (u.actions[0] ?? u.channels[0]) as Ob;
  const mods: Scored['modifiers'] = [];
  if (u.src.block.ctx?.quote) mods.push({ id: 'C.QUOTED', demoteBy: 2, reason: 'The direction is inside a quotation.', evidence: [anchor] });
  const reported = u.actions.find((a) => a.o.reported);
  if (reported) {
    mods.push({ id: 'C.REPORTED', demoteBy: 2, reason: 'The text reports what someone else was told to do rather than directing the reader.',
      evidence: reported.boundBy ? [reported.boundBy] : [] });
  }
  if (u.src.block.ctx?.code || u.src.block.ctx?.pre) {
    mods.push({ id: 'C.CODE_EXAMPLE', demoteBy: 2, reason: 'The direction is inside a code sample.', evidence: [`block:${u.src.block.id}`] });
  }
  const eduCues = cues.filter((c) => c.o.signal === 'C.EDUCATIONAL' && near(c.src, u));
  const eduHeading = headingEducational(u.src.block.headingContext) ? [`heading:${u.src.block.id}`] : [];
  if (eduCues.length > 0 || eduHeading.length > 0) {
    mods.push({ id: 'C.EDUCATIONAL', demoteBy: 1, reason: 'The surrounding text is educational or awareness material.', evidence: [...eduCues, ...eduHeading] });
  }
  const demotion = Math.min(2, mods.reduce((n, m) => n + m.demoteBy, 0));
  const context = [...new Set(used)];

  const indicators: ImpersonationIndicator[] = [];
  const usedAlerts = context.filter((o) => o.o.signal === 'SW.ALERT');
  if (usedAlerts.length > 0) indicators.push('page-rendered-system-alert');
  if (usedAlerts.some((o) => trustOf(o.src).some((t) => t === 'overlay' || t === 'dialog'))) indicators.push('alert-in-overlay');
  if (remote) indicators.push('remote-access-request');
  if (install) indicators.push('software-install-request');
  if (hasClaim && personal) indicators.push('personal-channel-contact');
  if (claims.some((c) => trustOf(c.src).includes('user-content'))) indicators.push('claim-in-user-content');

  return {
    units: [u], region, ruleId, ruleClassification: cls, modifiers: mods, context, actions, channels,
    classification: TIERS[Math.max(0, TIERS.indexOf(cls) - demotion)] as Classification,
    confidence: LEVELS[Math.max(0, LEVELS.indexOf(base) - mods.length)] as Level,
    claims: ordered(claims.map((c) => CLAIM_OF[c.o.signal] as SupportClaim)),
    indicators: ordered(indicators),
    pressures: ordered(context.flatMap((o) => (PRESSURE_OF[o.o.signal] ? [PRESSURE_OF[o.o.signal] as SupportPressure] : []))),
  };
}

/** A cluster's finding is its strongest direction; the evidence of all its directions is kept. */
function score(units: Unit[], region: RegionInfo, signals: readonly Ob[], cues: readonly Ob[]): Scored {
  const scored = units.map((u) => scoreOne(u, region, signals, cues));
  const best = [...scored].sort((a, b) => TIERS.indexOf(b.classification) - TIERS.indexOf(a.classification) || RULE_RANK[a.ruleId] - RULE_RANK[b.ruleId])[0] as Scored;
  return {
    ...best, units,
    actions: ordered(scored.flatMap((x) => x.actions)),
    channels: ordered(scored.flatMap((x) => x.channels)),
  };
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

export function analyzeSupport(snapshot: PageSnapshot): SupportResult {
  const regions = buildRegions(snapshot.blocks.slice(0, MAX_BLOCKS));
  const sources: Src[] = regions.flatMap((r) => r.blocks.map((b, i) => {
    const text = b.text.slice(0, MAX_BLOCK_CHARS);
    return { block: b, text, norm: normalize(text), region: r, pos: i };
  }));
  const signals: Ob[] = [];
  const cues: Ob[] = [];
  for (const src of sources) {
    for (const ob of match(src)) (ob.o.kind === 'context' ? cues : signals).push(ob);
  }
  bindContext(signals, cues);

  // A link, a reply request or a quiz alone is not a support direction: such clusters are kept only when a rule (SR6–SR8) fires.
  const linkOnly = (u: Unit): boolean => u.actions.every((a) => a.o.signal === 'SC.RESPOND' || a.o.signal === 'SC.SURVEY')
    && u.channels.every((c) => c.o.signal === 'SX.LINK');
  const scored = cluster(directionUnits(sources, signals)).map((c) => score(c.units, c.region, signals, cues))
    .filter((s) => !(s.ruleId === 'SR5' && s.units.every(linkOnly)));

  const used = new Set<Ob>();
  for (const s of scored) {
    for (const u of s.units) for (const o of [...u.actions, ...u.channels]) used.add(o);
    for (const o of s.context) used.add(o);
    for (const m of s.modifiers) for (const e of m.evidence) if (typeof e !== 'string') used.add(e);
  }
  const sortedObs = [...used].sort((a, b) => a.src.region.index - b.src.region.index || a.src.pos - b.src.pos || a.nStart - b.nStart
    || a.o.signal.localeCompare(b.o.signal));
  const idOf = new Map<Ob, string>();
  sortedObs.forEach((o, i) => idOf.set(o, `so${i}`));
  const ids = (list: Iterable<Ob>): string[] => [...new Set([...list].map((o) => idOf.get(o) as string))].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));

  const findings: SupportFinding[] = scored.map((s, i) => {
    const trust = ordered(s.units.flatMap((u) => trustOf(u.src)));
    const evidence = [...s.units.flatMap((u) => [...u.actions, ...u.channels]), ...s.context];
    const limitations: SupportLimitation[] = [];
    if (s.claims.length > 0) limitations.push('claimed-identity-unverifiable');
    if (trust.some((t) => UNTRUSTED.includes(t))) limitations.push('trust-boundary-heuristic');
    if (evidence.some((o) => o.o.signal === 'SX.PHONE' || o.o.signal === 'SX.MOBILE')) limitations.push('contact-details-not-reported');
    let summary = SUMMARY[s.ruleId];
    if (s.modifiers.length > 0) summary += ` Context: ${s.modifiers.map((m) => m.reason).join(' ')}`;
    return {
      id: `s${i}`,
      category: 'support_impersonation',
      ruleId: s.ruleId,
      ruleName: SUPPORT_RULES[s.ruleId].name,
      classification: s.classification,
      ruleClassification: s.ruleClassification,
      confidence: s.confidence,
      actionRisk: s.actions.includes('remote-access') || s.actions.includes('install') ? 'high' : 'medium',
      requestedActions: s.actions,
      channels: s.channels,
      claims: s.claims,
      indicators: s.indicators,
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
    detector: 'support',
    detectorVersion: SUPPORT_DETECTOR_VERSION,
    experimental: true,
    schemaVersion: 1,
    verdict,
    findings,
    observations: sortedObs.map((o) => ({ ...o.o, id: idOf.get(o) as string })),
  };
}
