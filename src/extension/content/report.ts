// Builds the minimal report sent from the tab's isolated world to the popup. The raw PageSnapshot never
// leaves the tab: only verdict, findings, the evidence snippets of those findings, coverage and counts.
import { scanStatus, type ScanStatus } from '../../core/coverage.js';
import type {
  CredentialResult, CredModifierId, CredObservation, CredOverrideId, CredPretextSignalId, CredRuleId, CredSignalId, SecretType, TrustContext,
} from '../../core/credential/types.js';
import type {
  ActionRisk, AnalysisResult, Classification, ContextOverride, FieldKind, FormDestination, Level, ModifierId, Observation, OverrideId, PageSnapshot, RuleId, SignalId, Verdict,
} from '../../core/types.js';

/** v2 (M5.1) adds the experimental `credential` section. */
export const REPORT_VERSION = 2;
export const MAX_FINDINGS = 50;
export const MAX_EVIDENCE_PER_FINDING = 12;
export const MAX_SNIPPET_CHARS = 300;

export type EvidenceSource = 'visible-text' | 'hidden-clipboard' | 'copy-control';

export interface EvidenceItem {
  signal: SignalId;
  text: string;
  source: EvidenceSource;
  /** Extractor locator (validated with isSafeLocator before any use), or null if unavailable. */
  locator: string | null;
  deobfuscated: boolean;
}

export interface FindingSummary {
  id: string;
  ruleId: RuleId;
  ruleName: string;
  classification: Classification;
  ruleClassification: Classification;
  confidence: Level;
  actionRisk: ActionRisk;
  summary: string;
  modifiers: Array<{ id: ModifierId; reason: string }>;
  /** Engine 0.2.0: context that was set aside because of direct-instruction evidence (always present; may be empty). */
  overrides: Array<{ id: OverrideId; effect: ContextOverride['effect']; suppressed: ModifierId[]; evidence: EvidenceItem[] }>;
  evidence: EvidenceItem[];
  /** Number of evidence observations before the MAX_EVIDENCE_PER_FINDING cap (the popup shows any remainder). */
  evidenceTotal: number;
}

/** Evidence of a credential finding. For a form field, `text` is its page-authored label; field values are never read. */
export interface CredEvidenceItem {
  signal: CredSignalId;
  text: string;
  source: 'visible-text' | 'form-field';
  locator: string | null;
  fieldKind: FieldKind | null;
}

export interface CredFindingSummary {
  id: string;
  ruleId: CredRuleId;
  classification: Classification;
  ruleClassification: Classification;
  confidence: Level;
  actionRisk: ActionRisk;
  requestedAction: 'send' | 'enter';
  secretTypes: SecretType[];
  pretexts: CredPretextSignalId[];
  trustContext: TrustContext[];
  formDestination: FormDestination | null;
  modifiers: CredModifierId[];
  overrides: CredOverrideId[];
  limitations: CredentialResult['findings'][number]['limitations'];
  evidence: CredEvidenceItem[];
  evidenceTotal: number;
}

/** EXPERIMENTAL credential-disclosure detector output (M5.1). */
export interface CredentialSection {
  detectorVersion: string;
  experimental: true;
  verdict: Verdict;
  findings: CredFindingSummary[];
  findingsTotal: number;
}

export interface ScanReport {
  v: typeof REPORT_VERSION;
  engineVersion: string;
  extractorVersion: string;
  verdict: Verdict;
  findings: FindingSummary[];
  coverage: AnalysisResult['coverage'];
  status: ScanStatus;
  counts: { blocks: number; hiddenCopyCandidates: number; copyTriggers: number; observations: number; findingsTotal: number };
  credential: CredentialSection;
  timing: { extractMs: number; analyzeMs: number; credentialMs: number };
}

const clip = (s: string): string => (s.length > MAX_SNIPPET_CHARS ? `${s.slice(0, MAX_SNIPPET_CHARS - 1)}…` : s);
const round = (n: number): number => Math.round(n * 10) / 10;

const RANK: Record<Classification, number> = { manipulative_instruction: 2, suspicious_correlation: 1, observed_instruction: 0 };

function credentialSection(snapshot: PageSnapshot, cred: CredentialResult): CredentialSection {
  const obsById = new Map(cred.observations.map((o) => [o.id, o]));
  const item = (o: CredObservation): CredEvidenceItem => {
    const src = o.source;
    if (src.type === 'block') {
      return { signal: o.signal, text: clip(o.text), source: 'visible-text', locator: snapshot.blocks.find((b) => b.id === src.blockId)?.locator ?? null, fieldKind: null };
    }
    const field = snapshot.formFields?.find((f) => f.id === src.fieldId);
    return { signal: o.signal, text: clip(o.text), source: 'form-field', locator: field?.locator ?? null, fieldKind: field?.kind ?? null };
  };
  const findings = [...cred.findings]
    .sort((a, b) => RANK[b.classification] - RANK[a.classification])
    .slice(0, MAX_FINDINGS)
    .map((f): CredFindingSummary => ({
      id: f.id,
      ruleId: f.ruleId,
      classification: f.classification,
      ruleClassification: f.ruleClassification,
      confidence: f.confidence,
      actionRisk: f.actionRisk,
      requestedAction: f.requestedAction,
      secretTypes: [...f.secretTypes],
      pretexts: [...f.pretexts],
      trustContext: [...f.trustContext],
      formDestination: f.formDestination ?? null,
      modifiers: f.modifiers.map((m) => m.id),
      overrides: f.overrides.map((o) => o.id),
      limitations: [...f.limitations],
      evidence: f.observationIds.slice(0, MAX_EVIDENCE_PER_FINDING).flatMap((id) => {
        const o = obsById.get(id);
        return o ? [item(o)] : [];
      }),
      evidenceTotal: f.observationIds.length,
    }));
  return { detectorVersion: cred.detectorVersion, experimental: true, verdict: cred.verdict, findings, findingsTotal: cred.findings.length };
}

export function buildReport(
  snapshot: PageSnapshot,
  result: AnalysisResult,
  versions: { engine: string; extractor: string },
  timing: { extractMs: number; analyzeMs: number; credentialMs?: number },
  cred?: CredentialResult,
): ScanReport {
  const obsById = new Map(result.observations.map((o) => [o.id, o]));
  const item = (o: Observation): EvidenceItem => {
    const src = o.source;
    const locator = src.type === 'block' ? snapshot.blocks.find((b) => b.id === src.blockId)?.locator
      : src.type === 'hiddenCopy' ? snapshot.hiddenCopyCandidates.find((h) => h.id === src.candidateId)?.locator
        : snapshot.copyTriggers.find((t) => t.id === src.triggerId)?.locator;
    const source: EvidenceSource = src.type === 'block' ? 'visible-text' : src.type === 'hiddenCopy' ? 'hidden-clipboard' : 'copy-control';
    return { signal: o.signal, text: clip(o.text), source, locator: locator ?? null, deobfuscated: o.deobfuscated };
  };
  const items = (ids: readonly string[]): EvidenceItem[] =>
    ids.slice(0, MAX_EVIDENCE_PER_FINDING).flatMap((id) => {
      const o = obsById.get(id);
      return o ? [item(o)] : [];
    });
  const findings = [...result.findings]
    .sort((a, b) => RANK[b.classification] - RANK[a.classification])
    .slice(0, MAX_FINDINGS)
    .map((f): FindingSummary => ({
      id: f.id,
      ruleId: f.ruleId,
      ruleName: f.ruleName,
      classification: f.classification,
      ruleClassification: f.ruleClassification,
      confidence: f.confidence,
      actionRisk: f.actionRisk,
      summary: f.summary,
      modifiers: f.modifiers.map((m) => ({ id: m.id, reason: m.reason })),
      overrides: (f.overrides ?? []).map((o) => ({ id: o.id, effect: o.effect, suppressed: [...o.suppressed], evidence: items(o.evidence) })),
      evidence: items(f.observationIds),
      evidenceTotal: f.observationIds.length,
    }));
  return {
    v: REPORT_VERSION,
    engineVersion: versions.engine,
    extractorVersion: versions.extractor,
    verdict: result.verdict,
    findings,
    coverage: result.coverage,
    status: scanStatus(result.coverage),
    counts: {
      blocks: snapshot.blocks.length,
      hiddenCopyCandidates: snapshot.hiddenCopyCandidates.length,
      copyTriggers: snapshot.copyTriggers.length,
      observations: result.observations.length,
      findingsTotal: result.findings.length,
    },
    credential: cred
      ? credentialSection(snapshot, cred)
      : { detectorVersion: '', experimental: true, verdict: 'none', findings: [], findingsTotal: 0 },
    timing: { extractMs: round(timing.extractMs), analyzeMs: round(timing.analyzeMs), credentialMs: round(timing.credentialMs ?? 0) },
  };
}
