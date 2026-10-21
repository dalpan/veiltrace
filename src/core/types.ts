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
  /** Inside a fixed/large positioned overlay (M2 extractor). Ignored by the M1 decision model. */
  overlay?: boolean;
  /** Owner block or an ancestor block/container has aria-hidden="true" (metadata only, D-023). Ignored by the decision model. */
  ariaHidden?: boolean;
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

/** Why a scan did not cover the whole rendered page (ARCHITECTURE.md §3.10). */
export type PartialReason =
  | 'node-budget' | 'block-budget' | 'char-budget' | 'timeout'
  | 'block-text-capped' | 'aux-capped' | 'frames-skipped' | 'closed-shadow-skipped';

export interface SnapshotCoverage {
  framesSkipped: number;
  truncated: boolean;
  closedShadowRootsSkipped: number;
  /** Reasons the scan is partial; empty means complete as far as the extractor can observe. Optional for hand-written snapshots. */
  partial?: PartialReason[];
}

/** Structural kind of a visible form field (from type, autocomplete, inputmode and name/id tokens; never from its value). */
export type FieldKind = 'password' | 'otp' | 'pin' | 'recovery-code' | 'secret-phrase' | 'email' | 'text' | 'other';

/**
 * A visible form field, described structurally (M5.1, extractor 0.2.0-m5). The field's value, default value or
 * any user input is never read. `label` is page-authored text: <label>, aria-label or placeholder.
 */
export interface FormField {
  id: string;
  kind: FieldKind;
  /** Structural hints that determined `kind`, e.g. "type=password", "autocomplete=one-time-code". */
  hints: string[];
  label: string;
  containerId: string;
  afterBlockId?: string;
  locator?: string;
  /** Id of the enclosing FormInfo, if any. */
  formId?: string;
  ctx?: BlockContext;
}

/** Where a form submits, as a category only. Reported as context; never a decision input (domain independence, D1). */
export type FormDestination = 'none' | 'same-origin' | 'other-origin' | 'mailto' | 'javascript' | 'data' | 'other';

export interface FormInfo {
  id: string;
  containerId: string;
  locator?: string;
  method: 'get' | 'post' | 'dialog' | 'other';
  destination: FormDestination;
  /**
   * Containers enclosing the form element, nearest first (the card, dialog or section it belongs to). Stops after the
   * first user-content, widget or frame container; at most 8. Structural identifiers only.
   */
  ancestorContainerIds?: string[];
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
  /** M5.1: visible form fields (structure only). Ignored by the ClickFix engine. Optional for older snapshots. */
  formFields?: FormField[];
  /** M5.1: forms that contain recorded fields. Ignored by the ClickFix engine. */
  forms?: FormInfo[];
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
export type ModifierId = 'C.QUOTED' | 'C.REPORTED' | 'C.EDUCATIONAL' | 'C.CODE_EXAMPLE' | 'C.PROCEDURAL';

/** M4.1 research: evidence that the instruction targets the current reader, which overrides contextual demotion. */
export type OverrideId = 'O.CONCEALED_PAYLOAD' | 'O.VERIFICATION_GATE';

export interface ContextOverride {
  id: OverrideId;
  reason: string;
  /** Modifiers whose demotion was suppressed (or capped). */
  suppressed: ModifierId[];
  effect: 'suppressed' | 'capped-at-1';
  /** Observation ids supporting the override (e.g. the concealed clipboard payload). */
  evidence: string[];
}

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
  /** Present only when an M4.1 research override applied (absent under the M1 model). */
  overrides?: ContextOverride[];
  /** Plain-English inference statement (not localized in M1). */
  summary: string;
}

/**
 * Research/ablation switches (M2). Omitting them, or passing {}, reproduces the M1 decision model exactly.
 * Production callers (the extension) must use the defaults; changing a default requires a DECISIONS.md entry.
 */
export interface AnalyzeOptions {
  /** Correlation window in blocks (default WINDOW_BLOCKS = 8). Infinity = whole region. */
  windowBlocks?: number;
  /** Apply C.QUOTED / C.REPORTED / C.EDUCATIONAL / C.CODE_EXAMPLE (default true). */
  contextModifiers?: boolean;
  /** Bind negation cues to actions (default true). */
  negation?: boolean;
  /** Candidate rule changes under evaluation. Not part of the accepted model. */
  experimental?: {
    /** R4 requires at least this many weak pretext families (M1: 1). */
    r4MinWeakFamilies?: number;
    /** R4 does not fire when P.AUTHORITY is the only weak pretext family. */
    r4ExcludeAuthorityOnly?: boolean;
    /** Context modifiers do not demote findings whose evidence lies entirely in dialogs/overlays. REJECTED (D-032); kept to reproduce M2. */
    noDemotionInDialogs?: boolean;
    /** P1b: like r4ExcludeAuthorityOnly, but an authority-only R4 still fires when the region stages a concealed clipboard payload. */
    r4AuthorityOnlyUnlessConcealed?: boolean;
    /** P2-A: a concealed clipboard payload in the finding's region suppresses contextual demotion. */
    concealedPayloadOverride?: boolean;
    /** P2-B ('skip') / P2-C ('cap1'): terse verification dialog/overlay addressed to the reader overrides demotion. */
    verificationGateOverride?: 'skip' | 'cap1';
    /** P2-D: a reported-speech list introduction does not bind inside dialogs/overlays. */
    reportedListIntroOutsideDialogsOnly?: boolean;
    /** R4-β: C.PROCEDURAL demotes single-family R4 findings in procedural documents (article + code block). */
    proceduralDocModifier?: boolean;
  };
  /**
   * Named rule set. Default 'm4.1' (engine 0.2.0, D-055) = M1 + P1b + P2-A + R4-beta. 'm1' is the M1 baseline
   * (engine 0.1.0-m1), kept for comparison and research. 'm4.1-rc1' is a legacy alias of 'm4.1'.
   * `experimental` flags are applied on top of the selected rule set.
   */
  ruleset?: 'm1' | 'm4.1' | 'm4.1-rc1';
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
