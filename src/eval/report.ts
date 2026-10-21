// JSON + Markdown writers for evaluation results.
import type { Scenario } from './corpus.js';
import { CLASS_ORDER, type Rate, type SystemMetrics } from './metrics.js';

export function fmtRate(r: Rate): string {
  if (r.value === null || r.ci95 === null) return `– (0/0)`;
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
  return `${pct(r.value)} (${r.k}/${r.n}; 95% CI ${pct(r.ci95[0])}–${pct(r.ci95[1])})`;
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
