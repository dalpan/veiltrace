// Strict validation of data crossing the browser-API boundary (injected script → popup). The injected
// code is ours, but its strings are page-derived, so every field is type-, enum- and length-checked.
import type { ScanGap, ScanStatus } from '../../core/coverage.js';
import type { HighlightResult, HighlightStatus } from '../content/highlight.js';
import type {
  CredEvidenceItem, CredFindingSummary, CredentialSection, EvidenceItem, FindingSummary, PayEvidenceItem, PayFindingSummary, PaymentSection, ScanReport,
  SupportEvidenceItem, SupportFindingSummary, SupportSection,
} from '../content/report.js';
import { MAX_EVIDENCE_PER_FINDING, MAX_FINDINGS, MAX_SNIPPET_CHARS, REPORT_VERSION } from '../content/report.js';
import { isSafeLocator } from '../../extract/extract.js';

const VERDICTS = ['none', 'observed_instruction', 'suspicious_correlation', 'manipulative_instruction'] as const;
const CLASSES = ['observed_instruction', 'suspicious_correlation', 'manipulative_instruction'] as const;
const LEVELS = ['high', 'medium', 'low'] as const;
const RISKS = ['high', 'medium'] as const;
const RULES = ['R1', 'R2', 'R3', 'R4', 'R5'] as const;
const MODS = ['C.QUOTED', 'C.REPORTED', 'C.EDUCATIONAL', 'C.CODE_EXAMPLE', 'C.PROCEDURAL'] as const;
const OVERRIDES = ['O.CONCEALED_PAYLOAD', 'O.VERIFICATION_GATE'] as const;
const EFFECTS = ['suppressed', 'capped-at-1'] as const;

// Exact key sets: unknown fields (e.g. metadata added by a future engine) make the whole report invalid,
// so the popup can never silently omit information it does not understand.
const REPORT_KEYS = ['v', 'engineVersion', 'extractorVersion', 'verdict', 'findings', 'coverage', 'status', 'counts', 'credential', 'payment', 'support', 'timing'];
const FINDING_KEYS = ['id', 'ruleId', 'ruleName', 'classification', 'ruleClassification', 'confidence', 'actionRisk', 'summary', 'modifiers', 'overrides', 'evidence', 'evidenceTotal'];
const EVIDENCE_KEYS = ['signal', 'text', 'source', 'locator', 'deobfuscated'];
const COVERAGE_KEYS = ['framesSkipped', 'truncated', 'closedShadowRootsSkipped', 'coreTruncated', 'partial'];
const SIGNALS = ['A.OPEN_RUN', 'A.PASTE', 'A.EXECUTE', 'A.COMMAND', 'A.COPY_TRIGGER', 'P.HUMAN_VERIFY', 'P.FAKE_FIX', 'P.URGENCY', 'P.AUTHORITY', 'C.NEGATION', 'C.REPORTED', 'C.EDUCATIONAL'] as const;
const SOURCES = ['visible-text', 'hidden-clipboard', 'copy-control'] as const;
const GAPS: readonly ScanGap[] = ['node-budget', 'block-budget', 'char-budget', 'timeout', 'block-text-capped', 'aux-capped', 'frames-skipped', 'closed-shadow-skipped', 'extractor-truncated', 'core-truncated'];
// M5.1 experimental credential section (SECTION_KEYS also shapes the M5.2 payment section).
const SECTION_KEYS = ['detectorVersion', 'experimental', 'verdict', 'findings', 'findingsTotal'];
const CRED_FINDING_KEYS = ['id', 'ruleId', 'classification', 'ruleClassification', 'confidence', 'actionRisk', 'requestedAction', 'secretTypes', 'pretexts',
  'trustContext', 'formDestination', 'modifiers', 'overrides', 'limitations', 'evidence', 'evidenceTotal'];
const CRED_EVIDENCE_KEYS = ['signal', 'text', 'source', 'locator', 'fieldKind'];
const CRED_RULES = ['CR1', 'CR2', 'CR3', 'CR4', 'CR5'] as const;
const CRED_SIGNALS = ['S.PASSWORD', 'S.OTP', 'S.PIN', 'S.RECOVERY_CODE', 'S.SEED_PHRASE', 'S.TOKEN', 'D.SEND', 'D.ENTER',
  'CP.ACCOUNT_THREAT', 'CP.URGENCY', 'CP.SUPPORT', 'CP.VERIFY', 'CP.REWARD', 'F.SECRET_FIELD', 'C.NEGATION', 'C.REPORTED', 'C.EDUCATIONAL'] as const;
const CRED_PRETEXTS = ['CP.ACCOUNT_THREAT', 'CP.URGENCY', 'CP.SUPPORT', 'CP.VERIFY', 'CP.REWARD'] as const;
const CRED_MODS = ['C.QUOTED', 'C.REPORTED', 'C.EDUCATIONAL', 'C.CODE_EXAMPLE'] as const;
const CRED_OVERRIDES = ['O.LIVE_SECRET_FIELD'] as const;
const SECRET_TYPES = ['password', 'otp', 'pin', 'recovery-code', 'recovery-phrase', 'token'] as const;
const TRUST = ['user-content', 'third-party-widget', 'embedded-frame', 'dialog', 'overlay', 'form'] as const;
const DESTINATIONS = ['none', 'same-origin', 'other-origin', 'mailto', 'javascript', 'data', 'other'] as const;
const LIMITS = ['claimed-identity-unverifiable', 'destination-not-scored', 'trust-boundary-heuristic'] as const;
const FIELD_KINDS = ['password', 'otp', 'pin', 'recovery-code', 'secret-phrase', 'email', 'text', 'other'] as const;
// M5.2 experimental payment section.
const PAY_FINDING_KEYS = ['id', 'ruleId', 'classification', 'ruleClassification', 'confidence', 'actionRisk', 'promises', 'destinations', 'pressures',
  'trustContext', 'modifiers', 'limitations', 'evidence', 'evidenceTotal'];
const PAY_RULES = ['PR1', 'PR2', 'PR3', 'PR4'] as const;
const PAY_SIGNALS = ['PY.PAY', 'PA.AMOUNT', 'PF.FEE', 'PF.RELEASE_FEE', 'PD.PERSONAL', 'PD.OFF_PLATFORM', 'PD.GIFT_CARD', 'PD.CRYPTO',
  'PR.REFUND', 'PR.PRIZE', 'PR.UNLOCK', 'PR.RECRUIT', 'PR.JOB', 'PR.INVEST', 'PR.LOAN', 'PC.CONDITION', 'PP.THREAT', 'PP.URGENCY', 'PP.AUTHORITY', 'PP.FAMILY', 'C.NEGATION', 'C.REPORTED', 'C.EDUCATIONAL'] as const;
const PROMISES = ['refund', 'prize', 'account-unlock', 'release', 'recruitment', 'job', 'investment-return', 'loan'] as const;
const PAY_DESTINATIONS = ['personal-account', 'off-platform', 'gift-card', 'crypto'] as const;
const PRESSURES = ['threat', 'urgency', 'claimed-authority', 'claimed-family'] as const;
const PAY_LIMITS = ['claimed-identity-unverifiable', 'trust-boundary-heuristic', 'amount-not-reported'] as const;
// M5.3 experimental support section.
const SUP_FINDING_KEYS = ['id', 'ruleId', 'classification', 'ruleClassification', 'confidence', 'actionRisk', 'requestedActions', 'channels', 'claims',
  'indicators', 'pressures', 'trustContext', 'modifiers', 'limitations', 'evidence', 'evidenceTotal'];
const SUP_RULES = ['SR1', 'SR2', 'SR3', 'SR4', 'SR5', 'SR6', 'SR7', 'SR8', 'SR9', 'SR10'] as const;
const SUP_SIGNALS = ['SC.CONTACT', 'SC.RESPOND', 'SC.SURVEY', 'SA.REMOTE', 'SA.INSTALL', 'SA.DISABLE', 'SX.PHONE', 'SX.MOBILE', 'SX.MESSENGER', 'SX.LINK', 'SX.APK', 'SI.SUPPORT', 'SI.BANK', 'SI.ADMIN', 'SI.SECURITY', 'SI.OFFICIAL', 'SI.ORG',
  'SW.ALERT', 'SW.ACCOUNT', 'ST.THREAT', 'SU.URGENCY', 'SP.REWARD', 'SP.WON', 'SO.ILLICIT', 'SO.PROXY', 'SD.DOCUMENT', 'SH.UNASSERTED', 'C.NEGATION', 'C.REPORTED', 'C.EDUCATIONAL'] as const;
const SUP_ACTIONS = ['contact', 'respond', 'survey', 'remote-access', 'install', 'disable-protection'] as const;
const SUP_CHANNELS = ['phone', 'mobile', 'messenger', 'link', 'apk-file'] as const;
const SUP_CLAIMS = ['support', 'bank', 'administrator', 'security-team', 'official', 'organization'] as const;
const SUP_INDICATORS = ['page-rendered-system-alert', 'remote-access-request', 'software-install-request', 'personal-channel-contact', 'claim-in-user-content',
  'alert-in-overlay', 'protection-disable-request', 'apk-file-in-message'] as const;
const SUP_PRESSURES = ['system-alert', 'account-alarm', 'threat', 'urgency', 'reward', 'pre-won', 'illicit-access', 'third-party-redirect', 'document-pretext'] as const;
const SUP_LIMITS = ['claimed-identity-unverifiable', 'trust-boundary-heuristic', 'contact-details-not-reported'] as const;
const HIGHLIGHT: readonly HighlightStatus[] = ['highlighted', 'invalid-locator', 'not-found', 'frame-inaccessible', 'not-visible'];

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const onlyKeys = (x: Obj, allowed: readonly string[]): boolean => Object.keys(x).every((k) => allowed.includes(k));
const oneOf = <T extends string>(x: unknown, values: readonly T[]): x is T => typeof x === 'string' && (values as readonly string[]).includes(x);
const str = (x: unknown, max: number): x is string => typeof x === 'string' && x.length <= max;
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const bool = (x: unknown): x is boolean => typeof x === 'boolean';

function evidence(x: unknown): EvidenceItem | null {
  if (!isObj(x) || !onlyKeys(x, EVIDENCE_KEYS) || !oneOf(x.signal, SIGNALS) || !str(x.text, MAX_SNIPPET_CHARS) || !oneOf(x.source, SOURCES) || !bool(x.deobfuscated)) return null;
  const locator = isSafeLocator(x.locator) ? x.locator : null;
  return { signal: x.signal, text: x.text, source: x.source, locator, deobfuscated: x.deobfuscated };
}

function finding(x: unknown): FindingSummary | null {
  if (!isObj(x) || !onlyKeys(x, FINDING_KEYS)) return null;
  if (!Array.isArray(x.overrides) || x.overrides.length > 4) return null;
  if (!num(x.evidenceTotal) || !Array.isArray(x.evidence) || x.evidenceTotal < x.evidence.length) return null;
  if (!str(x.id, 20) || !oneOf(x.ruleId, RULES) || !str(x.ruleName, 60) || !oneOf(x.classification, CLASSES) || !oneOf(x.ruleClassification, CLASSES) ||
    !oneOf(x.confidence, LEVELS) || !oneOf(x.actionRisk, RISKS) || !str(x.summary, 1000) || !Array.isArray(x.modifiers) || !Array.isArray(x.evidence)) return null;
  const modifiers: FindingSummary['modifiers'] = [];
  if (x.modifiers.length > 8) return null;
  for (const m of x.modifiers) {
    if (!isObj(m) || !onlyKeys(m, ['id', 'reason']) || !oneOf(m.id, MODS) || !str(m.reason, 300)) return null;
    modifiers.push({ id: m.id, reason: m.reason });
  }
  const overrides: FindingSummary['overrides'] = [];
  for (const o of x.overrides) {
    if (!isObj(o) || !onlyKeys(o, ['id', 'effect', 'suppressed', 'evidence']) || !oneOf(o.id, OVERRIDES) || !oneOf(o.effect, EFFECTS)) return null;
    if (!Array.isArray(o.suppressed) || o.suppressed.length === 0 || o.suppressed.length > 8 || !o.suppressed.every((s) => oneOf(s, MODS))) return null;
    if (!Array.isArray(o.evidence) || o.evidence.length > MAX_EVIDENCE_PER_FINDING) return null;
    const ev: EvidenceItem[] = [];
    for (const e of o.evidence) {
      const v = evidence(e);
      if (!v) return null;
      ev.push(v);
    }
    overrides.push({ id: o.id, effect: o.effect, suppressed: o.suppressed as FindingSummary['modifiers'][number]['id'][], evidence: ev });
  }
  const ev: EvidenceItem[] = [];
  if (x.evidence.length > MAX_EVIDENCE_PER_FINDING) return null;
  for (const e of x.evidence) {
    const v = evidence(e);
    if (!v) return null;
    ev.push(v);
  }
  return {
    id: x.id, ruleId: x.ruleId, ruleName: x.ruleName, classification: x.classification, ruleClassification: x.ruleClassification,
    confidence: x.confidence, actionRisk: x.actionRisk, summary: x.summary, modifiers, overrides, evidence: ev, evidenceTotal: x.evidenceTotal as number,
  };
}

/** A list of distinct values from a closed set, at most `max` long. */
function enumList<T extends string>(x: unknown, values: readonly T[], max: number): T[] | null {
  if (!Array.isArray(x) || x.length > max || new Set(x).size !== x.length || !x.every((v) => oneOf(v, values))) return null;
  return [...x] as T[];
}

function credEvidence(x: unknown): CredEvidenceItem | null {
  if (!isObj(x) || !onlyKeys(x, CRED_EVIDENCE_KEYS) || !oneOf(x.signal, CRED_SIGNALS) || !str(x.text, MAX_SNIPPET_CHARS) || !oneOf(x.source, ['visible-text', 'form-field'] as const)) return null;
  if (x.fieldKind !== null && !oneOf(x.fieldKind, FIELD_KINDS)) return null;
  if ((x.source === 'form-field') !== (x.fieldKind !== null)) return null;
  return { signal: x.signal, text: x.text, source: x.source, locator: isSafeLocator(x.locator) ? x.locator : null, fieldKind: x.fieldKind };
}

function credFinding(x: unknown): CredFindingSummary | null {
  if (!isObj(x) || !onlyKeys(x, CRED_FINDING_KEYS)) return null;
  if (!str(x.id, 20) || !oneOf(x.ruleId, CRED_RULES) || !oneOf(x.classification, CLASSES) || !oneOf(x.ruleClassification, CLASSES) || !oneOf(x.confidence, LEVELS)
    || !oneOf(x.actionRisk, RISKS) || !oneOf(x.requestedAction, ['send', 'enter'] as const)) return null;
  if (x.formDestination !== null && !oneOf(x.formDestination, DESTINATIONS)) return null;
  const secretTypes = enumList(x.secretTypes, SECRET_TYPES, SECRET_TYPES.length);
  const pretexts = enumList(x.pretexts, CRED_PRETEXTS, CRED_PRETEXTS.length);
  const trustContext = enumList(x.trustContext, TRUST, TRUST.length);
  const modifiers = enumList(x.modifiers, CRED_MODS, CRED_MODS.length);
  const overrides = enumList(x.overrides, CRED_OVERRIDES, CRED_OVERRIDES.length);
  const limitations = enumList(x.limitations, LIMITS, LIMITS.length);
  if (!secretTypes || secretTypes.length === 0 || !pretexts || !trustContext || !modifiers || !overrides || !limitations) return null;
  if (!Array.isArray(x.evidence) || x.evidence.length === 0 || x.evidence.length > MAX_EVIDENCE_PER_FINDING || !num(x.evidenceTotal) || x.evidenceTotal < x.evidence.length) return null;
  const evidence: CredEvidenceItem[] = [];
  for (const e of x.evidence) {
    const v = credEvidence(e);
    if (!v) return null;
    evidence.push(v);
  }
  return {
    id: x.id, ruleId: x.ruleId, classification: x.classification, ruleClassification: x.ruleClassification, confidence: x.confidence, actionRisk: x.actionRisk,
    requestedAction: x.requestedAction, secretTypes, pretexts, trustContext, formDestination: x.formDestination, modifiers, overrides, limitations,
    evidence, evidenceTotal: x.evidenceTotal as number,
  };
}

function credentialSection(x: unknown): CredentialSection | null {
  if (!isObj(x) || !onlyKeys(x, SECTION_KEYS) || !str(x.detectorVersion, 40) || x.experimental !== true || !oneOf(x.verdict, VERDICTS)) return null;
  if (!Array.isArray(x.findings) || x.findings.length > MAX_FINDINGS || !num(x.findingsTotal) || x.findingsTotal < x.findings.length) return null;
  const findings: CredFindingSummary[] = [];
  for (const f of x.findings) {
    const v = credFinding(f);
    if (!v) return null;
    findings.push(v);
  }
  return { detectorVersion: x.detectorVersion, experimental: true, verdict: x.verdict, findings, findingsTotal: x.findingsTotal };
}

function payEvidence(x: unknown): PayEvidenceItem | null {
  if (!isObj(x) || !onlyKeys(x, ['signal', 'text', 'locator']) || !oneOf(x.signal, PAY_SIGNALS) || !str(x.text, MAX_SNIPPET_CHARS)) return null;
  // Amount values never cross the boundary.
  if (x.signal === 'PA.AMOUNT' && x.text !== '') return null;
  return { signal: x.signal, text: x.text, locator: isSafeLocator(x.locator) ? x.locator : null };
}

function payFinding(x: unknown): PayFindingSummary | null {
  if (!isObj(x) || !onlyKeys(x, PAY_FINDING_KEYS)) return null;
  if (!str(x.id, 20) || !oneOf(x.ruleId, PAY_RULES) || !oneOf(x.classification, CLASSES) || !oneOf(x.ruleClassification, CLASSES) || !oneOf(x.confidence, LEVELS)
    || !oneOf(x.actionRisk, RISKS)) return null;
  const promises = enumList(x.promises, PROMISES, PROMISES.length);
  const destinations = enumList(x.destinations, PAY_DESTINATIONS, PAY_DESTINATIONS.length);
  const pressures = enumList(x.pressures, PRESSURES, PRESSURES.length);
  const trustContext = enumList(x.trustContext, TRUST, TRUST.length);
  const modifiers = enumList(x.modifiers, CRED_MODS, CRED_MODS.length);
  const limitations = enumList(x.limitations, PAY_LIMITS, PAY_LIMITS.length);
  if (!promises || !destinations || !pressures || !trustContext || !modifiers || !limitations) return null;
  if (!Array.isArray(x.evidence) || x.evidence.length === 0 || x.evidence.length > MAX_EVIDENCE_PER_FINDING || !num(x.evidenceTotal) || x.evidenceTotal < x.evidence.length) return null;
  const evidence: PayEvidenceItem[] = [];
  for (const e of x.evidence) {
    const v = payEvidence(e);
    if (!v) return null;
    evidence.push(v);
  }
  return {
    id: x.id, ruleId: x.ruleId, classification: x.classification, ruleClassification: x.ruleClassification, confidence: x.confidence, actionRisk: x.actionRisk,
    promises, destinations, pressures, trustContext, modifiers, limitations, evidence, evidenceTotal: x.evidenceTotal as number,
  };
}

function paymentSection(x: unknown): PaymentSection | null {
  if (!isObj(x) || !onlyKeys(x, SECTION_KEYS) || !str(x.detectorVersion, 40) || x.experimental !== true || !oneOf(x.verdict, VERDICTS)) return null;
  if (!Array.isArray(x.findings) || x.findings.length > MAX_FINDINGS || !num(x.findingsTotal) || x.findingsTotal < x.findings.length) return null;
  const findings: PayFindingSummary[] = [];
  for (const f of x.findings) {
    const v = payFinding(f);
    if (!v) return null;
    findings.push(v);
  }
  return { detectorVersion: x.detectorVersion, experimental: true, verdict: x.verdict, findings, findingsTotal: x.findingsTotal };
}

function supportEvidence(x: unknown): SupportEvidenceItem | null {
  if (!isObj(x) || !onlyKeys(x, ['signal', 'text', 'locator']) || !oneOf(x.signal, SUP_SIGNALS) || !str(x.text, MAX_SNIPPET_CHARS)) return null;
  // Phone numbers and other long digit runs never cross the boundary.
  if ((x.signal === 'SX.PHONE' || x.signal === 'SX.MOBILE') && x.text !== '') return null;
  if (/\d{5,}/u.test(x.text)) return null;
  return { signal: x.signal, text: x.text, locator: isSafeLocator(x.locator) ? x.locator : null };
}

function supportFinding(x: unknown): SupportFindingSummary | null {
  if (!isObj(x) || !onlyKeys(x, SUP_FINDING_KEYS)) return null;
  if (!str(x.id, 20) || !oneOf(x.ruleId, SUP_RULES) || !oneOf(x.classification, CLASSES) || !oneOf(x.ruleClassification, CLASSES) || !oneOf(x.confidence, LEVELS)
    || !oneOf(x.actionRisk, RISKS)) return null;
  const requestedActions = enumList(x.requestedActions, SUP_ACTIONS, SUP_ACTIONS.length);
  const channels = enumList(x.channels, SUP_CHANNELS, SUP_CHANNELS.length);
  const claims = enumList(x.claims, SUP_CLAIMS, SUP_CLAIMS.length);
  const indicators = enumList(x.indicators, SUP_INDICATORS, SUP_INDICATORS.length);
  const pressures = enumList(x.pressures, SUP_PRESSURES, SUP_PRESSURES.length);
  const trustContext = enumList(x.trustContext, TRUST, TRUST.length);
  const modifiers = enumList(x.modifiers, CRED_MODS, CRED_MODS.length);
  const limitations = enumList(x.limitations, SUP_LIMITS, SUP_LIMITS.length);
  if (!requestedActions || !channels || !claims || !indicators || !pressures || !trustContext || !modifiers || !limitations) return null;
  if (!Array.isArray(x.evidence) || x.evidence.length === 0 || x.evidence.length > MAX_EVIDENCE_PER_FINDING || !num(x.evidenceTotal) || x.evidenceTotal < x.evidence.length) return null;
  const evidence: SupportEvidenceItem[] = [];
  for (const e of x.evidence) {
    const v = supportEvidence(e);
    if (!v) return null;
    evidence.push(v);
  }
  return {
    id: x.id, ruleId: x.ruleId, classification: x.classification, ruleClassification: x.ruleClassification, confidence: x.confidence, actionRisk: x.actionRisk,
    requestedActions, channels, claims, indicators, pressures, trustContext, modifiers, limitations, evidence, evidenceTotal: x.evidenceTotal as number,
  };
}

function supportSection(x: unknown): SupportSection | null {
  if (!isObj(x) || !onlyKeys(x, SECTION_KEYS) || !str(x.detectorVersion, 40) || x.experimental !== true || !oneOf(x.verdict, VERDICTS)) return null;
  if (!Array.isArray(x.findings) || x.findings.length > MAX_FINDINGS || !num(x.findingsTotal) || x.findingsTotal < x.findings.length) return null;
  const findings: SupportFindingSummary[] = [];
  for (const f of x.findings) {
    const v = supportFinding(f);
    if (!v) return null;
    findings.push(v);
  }
  return { detectorVersion: x.detectorVersion, experimental: true, verdict: x.verdict, findings, findingsTotal: x.findingsTotal };
}

/** Returns a validated copy of the report, or null if anything is malformed. */
export function parseScanReport(x: unknown): ScanReport | null {
  if (!isObj(x) || !onlyKeys(x, REPORT_KEYS) || x.v !== REPORT_VERSION || !str(x.engineVersion, 40) || !str(x.extractorVersion, 40) || !oneOf(x.verdict, VERDICTS)) return null;
  if (!Array.isArray(x.findings) || x.findings.length > MAX_FINDINGS) return null;
  const findings: FindingSummary[] = [];
  for (const f of x.findings) {
    const v = finding(f);
    if (!v) return null;
    findings.push(v);
  }
  const c = x.coverage;
  if (!isObj(c) || !onlyKeys(c, COVERAGE_KEYS) || !num(c.framesSkipped) || !bool(c.truncated) || !num(c.closedShadowRootsSkipped) || !bool(c.coreTruncated)) return null;
  if (c.partial !== undefined && !(Array.isArray(c.partial) && c.partial.every((p) => oneOf(p, GAPS)))) return null;
  const s = x.status;
  if (!isObj(s) || !bool(s.complete) || !Array.isArray(s.reasons) || !s.reasons.every((r) => oneOf(r, GAPS))) return null;
  const n = x.counts;
  if (!isObj(n) || !num(n.blocks) || !num(n.hiddenCopyCandidates) || !num(n.copyTriggers) || !num(n.observations) || !num(n.findingsTotal)) return null;
  const t = x.timing;
  if (!isObj(t) || !onlyKeys(t, ['extractMs', 'analyzeMs', 'credentialMs', 'paymentMs', 'supportMs']) || !num(t.extractMs) || !num(t.analyzeMs)
    || !num(t.credentialMs) || !num(t.paymentMs) || !num(t.supportMs)) return null;
  const credential = credentialSection(x.credential);
  if (!credential) return null;
  const payment = paymentSection(x.payment);
  if (!payment) return null;
  const support = supportSection(x.support);
  if (!support) return null;
  const status: ScanStatus = { complete: s.complete, reasons: s.reasons as ScanGap[] };
  return {
    v: REPORT_VERSION, engineVersion: x.engineVersion, extractorVersion: x.extractorVersion, verdict: x.verdict, findings,
    coverage: {
      framesSkipped: c.framesSkipped, truncated: c.truncated, closedShadowRootsSkipped: c.closedShadowRootsSkipped, coreTruncated: c.coreTruncated,
      ...(c.partial ? { partial: c.partial as ScanGap[] as never } : {}),
    },
    status,
    counts: { blocks: n.blocks, hiddenCopyCandidates: n.hiddenCopyCandidates, copyTriggers: n.copyTriggers, observations: n.observations, findingsTotal: n.findingsTotal },
    credential,
    payment,
    support,
    timing: { extractMs: t.extractMs, analyzeMs: t.analyzeMs, credentialMs: t.credentialMs, paymentMs: t.paymentMs, supportMs: t.supportMs },
  };
}

export function parseHighlightResult(x: unknown): HighlightResult | null {
  return isObj(x) && oneOf(x.status, HIGHLIGHT) ? { status: x.status } : null;
}
