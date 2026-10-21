// Strict validation of data crossing the browser-API boundary (injected script → popup). The injected
// code is ours, but its strings are page-derived, so every field is type-, enum- and length-checked.
import type { ScanGap, ScanStatus } from '../../core/coverage.js';
import type { HighlightResult, HighlightStatus } from '../content/highlight.js';
import type { EvidenceItem, FindingSummary, ScanReport } from '../content/report.js';
import { MAX_EVIDENCE_PER_FINDING, MAX_FINDINGS, MAX_SNIPPET_CHARS, REPORT_VERSION } from '../content/report.js';
import { isSafeLocator } from '../../extract/extract.js';

const VERDICTS = ['none', 'observed_instruction', 'suspicious_correlation', 'manipulative_instruction'] as const;
const CLASSES = ['observed_instruction', 'suspicious_correlation', 'manipulative_instruction'] as const;
const LEVELS = ['high', 'medium', 'low'] as const;
const RISKS = ['high', 'medium'] as const;
const RULES = ['R1', 'R2', 'R3', 'R4', 'R5'] as const;
const MODS = ['C.QUOTED', 'C.REPORTED', 'C.EDUCATIONAL', 'C.CODE_EXAMPLE'] as const;
const SIGNALS = ['A.OPEN_RUN', 'A.PASTE', 'A.EXECUTE', 'A.COMMAND', 'A.COPY_TRIGGER', 'P.HUMAN_VERIFY', 'P.FAKE_FIX', 'P.URGENCY', 'P.AUTHORITY', 'C.NEGATION', 'C.REPORTED', 'C.EDUCATIONAL'] as const;
const SOURCES = ['visible-text', 'hidden-clipboard', 'copy-control'] as const;
const GAPS: readonly ScanGap[] = ['node-budget', 'block-budget', 'char-budget', 'timeout', 'block-text-capped', 'aux-capped', 'frames-skipped', 'closed-shadow-skipped', 'extractor-truncated', 'core-truncated'];
const HIGHLIGHT: readonly HighlightStatus[] = ['highlighted', 'invalid-locator', 'not-found', 'frame-inaccessible', 'not-visible'];

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const oneOf = <T extends string>(x: unknown, values: readonly T[]): x is T => typeof x === 'string' && (values as readonly string[]).includes(x);
const str = (x: unknown, max: number): x is string => typeof x === 'string' && x.length <= max;
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const bool = (x: unknown): x is boolean => typeof x === 'boolean';

function evidence(x: unknown): EvidenceItem | null {
  if (!isObj(x) || !oneOf(x.signal, SIGNALS) || !str(x.text, MAX_SNIPPET_CHARS) || !oneOf(x.source, SOURCES) || !bool(x.deobfuscated)) return null;
  const locator = isSafeLocator(x.locator) ? x.locator : null;
  return { signal: x.signal, text: x.text, source: x.source, locator, deobfuscated: x.deobfuscated };
}

function finding(x: unknown): FindingSummary | null {
  if (!isObj(x)) return null;
  if (!str(x.id, 20) || !oneOf(x.ruleId, RULES) || !str(x.ruleName, 60) || !oneOf(x.classification, CLASSES) || !oneOf(x.ruleClassification, CLASSES) ||
    !oneOf(x.confidence, LEVELS) || !oneOf(x.actionRisk, RISKS) || !str(x.summary, 1000) || !Array.isArray(x.modifiers) || !Array.isArray(x.evidence)) return null;
  const modifiers: FindingSummary['modifiers'] = [];
  for (const m of x.modifiers.slice(0, 8)) {
    if (!isObj(m) || !oneOf(m.id, MODS) || !str(m.reason, 300)) return null;
    modifiers.push({ id: m.id, reason: m.reason });
  }
  const ev: EvidenceItem[] = [];
  for (const e of x.evidence.slice(0, MAX_EVIDENCE_PER_FINDING)) {
    const v = evidence(e);
    if (!v) return null;
    ev.push(v);
  }
  return {
    id: x.id, ruleId: x.ruleId, ruleName: x.ruleName, classification: x.classification, ruleClassification: x.ruleClassification,
    confidence: x.confidence, actionRisk: x.actionRisk, summary: x.summary, modifiers, evidence: ev,
  };
}

/** Returns a validated copy of the report, or null if anything is malformed. */
export function parseScanReport(x: unknown): ScanReport | null {
  if (!isObj(x) || x.v !== REPORT_VERSION || !str(x.engineVersion, 40) || !str(x.extractorVersion, 40) || !oneOf(x.verdict, VERDICTS)) return null;
  if (!Array.isArray(x.findings) || x.findings.length > MAX_FINDINGS) return null;
  const findings: FindingSummary[] = [];
  for (const f of x.findings) {
    const v = finding(f);
    if (!v) return null;
    findings.push(v);
  }
  const c = x.coverage;
  if (!isObj(c) || !num(c.framesSkipped) || !bool(c.truncated) || !num(c.closedShadowRootsSkipped) || !bool(c.coreTruncated)) return null;
  if (c.partial !== undefined && !(Array.isArray(c.partial) && c.partial.every((p) => oneOf(p, GAPS)))) return null;
  const s = x.status;
  if (!isObj(s) || !bool(s.complete) || !Array.isArray(s.reasons) || !s.reasons.every((r) => oneOf(r, GAPS))) return null;
  const n = x.counts;
  if (!isObj(n) || !num(n.blocks) || !num(n.hiddenCopyCandidates) || !num(n.copyTriggers) || !num(n.observations) || !num(n.findingsTotal)) return null;
  const t = x.timing;
  if (!isObj(t) || !num(t.extractMs) || !num(t.analyzeMs)) return null;
  const status: ScanStatus = { complete: s.complete, reasons: s.reasons as ScanGap[] };
  return {
    v: REPORT_VERSION, engineVersion: x.engineVersion, extractorVersion: x.extractorVersion, verdict: x.verdict, findings,
    coverage: {
      framesSkipped: c.framesSkipped, truncated: c.truncated, closedShadowRootsSkipped: c.closedShadowRootsSkipped, coreTruncated: c.coreTruncated,
      ...(c.partial ? { partial: c.partial as ScanGap[] as never } : {}),
    },
    status,
    counts: { blocks: n.blocks, hiddenCopyCandidates: n.hiddenCopyCandidates, copyTriggers: n.copyTriggers, observations: n.observations, findingsTotal: n.findingsTotal },
    timing: { extractMs: t.extractMs, analyzeMs: t.analyzeMs },
  };
}

export function parseHighlightResult(x: unknown): HighlightResult | null {
  return isObj(x) && oneOf(x.status, HIGHLIGHT) ? { status: x.status } : null;
}
