// M5.4: the unified dashboard model over real extraction and all four detectors (no extension needed).
import type { Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyze, analyzeCredentials, analyzePayments, analyzeSupport } from '../../src/core/index.js';
import { buildReport, MAX_SNIPPET_CHARS } from '../../src/extension/content/report.js';
import { aggregate } from '../../src/extension/popup/aggregate.js';
import { parseScanReport } from '../../src/extension/popup/validate.js';
import { MULTI_THREAT_BODY } from '../fixtures/dashboard-page.js';
import { extract, html, launch, openOffline } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

const MULTI = html(MULTI_THREAT_BODY);

async function dashboardFor(page: string) {
  const { page: p, context, blocked } = await openOffline(browser, { 'https://multi.test/': page });
  const { snapshot } = await extract(p);
  const report = parseScanReport(JSON.parse(JSON.stringify(buildReport(snapshot, analyze(snapshot), { engine: 'e', extractor: 'x' }, { extractMs: 0, analyzeMs: 0 },
    analyzeCredentials(snapshot), analyzePayments(snapshot), analyzeSupport(snapshot)))))!;
  await context.close();
  return { report, d: aggregate(report), blocked };
}

describe('dashboard aggregation through the real extractor', () => {
  it('ranks findings from all detectors, groups the shared alarm element and keeps every finding and its evidence', async () => {
    const { report, d, blocked } = await dashboardFor(MULTI);
    expect(blocked).toEqual([]);
    expect(d.highest).toBe('manipulative_instruction');
    expect(d.affected).toEqual(['command', 'credential', 'payment', 'support']);
    const members = d.groups.flatMap((g) => g.members);
    expect(members.length).toBe(d.actionable);
    const shared = d.groups.find((g) => g.members.length > 1)!;
    expect(shared.members.map((m) => m.category).sort()).toEqual(['payment', 'support']);
    // Provenance: each grouped finding still carries its own detector's evidence.
    expect(report.payment.findings[0]!.evidence.length).toBeGreaterThan(0);
    expect(report.support.findings[0]!.evidence.length).toBeGreaterThan(0);
    // Ordering is non-increasing in classification across the whole list.
    const tier = { manipulative_instruction: 2, suspicious_correlation: 1, observed_instruction: 0 } as const;
    const tiers = members.map((m) => tier[m.classification]);
    expect(tiers).toEqual([...tiers].sort((a, b) => b - a));
  });

  it('long evidence is clipped in the report; the dashboard never reads more than the report carries', async () => {
    const long = `Verify you are human. Press Win+R, then Ctrl+V and press Enter. ${'padding '.repeat(200)}`;
    const { report, d } = await dashboardFor(html(`<div role="dialog"><p>${long}</p></div>`));
    expect(d.highest).toBe('manipulative_instruction');
    for (const e of report.findings.flatMap((f) => f.evidence)) expect(e.text.length).toBeLessThanOrEqual(MAX_SNIPPET_CHARS);
  });
});
