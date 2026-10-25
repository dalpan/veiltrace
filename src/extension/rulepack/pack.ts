// Organization rule packs (D-109): extra lexicon entries for the credential, payment and support detectors, written by an
// organization's security team, signed with its Ed25519 key and delivered by browser policy to the managed build. Pure:
// parsing, validation and compilation. A pack adds signals of the existing types; it cannot change rules, thresholds,
// the ClickFix engine or anything a scan reports beyond those signals.
import type { CredLexiconEntry } from '../../core/credential/types.js';
import { normalize } from '../../core/normalize.js';
import type { PayLexiconEntry } from '../../core/payment/types.js';
import type { SupportLexiconEntry } from '../../core/support/types.js';

export type PackDetector = 'cred' | 'pay' | 'sup';
export interface PackEntry { id: string; detector: PackDetector; signal: string; lang: 'id' | 'en'; strength: 'strong' | 'weak'; pattern: string; examples: string[] }
export interface RulePack { format: 'veiltrace-rulepack'; v: 1; id: string; issuer: string; issued: string; entries: PackEntry[] }
export interface Extras { cred: CredLexiconEntry[]; pay: PayLexiconEntry[]; sup: SupportLexiconEntry[] }

/** Signals a pack may add, per detector: everything except the shared context cues and the form-field signal. */
const SIGNALS: Record<PackDetector, readonly string[]> = {
  cred: ['S.PASSWORD', 'S.OTP', 'S.PIN', 'S.RECOVERY_CODE', 'S.SEED_PHRASE', 'S.TOKEN', 'D.SEND', 'D.ENTER', 'CP.ACCOUNT_THREAT', 'CP.URGENCY', 'CP.SUPPORT', 'CP.VERIFY', 'CP.REWARD'],
  pay: ['PY.PAY', 'PA.AMOUNT', 'PF.FEE', 'PF.RELEASE_FEE', 'PD.PERSONAL', 'PD.OFF_PLATFORM', 'PD.GIFT_CARD', 'PD.CRYPTO', 'PR.REFUND', 'PR.PRIZE', 'PR.UNLOCK', 'PR.RECRUIT', 'PR.JOB', 'PR.INVEST', 'PR.LOAN', 'PC.CONDITION', 'PP.THREAT', 'PP.URGENCY', 'PP.AUTHORITY', 'PP.FAMILY'],
  sup: ['SC.CONTACT', 'SC.RESPOND', 'SC.SURVEY', 'SA.REMOTE', 'SA.INSTALL', 'SA.DISABLE', 'SX.MESSENGER', 'SX.LINK', 'SX.APK', 'SI.SUPPORT', 'SI.BANK', 'SI.ADMIN', 'SI.SECURITY', 'SI.OFFICIAL', 'SI.ORG', 'SW.ALERT', 'SW.ACCOUNT', 'ST.THREAT', 'SU.URGENCY', 'SP.REWARD', 'SP.WON', 'SO.ILLICIT', 'SO.PROXY', 'SD.DOCUMENT'],
};

export const MAX_ENTRIES = 500;
const MAX_PATTERN = 300;
/** Nested quantifiers ("(a+)+", "(\w*)*") can backtrack catastrophically; a signed pack still may not use them. */
const NESTED_QUANTIFIER = /\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)[+*{]/u;

function compile(pattern: string): RegExp | null {
  if (pattern.length === 0 || pattern.length > MAX_PATTERN || NESTED_QUANTIFIER.test(pattern)) return null;
  try {
    return new RegExp(pattern, 'gu');
  } catch {
    return null;
  }
}

/** Exact-shape validation. Every entry must compile, use an allowed signal and match each of its own examples. */
export function parsePack(x: unknown): RulePack | null {
  if (typeof x !== 'object' || x === null) return null;
  const p = x as Record<string, unknown>;
  if (p.format !== 'veiltrace-rulepack' || p.v !== 1) return null;
  if (typeof p.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(p.id)) return null;
  if (typeof p.issuer !== 'string' || p.issuer.length === 0 || p.issuer.length > 120) return null;
  if (typeof p.issued !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(p.issued)) return null;
  if (!Array.isArray(p.entries) || p.entries.length === 0 || p.entries.length > MAX_ENTRIES) return null;
  const entries: PackEntry[] = [];
  const ids = new Set<string>();
  for (const raw of p.entries as unknown[]) {
    if (typeof raw !== 'object' || raw === null) return null;
    const e = raw as Record<string, unknown>;
    const detector = e.detector as PackDetector;
    if (!(detector in SIGNALS) || typeof e.signal !== 'string' || !SIGNALS[detector].includes(e.signal)) return null;
    if (typeof e.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,79}$/u.test(e.id) || ids.has(e.id)) return null;
    if (e.lang !== 'id' && e.lang !== 'en') return null;
    if (e.strength !== 'strong' && e.strength !== 'weak') return null;
    if (typeof e.pattern !== 'string' || !Array.isArray(e.examples) || e.examples.length === 0 || e.examples.length > 10) return null;
    const re = compile(e.pattern);
    if (!re || !e.examples.every((ex) => typeof ex === 'string' && ex.length <= 200 && [...normalize(ex).text.matchAll(re)].length > 0)) return null;
    ids.add(e.id);
    entries.push({ id: e.id, detector, signal: e.signal, lang: e.lang, strength: e.strength, pattern: e.pattern, examples: e.examples as string[] });
  }
  return { format: 'veiltrace-rulepack', v: 1, id: p.id, issuer: p.issuer, issued: p.issued, entries };
}

/** Lexicon entries for the detectors. Entry ids carry the pack id, so evidence from a pack is traceable to it. */
export function compileExtras(packs: readonly RulePack[]): Extras {
  const out: Extras = { cred: [], pay: [], sup: [] };
  for (const pack of packs) {
    for (const e of pack.entries) {
      const pattern = compile(e.pattern);
      if (!pattern) continue;
      const entry = { id: `pack:${pack.id}:${e.id}`, signal: e.signal, lang: e.lang, strength: e.strength, pattern, examples: e.examples };
      if (e.detector === 'cred') out.cred.push(entry as CredLexiconEntry);
      else if (e.detector === 'pay') out.pay.push(entry as PayLexiconEntry);
      else out.sup.push(entry as SupportLexiconEntry);
    }
  }
  return out;
}

/** Validates packs received from the popup (executeScript arguments) before the tab compiles them. */
export function parsePacks(x: unknown): RulePack[] {
  if (!Array.isArray(x) || x.length > 20) return [];
  return x.map(parsePack).filter((p): p is RulePack => p !== null);
}
