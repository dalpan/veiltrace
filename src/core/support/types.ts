// Data contracts of the EXPERIMENTAL fake-support and authority-impersonation detector (M5.3). See docs/DETECTION_MODEL.md §14.
// Independent of the ClickFix, credential and payment detectors: it reads the same PageSnapshot (block text only) and never
// changes their results. A claimed identity is never treated as verified, and an organization is never called fake.
import type { ActionRisk, Classification, Lang, Level, Strength, Verdict } from '../types.js';

/** What the reader is directed to do. */
export type SupportActionSignalId = 'SC.CONTACT' | 'SA.REMOTE' | 'SA.INSTALL';
/** The channel of a contact direction. Phone numbers are matched but never reported. */
export type SupportChannelSignalId = 'SX.PHONE' | 'SX.MOBILE' | 'SX.MESSENGER';
/** Claimed identity: a claim only, never evidence of who wrote the text. */
export type SupportClaimSignalId = 'SI.SUPPORT' | 'SI.BANK' | 'SI.ADMIN' | 'SI.SECURITY';
/** Pressure: a page-rendered system or browser alarm, a threat to the account or data, urgency. */
export type SupportPressureSignalId = 'SW.ALERT' | 'ST.THREAT' | 'SU.URGENCY';
export type SupportSignalId = SupportActionSignalId | SupportChannelSignalId | SupportClaimSignalId | SupportPressureSignalId
  | 'SH.UNASSERTED' | 'C.NEGATION' | 'C.REPORTED' | 'C.EDUCATIONAL';
export type SupportSignalKind = 'action' | 'channel' | 'claim' | 'pressure' | 'context';

export interface SupportLexiconEntry {
  id: string;
  signal: SupportSignalId;
  lang: Lang;
  strength: Strength;
  pattern: RegExp;
  examples: string[];
}

export interface SupportObservation {
  id: string;
  signal: SupportSignalId;
  kind: SupportSignalKind;
  entryId: string;
  blockId: string;
  /** UTF-16 offsets into the block text. */
  start: number;
  end: number;
  /** Matched page text with digit runs and @handles masked. Always "" for phone numbers. */
  text: string;
  regionId: string;
  /** Negated ("never call"), or for an alert, unasserted ("if your computer is infected", "a pop-up that says …"). */
  negated: boolean;
  reported: boolean;
}

export type SupportRuleId = 'SR1' | 'SR2' | 'SR3' | 'SR4' | 'SR5';
export type SupportModifierId = 'C.QUOTED' | 'C.REPORTED' | 'C.EDUCATIONAL' | 'C.CODE_EXAMPLE';
export type SupportAction = 'contact' | 'remote-access' | 'install';
export type SupportChannel = 'phone' | 'mobile' | 'messenger';
export type SupportClaim = 'support' | 'bank' | 'administrator' | 'security-team';
export type SupportPressure = 'system-alert' | 'threat' | 'urgency';
/**
 * Observable impersonation indicators: facts about the page, as opposed to what it claims. None of them proves who wrote it.
 * - page-rendered-system-alert: a virus/lock alarm drawn by the web page (browsers and operating systems do not alert inside pages)
 * - remote-access-request / software-install-request: the direction itself
 * - personal-channel-contact: an official-sounding claim routed to a mobile number or messenger account
 * - claim-in-user-content: an official claim posted inside comments or other user content
 * - alert-in-overlay: the alarm sits in an overlay or dialog covering the page
 */
export type ImpersonationIndicator = 'page-rendered-system-alert' | 'remote-access-request' | 'software-install-request' | 'personal-channel-contact'
  | 'claim-in-user-content' | 'alert-in-overlay';
export type SupportTrustContext = 'user-content' | 'third-party-widget' | 'embedded-frame' | 'dialog' | 'overlay' | 'form';
export type SupportLimitation = 'claimed-identity-unverifiable' | 'trust-boundary-heuristic' | 'contact-details-not-reported';

export interface SupportModifier {
  id: SupportModifierId;
  demoteBy: 1 | 2;
  reason: string;
  evidence: string[];
}

export interface SupportFinding {
  id: string;
  category: 'support_impersonation';
  ruleId: SupportRuleId;
  ruleName: string;
  classification: Classification;
  ruleClassification: Classification;
  confidence: Level;
  actionRisk: ActionRisk;
  requestedActions: SupportAction[];
  channels: SupportChannel[];
  claims: SupportClaim[];
  indicators: ImpersonationIndicator[];
  pressures: SupportPressure[];
  trustContext: SupportTrustContext[];
  regionId: string;
  observationIds: string[];
  modifiers: SupportModifier[];
  limitations: SupportLimitation[];
  summary: string;
}

export interface SupportResult {
  detector: 'support';
  detectorVersion: string;
  experimental: true;
  schemaVersion: 1;
  verdict: Verdict;
  findings: SupportFinding[];
  observations: SupportObservation[];
}
