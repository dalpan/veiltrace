// Builds the minimal report sent from the tab's isolated world to the popup. The raw PageSnapshot never
// leaves the tab: only verdict, findings, the evidence snippets of those findings, coverage and counts.
import { scanStatus, type ScanStatus } from '../../core/coverage.js';
import type {
  ActionRisk, AnalysisResult, Classification, Level, ModifierId, PageSnapshot, RuleId, SignalId, Verdict,
} from '../../core/types.js';

export const REPORT_VERSION = 1;
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
  evidence: EvidenceItem[];
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
  timing: { extractMs: number; analyzeMs: number };
}

const clip = (s: string): string => (s.length > MAX_SNIPPET_CHARS ? `${s.slice(0, MAX_SNIPPET_CHARS - 1)}…` : s);
const round = (n: number): number => Math.round(n * 10) / 10;

const RANK: Record<Classification, number> = { manipulative_instruction: 2, suspicious_correlation: 1, observed_instruction: 0 };

export function buildReport(
  snapshot: PageSnapshot,
  result: AnalysisResult,
  versions: { engine: string; extractor: string },
  timing: { extractMs: number; analyzeMs: number },
): ScanReport {
  const obsById = new Map(result.observations.map((o) => [o.id, o]));
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
      evidence: f.observationIds.slice(0, MAX_EVIDENCE_PER_FINDING).flatMap((id) => {
        const o = obsById.get(id);
        if (!o) return [];
        const src = o.source;
        const locator = src.type === 'block' ? snapshot.blocks.find((b) => b.id === src.blockId)?.locator
          : src.type === 'hiddenCopy' ? snapshot.hiddenCopyCandidates.find((h) => h.id === src.candidateId)?.locator
            : snapshot.copyTriggers.find((t) => t.id === src.triggerId)?.locator;
        const source: EvidenceSource = src.type === 'block' ? 'visible-text' : src.type === 'hiddenCopy' ? 'hidden-clipboard' : 'copy-control';
        return [{ signal: o.signal, text: clip(o.text), source, locator: locator ?? null, deobfuscated: o.deobfuscated }];
      }),
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
    timing: { extractMs: round(timing.extractMs), analyzeMs: round(timing.analyzeMs) },
  };
}
