// JSON + Markdown writers for evaluation results.
import type { Scenario } from './corpus.js';
import { CLASS_ORDER, wilsonExact, type Rate, type SystemMetrics } from './metrics.js';

/** Percentages are computed from k/n, not from the 4-decimal JSON values, to avoid double rounding (1/29 → 3.4%, not 3.5%). */
export function fmtRate(r: Rate): string {
  if (r.n === 0) return `– (0/0)`;
  const { value, ci95 } = wilsonExact(r.k, r.n);
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
  return `${pct(value)} (${r.k}/${r.n}; 95% CI ${pct(ci95[0])}–${pct(ci95[1])})`;
}

export function composition(scenarios: readonly Scenario[]): Record<string, number> {
  const out: Record<string, number> = { total: scenarios.length };
  for (const { label: l } of scenarios) {
    for (const key of [`truth:${l.truth}`, `category:${l.category}`, `lang:${l.lang}`, ...(l.hardNegative ? ['hardNegative'] : [])]) {
      out[key] = (out[key] ?? 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function systemsTable(metrics: Record<string, SystemMetrics>): string {
  const rows = Object.entries(metrics).map(([id, m]) =>
    `| ${id} | ${m.confusion.tp} | ${m.confusion.fp} | ${m.confusion.tn} | ${m.confusion.fn} | ${fmtRate(m.precision)} | ${fmtRate(m.recall)} | ${fmtRate(m.fpr)} | ${fmtRate(m.hardNegativeFpr)} | ${fmtRate(m.localization)} |`);
  return ['| System | TP | FP | TN | FN | Precision | Recall | FPR | Hard-neg FPR | Localization |', '|---|---|---|---|---|---|---|---|---|---|', ...rows].join('\n');
}

export function classMatrix(m: SystemMetrics): string {
  const short = ['none', 'observed', 'suspicious', 'manipulative'];
  return [
    `| expected \\ predicted | ${short.join(' | ')} |`, `|---|${short.map(() => '---').join('|')}|`,
    ...CLASS_ORDER.map((c, i) => `| ${short[i]} | ${(m.classMatrix[i] as number[]).join(' | ')} |`),
  ].join('\n');
}
