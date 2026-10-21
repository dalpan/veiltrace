// Unified dashboard model (M5.4): aggregates the four detector sections of a validated ScanReport into one ranked list.
// Pure presentation logic: it never changes a classification, confidence or action risk, and it never merges evidence.
// Findings that point at the same page element are grouped, each keeping its own detector, rule and evidence (provenance).
import type { ScanReport } from '../content/report.js';
import type { ActionRisk, Classification, Level, Verdict } from '../../core/types.js';

export type Category = 'command' | 'credential' | 'payment' | 'support';
export const CATEGORIES: readonly Category[] = ['command', 'credential', 'payment', 'support'];

export interface FindingRef {
  /** Unique across the dashboard: `${category}:${finding id}`. */
  key: string;
  category: Category;
  id: string;
  ruleId: string;
  classification: Classification;
  confidence: Level;
  actionRisk: ActionRisk;
  /** Safe evidence locators of this finding (null locators are not used for grouping). */
  locators: string[];
  /** Position in its detector's list (tie-breaker, keeps the detector's own order). */
  index: number;
}

export interface FindingGroup {
  key: string;
  members: FindingRef[];
  /** Strongest member, used to place the group. */
  classification: Classification;
  actionRisk: ActionRisk;
  /** Locators that appear in more than one member, with the categories that cite them. */
  shared: Map<string, Category[]>;
}

export interface CategoryStatus {
  verdict: Verdict;
  total: number;
  actionable: number;
}

export interface Dashboard {
  highest: Verdict;
  /** Findings classified suspicious or manipulative, over all detectors (each finding counts once). */
  actionable: number;
  /** Categories with at least one actionable finding, in CATEGORIES order. */
  affected: Category[];
  categories: Record<Category, CategoryStatus>;
  /** Groups containing at least one actionable finding, strongest first. */
  groups: FindingGroup[];
  /** Groups of observed findings only (collapsed in the UI). */
  observed: FindingGroup[];
  complete: boolean;
}

const TIER: Record<Verdict, number> = { none: 0, observed_instruction: 1, suspicious_correlation: 2, manipulative_instruction: 3 };
const RISK: Record<ActionRisk, number> = { high: 1, medium: 0 };
const CONF: Record<Level, number> = { high: 2, medium: 1, low: 0 };

/** Order: classification, then action risk, then confidence, then detector order, then the detector's own order. */
export function compareRefs(a: FindingRef, b: FindingRef): number {
  return TIER[b.classification] - TIER[a.classification] || RISK[b.actionRisk] - RISK[a.actionRisk] || CONF[b.confidence] - CONF[a.confidence]
    || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.index - b.index;
}

export function refsOf(r: ScanReport): FindingRef[] {
  const locs = (ev: ReadonlyArray<{ locator: string | null }>): string[] => [...new Set(ev.flatMap((e) => (e.locator ? [e.locator] : [])))];
  const make = (category: Category, f: { id: string; ruleId: string; classification: Classification; confidence: Level; actionRisk: ActionRisk; evidence: ReadonlyArray<{ locator: string | null }> }, index: number): FindingRef =>
    ({ key: `${category}:${f.id}`, category, id: f.id, ruleId: f.ruleId, classification: f.classification, confidence: f.confidence, actionRisk: f.actionRisk, locators: locs(f.evidence), index });
  return [
    ...r.findings.map((f, i) => make('command', f, i)),
    ...r.credential.findings.map((f, i) => make('credential', f, i)),
    ...r.payment.findings.map((f, i) => make('payment', f, i)),
    ...r.support.findings.map((f, i) => make('support', f, i)),
  ];
}

/** Connected components of findings that share at least one evidence element. */
export function groupRefs(refs: readonly FindingRef[]): FindingGroup[] {
  const parent = refs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i] as number)));
  const owner = new Map<string, number>();
  refs.forEach((ref, i) => {
    for (const loc of ref.locators) {
      const j = owner.get(loc);
      if (j === undefined) owner.set(loc, i);
      else parent[find(i)] = find(j);
    }
  });
  const byRoot = new Map<number, FindingRef[]>();
  refs.forEach((ref, i) => byRoot.set(find(i), [...(byRoot.get(find(i)) ?? []), ref]));
  const groups = [...byRoot.values()].map((members): FindingGroup => {
    members.sort(compareRefs);
    const top = members[0] as FindingRef;
    const shared = new Map<string, Category[]>();
    if (members.length > 1) {
      for (const loc of new Set(members.flatMap((m) => m.locators))) {
        const cats = [...new Set(members.filter((m) => m.locators.includes(loc)).map((m) => m.category))];
        if (members.filter((m) => m.locators.includes(loc)).length > 1) shared.set(loc, cats);
      }
    }
    return { key: members.map((m) => m.key).join('+'), members, classification: top.classification, actionRisk: top.actionRisk, shared };
  });
  return groups.sort((a, b) => compareRefs(a.members[0] as FindingRef, b.members[0] as FindingRef));
}

export function aggregate(r: ScanReport): Dashboard {
  const refs = refsOf(r);
  const verdictOf: Record<Category, Verdict> = { command: r.verdict, credential: r.credential.verdict, payment: r.payment.verdict, support: r.support.verdict };
  const categories = Object.fromEntries(CATEGORIES.map((c) => {
    const mine = refs.filter((x) => x.category === c);
    return [c, { verdict: verdictOf[c], total: mine.length, actionable: mine.filter((x) => x.classification !== 'observed_instruction').length }];
  })) as Record<Category, CategoryStatus>;
  const highest = CATEGORIES.map((c) => verdictOf[c]).reduce((a, b) => (TIER[b] > TIER[a] ? b : a), 'none' as Verdict);
  const groups = groupRefs(refs);
  return {
    highest,
    actionable: refs.filter((x) => x.classification !== 'observed_instruction').length,
    affected: CATEGORIES.filter((c) => categories[c].actionable > 0),
    categories,
    groups: groups.filter((g) => g.classification !== 'observed_instruction'),
    observed: groups.filter((g) => g.classification === 'observed_instruction'),
    complete: r.status.complete,
  };
}
