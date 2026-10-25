// Browser API adapter: the only popup module that touches chrome.*. No background worker, no messaging.
// All page access goes through chrome.scripting.executeScript into the ISOLATED world.

/** Replaced at build time: true only in the test build (dist/extension-test). */
declare const __VT_TEST__: boolean;

export interface TargetTab {
  id: number;
  url: string | undefined;
  windowId?: number;
}

export type UrlClass = 'scannable' | 'restricted' | 'file' | 'unknown';

/** Extension stores: browsers do not let extensions read them. */
const RESTRICTED_HOSTS = [/^chromewebstore\.google\.com$/, /^microsoftedge\.microsoft\.com$/, /^addons\.mozilla\.org$/, /^addons\.opera\.com$/];

/** Pages where browsers forbid or we refuse script injection. */
export function classifyUrl(url: string | undefined): UrlClass {
  if (!url) return 'unknown';
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return 'unknown';
  }
  if (u.protocol === 'file:') return 'file';
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'restricted';
  if (RESTRICTED_HOSTS.some((r) => r.test(u.hostname))) return 'restricted';
  if (u.hostname === 'chrome.google.com' && u.pathname.startsWith('/webstore')) return 'restricted';
  return 'scannable';
}

/** The installed extension's version (shown in the header), or "" when unavailable. */
export function extensionVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return '';
  }
}

/** True when the popup page is open as a tab (tests, keyboard users) rather than as the toolbar popup. */
export async function isTabView(): Promise<boolean> {
  try {
    return (await chrome.tabs.getCurrent()) !== undefined;
  } catch {
    return false;
  }
}

export async function getTargetTab(): Promise<TargetTab | null> {
  if (__VT_TEST__) {
    // Test build only: Playwright cannot click the toolbar button, so the target tab is passed explicitly.
    const id = Number(new URLSearchParams(location.search).get('tab'));
    if (Number.isInteger(id) && id > 0) {
      const t = await chrome.tabs.get(id);
      return { id, url: t.url, windowId: t.windowId };
    }
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id !== undefined ? { id: tab.id, url: tab.url, windowId: tab.windowId } : null;
}

async function ensureContent(tabId: number): Promise<void> {
  const [probe] = await chrome.scripting.executeScript({
    target: { tabId }, world: 'ISOLATED',
    func: () => typeof (globalThis as { VeiltraceContent?: unknown }).VeiltraceContent === 'object',
  });
  if (probe?.result !== true) {
    await chrome.scripting.executeScript({ target: { tabId }, world: 'ISOLATED', files: ['content.js'] });
  }
}

export interface ScanCall {
  raw: unknown;
  injectMs: number;
  callMs: number;
}

export async function runScan(tabId: number, packs: unknown[] = []): Promise<ScanCall> {
  const t0 = performance.now();
  await ensureContent(tabId);
  const t1 = performance.now();
  const [res] = await chrome.scripting.executeScript({
    target: { tabId }, world: 'ISOLATED',
    func: (p: unknown[]) => (globalThis as unknown as { VeiltraceContent: { scan: (o: { packs: unknown[] }) => unknown } }).VeiltraceContent.scan({ packs: p }),
    args: [packs],
  });
  const t2 = performance.now();
  return { raw: res?.result, injectMs: t1 - t0, callMs: t2 - t1 };
}

/** The masked page text for the optional on-device AI opinion (D-093), validated by the caller. */
export async function runAiText(tabId: number): Promise<unknown> {
  await ensureContent(tabId);
  const [res] = await chrome.scripting.executeScript({
    target: { tabId }, world: 'ISOLATED',
    func: () => (globalThis as unknown as { VeiltraceContent: { aiText: () => unknown } }).VeiltraceContent.aiText(),
  });
  return res?.result;
}

/** OCR lines of the visible tab, filtered and analyzed in the tab (D-105); validated by the caller. */
export async function runImageScan(tabId: number, lines: readonly string[], packs: unknown[] = []): Promise<unknown> {
  await ensureContent(tabId);
  const [res] = await chrome.scripting.executeScript({
    target: { tabId }, world: 'ISOLATED',
    func: (l: string[], p: unknown[]) => (globalThis as unknown as { VeiltraceContent: { imageScan: (x: unknown, y: unknown) => unknown } }).VeiltraceContent.imageScan(l, p),
    args: [[...lines], packs],
  });
  return res?.result;
}

/**
 * A PNG of the visible part of the tab (D-105). `activeTab`, granted when the user opened the popup, is enough; no permission
 * is added. In the test build the image can be supplied by the test (`window.__vtTestScreenshot`), because a popup opened as a
 * tab would capture itself.
 */
export async function captureTab(windowId: number | undefined): Promise<Blob> {
  if (__VT_TEST__) {
    const supplied = (globalThis as { __vtTestScreenshot?: Blob }).__vtTestScreenshot;
    if (supplied) return supplied;
  }
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId ?? chrome.windows.WINDOW_ID_CURRENT, { format: 'png' });
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  return new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: 'image/png' });
}

export async function runHighlight(tabId: number, locator: string, durationMs: number): Promise<unknown> {
  await ensureContent(tabId);
  const [res] = await chrome.scripting.executeScript({
    target: { tabId }, world: 'ISOLATED',
    func: (loc: string, ms: number) =>
      (globalThis as unknown as { VeiltraceContent: { show: (l: string, d: number) => unknown } }).VeiltraceContent.show(loc, ms),
    args: [locator, durationMs],
  });
  return res?.result;
}
