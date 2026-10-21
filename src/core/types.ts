// Data contracts of the detection core. See docs/DETECTION_MODEL.md and docs/ARCHITECTURE.md §4.

// ---------- Input: PageSnapshot (produced by the M2 extractor) ----------

export interface BlockContext {
  pre?: boolean;
  code?: boolean;
  /** Inside blockquote / q / cite. */
  quote?: boolean;
  /** Inside article / main. */
  article?: boolean;
  dialog?: boolean;
  form?: boolean;
  /** Inside a user-generated-content container (comments, reviews). Used from M4. */
  ugc?: boolean;
}

export interface Block {
  id: string;
  /** Visible text of one block-level element, as rendered. */
  text: string;
  /** Nearest boundary container (dialog, section, article, form, overlay, comment, body). */
  containerId: string;
  /** Opaque element reference for a browser adapter; never interpreted by the core. */
  locator?: string;
  ctx?: BlockContext;
  /** Nearest preceding h1–h3 text. */
  headingContext?: string | null;
}

/** Text a page can place on the clipboard but that the reader does not see. */
export interface HiddenCopyCandidate {
  id: string;
  text: string;
  containerId: string;
  /** Position in reading order; omitted means "start of its region". */
  afterBlockId?: string;
  via: 'input' | 'data-attr' | 'hidden-el';
  locator?: string;
}

/** A control that copies text to the clipboard (copy/verify buttons). */
export interface CopyTrigger {
  id: string;
  label: string;
  containerId: string;
  afterBlockId?: string;
  locator?: string;
}

export interface SnapshotCoverage {
  framesSkipped: number;
  truncated: boolean;
  closedShadowRootsSkipped: number;
}

export interface PageSnapshot {
  schemaVersion: 1;
  /** Echoed for adapters only. The core never reads it (domain independence). */
  url: string;
  /** Not used for decisions: page-global text must not influence regions. */
  title: string;
  lang: string | null;
  blocks: Block[];
  hiddenCopyCandidates: HiddenCopyCandidate[];
  copyTriggers: CopyTrigger[];
  coverage: SnapshotCoverage;
}

// ---------- Signals and lexicon ----------

export type ActionSignalId = 'A.OPEN_RUN' | 'A.PASTE' | 'A.EXECUTE' | 'A.COMMAND' | 'A.COPY_TRIGGER';
export type PretextSignalId = 'P.HUMAN_VERIFY' | 'P.FAKE_FIX' | 'P.URGENCY' | 'P.AUTHORITY';
export type ContextSignalId = 'C.NEGATION' | 'C.REPORTED' | 'C.EDUCATIONAL';
export type SignalId = ActionSignalId | PretextSignalId | ContextSignalId;

export type SignalKind = 'action' | 'pretext' | 'context';
export type Lang = 'en' | 'id' | 'any';
export type Strength = 'strong' | 'weak';

/** Static description of a signal type. */
export interface Signal {
  id: SignalId;
  kind: SignalKind;
  description: string;
}

export interface LexiconEntry {
  id: string;
  signal: SignalId;
  lang: Lang;
  strength: Strength;
  /** Matched against normalized text (lowercase, NFKC, folded). Must have the `g` and `u` flags. */
  pattern: RegExp;
  /** Original-form strings this entry must match; asserted by tests. */
  examples: string[];
}

// ---------- Observations ----------

export type SourceRef =
  | { type: 'block'; blockId: string }
  | { type: 'hiddenCopy'; candidateId: string }
  | { type: 'copyTrigger'; triggerId: string };

export interface Observation {
  /** Deterministic: "o<index>" in source order. */
  id: string;
  signal: SignalId;
  kind: SignalKind;
  entryId: string;
  lang: Lang;
  strength: Strength;
  source: SourceRef;
  /** UTF-16 offsets into the source's original text; text === sourceText.slice(start, end). */
  start: number;
  end: number;
  text: string;
  /** Zero-width or confusable characters were removed/folded inside the match. */
  deobfuscated: boolean;
  regionId: string;
  /** Action bound to a negation cue: not an instruction to the reader (C.NEGATION). */
  negated: boolean;
  /** Action preceded by a reported-speech cue (C.REPORTED). */
  reported: boolean;
}

// ---------- Regions ----------

export interface Region {
  /** "<containerId>:<firstBlockId>-<lastBlockId>", stable for a given snapshot. */
  id: string;
  containerId: string;
  blockIds: string[];
}

// ---------- Findings ----------

export type Classification = 'observed_instruction' | 'suspicious_correlation' | 'manipulative_instruction';
export type Verdict = Classification | 'none';
export type Level = 'high' | 'medium' | 'low';
export type ActionRisk = 'high' | 'medium';

export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
export type ModifierId = 'C.QUOTED' | 'C.REPORTED' | 'C.EDUCATIONAL' | 'C.CODE_EXAMPLE';

export interface AppliedModifier {
  id: ModifierId;
  /** Tiers demoted by this modifier before the global cap of 2. */
  demoteBy: 1 | 2;
  reason: string;
  /** Observations or blocks that triggered the modifier. */
  evidence: string[];
}

export interface Finding {
  /** Deterministic: "f<index>" in selection order. */
  id: string;
  ruleId: RuleId;
  ruleName: string;
  /** Final classification after context modifiers. */
  classification: Classification;
  /** Classification the rule produced before modifiers. */
  ruleClassification: Classification;
  /** Strength of evidence for `classification`. Independent of `actionRisk`. */
  confidence: Level;
  /** Potential harm if the instruction is followed and malicious. Independent of `confidence`. */
  actionRisk: ActionRisk;
  regionId: string;
  /** Inclusive block span of the evidence, in reading order. */
  span: { firstBlockId: string; lastBlockId: string };
  observationIds: string[];
  modifiers: AppliedModifier[];
  /** Plain-English inference statement (not localized in M1). */
  summary: string;
}

export interface AnalysisResult {
  engineVersion: string;
  schemaVersion: 1;
  verdict: Verdict;
  findings: Finding[];
  observations: Observation[];
  regions: Region[];
  coverage: SnapshotCoverage & { coreTruncated: boolean };
}
