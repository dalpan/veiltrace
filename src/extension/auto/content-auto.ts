// auto.js: registered together with content.js only while automatic scanning is on (D-081). Runs in the tab's isolated
// world and calls the same scan() the popup uses, when the page has loaded and again when it changes (debounced and
// capped), then reports the page-level summary for the toolbar badge. Nothing else leaves the tab.
import type { ScanReport } from '../content/report.js';
import { summarize } from './auto.js';
import { sendAutoSummary } from './channel.js';

declare const VeiltraceContent: { scan: (options: { keepHighlight: boolean }) => ScanReport };

/**
 * Wait for the page to settle after a change (but never longer than MAX_WAIT_MS, so a page that changes constantly, such
 * as a chat, is still scanned), scan at most every MIN_INTERVAL_MS, and stop after MAX_SCANS.
 */
const DEBOUNCE_MS = 1200;
const MAX_WAIT_MS = 5000;
const MIN_INTERVAL_MS = 4000;
const MAX_SCANS = 25;

let scans = 0;
let lastScan = -Infinity;
let timer: ReturnType<typeof setTimeout> | undefined;
let pendingSince: number | undefined;
let lastSent = '';

function run(): void {
  timer = undefined;
  pendingSince = undefined;
  if (document.hidden || scans >= MAX_SCANS) return;
  const wait = lastScan + MIN_INTERVAL_MS - performance.now();
  if (wait > 0) {
    timer = setTimeout(run, wait);
    return;
  }
  scans++;
  lastScan = performance.now();
  let summary;
  try {
    summary = summarize(VeiltraceContent.scan({ keepHighlight: true }));
  } catch {
    return;
  }
  const key = `${summary.verdict}:${summary.actionable}`;
  if (key !== lastSent) {
    lastSent = key;
    sendAutoSummary(summary);
  }
  if (scans >= MAX_SCANS) observer.disconnect();
}

function schedule(): void {
  const now = performance.now();
  pendingSince ??= now;
  if (timer !== undefined) clearTimeout(timer);
  timer = setTimeout(run, Math.min(DEBOUNCE_MS, Math.max(0, pendingSince + MAX_WAIT_MS - now)));
}

/** The highlight overlay is the extension's own element; its appearance and removal must not trigger a rescan. */
const ownNode = (n: Node): boolean => n instanceof Element && n.hasAttribute('data-veiltrace-highlight');
const observer = new MutationObserver((records) => {
  if (records.every((r) => ownNode(r.target) || [...r.addedNodes, ...r.removedNodes].some(ownNode))) return;
  schedule();
});

if (window.top === window) {
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  run();
}
