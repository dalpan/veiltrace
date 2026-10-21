// Turns a pasted or shared message into the PageSnapshot the detectors read, and runs all four detectors on it.
// Pure apart from performance.now(); no network, no storage. Used by the "Cek Pesan" PWA (D-084).
import { analyze } from '../core/analyze.js';
import { analyzeCredentials } from '../core/credential/analyze.js';
import { analyzePayments } from '../core/payment/analyze.js';
import { analyzeSupport } from '../core/support/analyze.js';
import type { PageSnapshot } from '../core/types.js';
import { buildReport, type ScanReport } from '../extension/content/report.js';

/** Where the text came from. A chat message, SMS or email is content written by someone else; a web text is page content. */
export type MessageSource = 'chat' | 'sms' | 'email' | 'web';

export const MAX_MESSAGE_CHARS = 20000;
const MAX_LINES = 400;
const CONTAINER: Record<MessageSource, string> = { chat: 'ugc:#message', sms: 'ugc:#message', email: 'ugc:#message', web: 'body' };

/** One block per non-empty line, inside a container that matches the source. Over-long input is cut and reported as partial. */
export function messageSnapshot(text: string, source: MessageSource): PageSnapshot {
  const clipped = text.slice(0, MAX_MESSAGE_CHARS);
  const lines = clipped.replace(/\r\n?/g, '\n').split('\n').map((t) => t.trim()).filter(Boolean);
  const truncated = text.length > MAX_MESSAGE_CHARS || lines.length > MAX_LINES;
  return {
    schemaVersion: 1, url: 'about:blank', title: '', lang: null,
    blocks: lines.slice(0, MAX_LINES).map((t, i) => ({ id: `b${i}`, text: t, containerId: CONTAINER[source], locator: `#line-${i}`, ctx: {}, headingContext: null })),
    hiddenCopyCandidates: [], copyTriggers: [],
    coverage: { framesSkipped: 0, truncated, closedShadowRootsSkipped: 0, ...(truncated ? { partial: ['char-budget' as const] } : {}) },
  };
}

export function checkMessage(text: string, source: MessageSource): ScanReport {
  const s = messageSnapshot(text, source);
  const t0 = performance.now();
  const result = analyze(s);
  const t1 = performance.now();
  const cred = analyzeCredentials(s);
  const t2 = performance.now();
  const pay = analyzePayments(s);
  const t3 = performance.now();
  const sup = analyzeSupport(s);
  const t4 = performance.now();
  return buildReport(s, result, { engine: result.engineVersion, extractor: 'message' },
    { extractMs: 0, analyzeMs: t1 - t0, credentialMs: t2 - t1, paymentMs: t3 - t2, supportMs: t4 - t3 }, cred, pay, sup);
}
