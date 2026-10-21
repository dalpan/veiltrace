// Data contracts of the EXPERIMENTAL credential-disclosure detector (M5.1). See docs/DETECTION_MODEL.md §12.
// Independent of the ClickFix engine: it reads the same PageSnapshot and never changes ClickFix results.
import type { ActionRisk, Classification, FieldKind, FormDestination, Lang, Level, Strength, Verdict } from '../types.js';

/** What secret is requested. */
export type SecretSignalId = 'S.PASSWORD' | 'S.OTP' | 'S.PIN' | 'S.RECOVERY_CODE' | 'S.SEED_PHRASE' | 'S.TOKEN';
/** What the reader is asked to do with it: give it to someone (send) or type it into the page (enter). */
export type DisclosureSignalId = 'D.SEND' | 'D.ENTER';
/** Manipulative context. CP.VERIFY and CP.SUPPORT are ordinary in legitimate flows and never escalate on their own. */
export type CredPretextSignalId = 'CP.ACCOUNT_THREAT' | 'CP.URGENCY' | 'CP.SUPPORT' | 'CP.VERIFY' | 'CP.REWARD';
/** Structural evidence: a visible field for a secret. */
export type FieldSignalId = 'F.SECRET_FIELD';
export type CredSignalId = SecretSignalId | DisclosureSignalId | CredPretextSignalId | FieldSignalId | 'C.NEGATION' | 'C.REPORTED' | 'C.EDUCATIONAL';
export type CredSignalKind = 'secret' | 'disclosure' | 'pretext' | 'field' | 'context';

export interface CredLexiconEntry {
  id: string;
  signal: Exclude<CredSignalId, FieldSignalId>;
  lang: Lang;
  strength: Strength;
  pattern: RegExp;
  examples: string[];
}

export type CredSourceRef = { type: 'block'; blockId: string } | { type: 'field'; fieldId: string };

export interface CredObservation {
  id: string;
  signal: CredSignalId;
  kind: CredSignalKind;
  entryId: string;
  source: CredSourceRef;
  /** UTF-16 offsets into the source text (block text or the field's page-authored label). */
  start: number;
  end: number;
  /** Page-authored text only. For a field: its label, or "" when it has none. Never a field value. */
  text: string;
  regionId: string;
  negated: boolean;
  reported: boolean;
  /** For F.SECRET_FIELD: the structural field kind. */
  fieldKind?: FieldKind;
}

export type CredRuleId = 'CR1' | 'CR2' | 'CR3' | 'CR4' | 'CR5';
export type CredModifierId = 'C.QUOTED' | 'C.REPORTED' | 'C.EDUCATIONAL' | 'C.CODE_EXAMPLE';
export type CredOverrideId = 'O.LIVE_SECRET_FIELD';
export type SecretType = 'password' | 'otp' | 'pin' | 'recovery-code' | 'recovery-phrase' | 'token';
/** Observable placement of the request. Claims of identity ("official support") are never treated as verified. */
export type TrustContext = 'user-content' | 'third-party-widget' | 'embedded-frame' | 'dialog' | 'overlay' | 'form';

export interface CredModifier {
  id: CredModifierId;
  demoteBy: 1 | 2;
  reason: string;
  evidence: string[];
}

export interface CredOverride {
  id: CredOverrideId;
  reason: string;
  suppressed: CredModifierId[];
  evidence: string[];
}

export interface CredFinding {
  id: string;
  category: 'credential_disclosure';
  ruleId: CredRuleId;
  ruleName: string;
  classification: Classification;
  ruleClassification: Classification;
  confidence: Level;
  actionRisk: ActionRisk;
  requestedAction: 'send' | 'enter';
  secretTypes: SecretType[];
  pretexts: CredPretextSignalId[];
  trustContext: TrustContext[];
  /** Category of the enclosing form's target, when a field is involved. Context only; never scored. */
  formDestination?: FormDestination;
  regionId: string;
  observationIds: string[];
  modifiers: CredModifier[];
  overrides: CredOverride[];
  /** Explicit uncertainty notes, e.g. that a claimed identity cannot be verified. */
  limitations: Array<'claimed-identity-unverifiable' | 'destination-not-scored' | 'trust-boundary-heuristic'>;
  summary: string;
}

export interface CredentialResult {
  detector: 'credential';
  detectorVersion: string;
  experimental: true;
  schemaVersion: 1;
  verdict: Verdict;
  findings: CredFinding[];
  observations: CredObservation[];
}
