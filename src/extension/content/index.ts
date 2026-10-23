// Injected on demand into the active tab's ISOLATED world (chrome.scripting.executeScript, files: content.js).
// Bundled as an IIFE exposing `VeiltraceContent` in the isolated world only; page scripts cannot see or
// replace it. No listeners, no messaging, no network: the popup calls these functions via executeScript.
import { analyze } from '../../core/analyze.js';
import { analyzeCredentials } from '../../core/credential/analyze.js';
import { analyzePayments } from '../../core/payment/analyze.js';
import { analyzeSupport } from '../../core/support/analyze.js';
import { EXTRACTOR_VERSION, extractSnapshot } from '../../extract/extract.js';
import { buildAiPayload, type AiPayload } from '../ai/payload.js';
import { clearHighlight, highlight, type HighlightResult } from './highlight.js';
import { imageOnlyLines, ocrLines } from './image-text.js';
import { buildReport, type ScanReport } from './report.js';

/**
 * Closed shadow roots: chrome.dom.openOrClosedShadowRoot (Chrome 88+) or, in Firefox content scripts,
 * Element.openOrClosedShadowRoot() (D-086).
 */
function shadowRootAdapter(): ((el: Element) => ShadowRoot | null) | undefined {
  const dom = typeof chrome !== 'undefined' ? (chrome as { dom?: { openOrClosedShadowRoot?: (el: HTMLElement) => ShadowRoot | null } }).dom : undefined;
  const fn = dom?.openOrClosedShadowRoot;
  if (typeof fn === 'function') return (el: Element) => (el instanceof HTMLElement ? (fn(el) ?? null) : el.shadowRoot);
  type Gecko = Element & { openOrClosedShadowRoot?: () => ShadowRoot | null };
  if (typeof (document.documentElement as Gecko).openOrClosedShadowRoot === 'function') return (el: Element) => (el as Gecko).openOrClosedShadowRoot?.() ?? el.shadowRoot;
  return undefined;
}

/** `keepHighlight`: automatic rescans (D-081) must not remove a highlight the user just asked for. */
export function scan(options: { timeBudgetMs?: number; keepHighlight?: boolean } = {}): ScanReport {
  if (!options.keepHighlight) clearHighlight();
  const getShadowRoot = shadowRootAdapter();
  const t0 = performance.now();
  const { snapshot } = extractSnapshot(document, {
    ...(typeof options.timeBudgetMs === 'number' ? { timeBudgetMs: options.timeBudgetMs } : {}),
    ...(getShadowRoot ? { getShadowRoot } : {}),
  });
  const t1 = performance.now();
  const result = analyze(snapshot);
  const t2 = performance.now();
  // Experimental credential detector (M5.1): independent of, and never changing, the ClickFix result above.
  const cred = analyzeCredentials(snapshot);
  const t3 = performance.now();
  // Experimental payment-manipulation detector (M5.2): also independent; reads block text only.
  const pay = analyzePayments(snapshot);
  const t4 = performance.now();
  // Experimental fake-support and impersonation detector (M5.3): also independent; reads block text only.
  const sup = analyzeSupport(snapshot);
  const t5 = performance.now();
  return buildReport(snapshot, result, { engine: result.engineVersion, extractor: EXTRACTOR_VERSION },
    { extractMs: t1 - t0, analyzeMs: t2 - t1, credentialMs: t3 - t2, paymentMs: t4 - t3, supportMs: t5 - t4 }, cred, pay, sup);
}

/**
 * Text in images (D-105): the popup reads a screenshot of the visible tab on the device and passes the OCR lines here. Lines the
 * page already has as text are dropped (the page text stays in the tab); the rest is analyzed as page content. The evidence has
 * no locator: text inside an image cannot be highlighted on the page.
 */
export function imageScan(input: unknown): ScanReport | null {
  const lines = ocrLines(input);
  if (!lines) return null;
  const getShadowRoot = shadowRootAdapter();
  const { snapshot: page } = extractSnapshot(document, getShadowRoot ? { getShadowRoot } : {});
  const kept = imageOnlyLines(lines, page.blocks.map((b) => b.text));
  const snapshot = {
    ...page, title: '', hiddenCopyCandidates: [], copyTriggers: [], formFields: [], forms: [],
    blocks: kept.map((text, i) => ({ id: `i${i}`, text, containerId: 'body', locator: '', ctx: {}, headingContext: null })),
    coverage: { framesSkipped: 0, truncated: false, closedShadowRootsSkipped: 0 },
  };
  const t0 = performance.now();
  const result = analyze(snapshot);
  const t1 = performance.now();
  const cred = analyzeCredentials(snapshot);
  const t2 = performance.now();
  const pay = analyzePayments(snapshot);
  const t3 = performance.now();
  const sup = analyzeSupport(snapshot);
  const t4 = performance.now();
  return buildReport(snapshot, result, { engine: result.engineVersion, extractor: 'ocr' },
    { extractMs: 0, analyzeMs: t1 - t0, credentialMs: t2 - t1, paymentMs: t3 - t2, supportMs: t4 - t3 }, cred, pay, sup);
}

/**
 * Optional AI second opinion (D-093): the visible block text the detectors read, masked and capped. Called only when the user
 * asks for it in the popup; the popup shows it before the on-device model reads it.
 */
export function aiText(): AiPayload {
  const getShadowRoot = shadowRootAdapter();
  const { snapshot } = extractSnapshot(document, getShadowRoot ? { getShadowRoot } : {});
  return buildAiPayload(snapshot.blocks.map((b) => b.text));
}

export function show(locator: unknown, durationMs: number): HighlightResult {
  return highlight(locator, durationMs, shadowRootAdapter());
}

export { clearHighlight };

/** Whether the closed-shadow adapter is available in this world (reported for diagnostics/tests). */
export function capabilities(): { closedShadowAdapter: boolean } {
  return { closedShadowAdapter: shadowRootAdapter() !== undefined };
}
