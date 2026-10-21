// Data contracts of the EXPERIMENTAL payment-manipulation detector (M5.2). See docs/DETECTION_MODEL.md §13.
// Independent of the ClickFix and credential detectors: it reads the same PageSnapshot (block text only, never form
// fields) and never changes their results.
import type { ActionRisk, Classification, Lang, Level, Strength, Verdict } from '../types.js';

/** A request to pay or transfer money addressed to the reader. */
export type PayRequestSignalId = 'PY.PAY';
/** What the payment is: an amount (value never reported), a fee, or a fee whose purpose is to release something. */
export type PayObjectSignalId = 'PA.AMOUNT' | 'PF.FEE' | 'PF.RELEASE_FEE';
/** Where the money goes, when that is outside an ordinary checkout. */
export type PayDestinationSignalId = 'PD.PERSONAL' | 'PD.OFF_PLATFORM' | 'PD.GIFT_CARD' | 'PD.CRYPTO';
/** Something the reader is promised in return (pay-to-receive), and the clause that ties the payment to it. */
export type PayReceiveSignalId = 'PR.REFUND' | 'PR.PRIZE' | 'PR.UNLOCK' | 'PC.CONDITION';
/** Pressure. PP.AUTHORITY is a claim only and is never verified. */
export type PayPressureSignalId = 'PP.THREAT' | 'PP.URGENCY' | 'PP.AUTHORITY';
export type PaySignalId = PayRequestSignalId | PayObjectSignalId | PayDestinationSignalId | PayReceiveSignalId | PayPressureSignalId
  | 'C.NEGATION' | 'C.REPORTED' | 'C.EDUCATIONAL';
export type PaySignalKind = 'request' | 'object' | 'destination' | 'receive' | 'pressure' | 'context';

export interface PayLexiconEntry {
  id: string;
  signal: PaySignalId;
  lang: Lang;
  strength: Strength;
  pattern: RegExp;
  examples: string[];
}

export interface PayObservation {
  id: string;
  signal: PaySignalId;
  kind: PaySignalKind;
  entryId: string;
  blockId: string;
  /** UTF-16 offsets into the block text. */
  start: number;
  end: number;
  /** Matched page text with long digit runs masked. Always "" for PA.AMOUNT: amounts and balances are never reported. */
  text: string;
  regionId: string;
  negated: boolean;
  reported: boolean;
}

export type PayRuleId = 'PR1' | 'PR2' | 'PR3' | 'PR4';
export type PayModifierId = 'C.QUOTED' | 'C.REPORTED' | 'C.EDUCATIONAL' | 'C.CODE_EXAMPLE';
/** What the reader is promised for paying (pay-to-receive schemes). */
export type PayPromise = 'refund' | 'prize' | 'account-unlock' | 'release';
export type PayDestination = 'personal-account' | 'off-platform' | 'gift-card' | 'crypto';
export type PayPressure = 'threat' | 'urgency' | 'claimed-authority';
/** Observable placement of the request (same heuristic as the credential detector). */
export type PayTrustContext = 'user-content' | 'third-party-widget' | 'embedded-frame' | 'dialog' | 'overlay' | 'form';
export type PayLimitation = 'claimed-identity-unverifiable' | 'trust-boundary-heuristic' | 'amount-not-reported';

export interface PayModifier {
  id: PayModifierId;
  demoteBy: 1 | 2;
  reason: string;
  evidence: string[];
}

export interface PayFinding {
  id: string;
  category: 'payment_manipulation';
  ruleId: PayRuleId;
  ruleName: string;
  classification: Classification;
  ruleClassification: Classification;
  confidence: Level;
  actionRisk: ActionRisk;
  promises: PayPromise[];
  destinations: PayDestination[];
  pressures: PayPressure[];
  trustContext: PayTrustContext[];
  regionId: string;
  observationIds: string[];
  modifiers: PayModifier[];
  limitations: PayLimitation[];
  summary: string;
}

export interface PaymentResult {
  detector: 'payment';
  detectorVersion: string;
  experimental: true;
  schemaVersion: 1;
  verdict: Verdict;
  findings: PayFinding[];
  observations: PayObservation[];
}
