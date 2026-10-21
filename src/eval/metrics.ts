// Scenario-level metrics with Wilson score intervals (EVALUATION_PLAN.md §4).
import type { ExpectedClass, Truth } from './corpus.js';

export interface Rate {
  k: number;
  n: number;
  /** k / n, or null when n = 0. */
  value: number | null;
  /** Wilson 95% interval, or null when n = 0. */
  ci95: [number, number] | null;
}

const Z = 1.959963984540054;

/** Unrounded proportion and Wilson 95% interval (n > 0). */
export function wilsonExact(k: number, n: number): { value: number; ci95: [number, number] } {
  const p = k / n;
  const denom = 1 + (Z * Z) / n;
  const centre = (p + (Z * Z) / (2 * n)) / denom;
  const half = (Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n))) / denom;
  return { value: p, ci95: [Math.max(0, centre - half), Math.min(1, centre + half)] };
}

/** Rate rounded to 4 decimals for the JSON results. */
export function wilson(k: number, n: number): Rate {
  if (n === 0) return { k, n, value: null, ci95: null };
  const { value, ci95 } = wilsonExact(k, n);
  const r = (x: number): number => Math.round(x * 10000) / 10000;
  return { k, n, value: r(value), ci95: [r(ci95[0]), r(ci95[1])] };
}

export const CLASS_ORDER: readonly ExpectedClass[] = ['none', 'observed_instruction', 'suspicious_correlation', 'manipulative_instruction'];

export const isPositive = (c: ExpectedClass): boolean => c === 'suspicious_correlation' || c === 'manipulative_instruction';

export interface ScoredScenario {
  id: string;
  truth: Truth;
  expectedClass: ExpectedClass;
  hardNegative: boolean;
  lang: 'en' | 'id';
  category: string;
  predicted: ExpectedClass;
  /** null when not a true positive (localization only applies to TPs). */
  localized: boolean | null;
}

export interface SystemMetrics {
  scenarios: number;
  confusion: { tp: number; fp: number; tn: number; fn: number };
  precision: Rate;
  recall: Rate;
  fpr: Rate;
  hardNegativeFpr: Rate;
  localization: Rate;
  /** Rows = expected class, columns = predicted class (CLASS_ORDER). */
  classMatrix: number[][];
  exactClassAgreement: Rate;
  observedOnNegatives: number;
  byLanguage: Record<string, { recall: Rate; fpr: Rate }>;
}

export function computeMetrics(rows: readonly ScoredScenario[]): SystemMetrics {
  const c = { tp: 0, fp: 0, tn: 0, fn: 0 };
  let hnFp = 0;
  let hnN = 0;
  let loc = 0;
  let observedOnNegatives = 0;
  const matrix = CLASS_ORDER.map(() => CLASS_ORDER.map(() => 0));
  for (const r of rows) {
    const pos = isPositive(r.predicted);
    if (r.truth === 'malicious') {
      if (pos) c.tp++;
      else c.fn++;
    } else {
      if (pos) c.fp++;
      else c.tn++;
      if (r.predicted === 'observed_instruction') observedOnNegatives++;
      if (r.hardNegative) {
        hnN++;
        if (pos) hnFp++;
      }
    }
    if (r.localized) loc++;
    const matrixRow = matrix[CLASS_ORDER.indexOf(r.expectedClass)] as number[];
    const col = CLASS_ORDER.indexOf(r.predicted);
    matrixRow[col] = (matrixRow[col] ?? 0) + 1;
  }
  const byLanguage: SystemMetrics['byLanguage'] = {};
  for (const lang of ['en', 'id']) {
    const sub = rows.filter((r) => r.lang === lang);
    const mal = sub.filter((r) => r.truth === 'malicious');
    const ben = sub.filter((r) => r.truth === 'benign');
    byLanguage[lang] = {
      recall: wilson(mal.filter((r) => isPositive(r.predicted)).length, mal.length),
      fpr: wilson(ben.filter((r) => isPositive(r.predicted)).length, ben.length),
    };
  }
  return {
    scenarios: rows.length,
    confusion: c,
    precision: wilson(c.tp, c.tp + c.fp),
    recall: wilson(c.tp, c.tp + c.fn),
    fpr: wilson(c.fp, c.fp + c.tn),
    hardNegativeFpr: wilson(hnFp, hnN),
    localization: wilson(loc, c.tp),
    classMatrix: matrix,
    exactClassAgreement: wilson(rows.filter((r) => r.predicted === r.expectedClass).length, rows.length),
    observedOnNegatives,
    byLanguage,
  };
}

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round((sorted[i] as number) * 100) / 100;
}
