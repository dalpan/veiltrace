// Plain-language view of a scan (D-107): for each affected category, what the content asks the reader to do, why that is a
// manipulation sign (the explanation of the strongest finding's rule) and what to do instead. Shared by the popup and the
// "Cek Pesan" app; the technical dashboard stays one click away.
import type { ScanReport } from '../content/report.js';
import type { Category, Dashboard } from './aggregate.js';
import type { Messages } from './i18n.js';

export interface PlainItem {
  category: Category;
  ask: string;
  why: string;
  advice: string;
}

function ruleText(m: Messages, category: Category, ruleId: string): string {
  const table: Record<string, string> = category === 'command' ? m.rule : category === 'credential' ? m.cred.rule : category === 'payment' ? m.pay.rule : m.sup.rule;
  return table[ruleId] ?? '';
}

/** One item per affected category, strongest first, at most three. */
export function plainItems(r: ScanReport, d: Dashboard, m: Messages): PlainItem[] {
  const remote = r.support.findings.some((f) => f.classification !== 'observed_instruction'
    && (f.requestedActions.includes('remote-access') || f.requestedActions.includes('install') || f.requestedActions.includes('disable-protection')));
  const out: PlainItem[] = [];
  for (const g of d.groups) {
    const lead = g.members[0];
    if (!lead || out.some((x) => x.category === lead.category)) continue;
    const advice = lead.category === 'support' && remote ? `${m.dash.advice.support} ${m.dash.advice.remoteAccess}` : m.dash.advice[lead.category];
    out.push({ category: lead.category, ask: m.plain.ask[lead.category], why: ruleText(m, lead.category, lead.ruleId), advice });
    if (out.length === 3) break;
  }
  return out;
}
