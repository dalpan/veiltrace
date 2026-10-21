// Browser API adapter: the only popup module that touches chrome.*. No background worker, no messaging.
// All page access goes through chrome.scripting.executeScript into the ISOLATED world.

/** Replaced at build time: true only in the test build (dist/extension-test). */
declare const __VT_TEST__: boolean;

export interface TargetTab {
  id: number;
  url: string | undefined;
}

export type UrlClass = 'scannable' | 'restricted' | 'file' | 'unknown';

const RESTRICTED_HOSTS = [/^chromewebstore\.google\.com$/, /^microsoftedge\.microsoft\.com$/];

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

export async function getTargetTab(): Promise<TargetTab | null> {
  if (__VT_TEST__) {
    // Test build only: Playwright cannot click the toolbar button, so the target tab is passed explicitly.
    const id = Number(new URLSearchParams(location.search).get('tab'));
    if (Number.isInteger(id) && id > 0) {
      const t = await chrome.tabs.get(id);
      return { id, url: t.url };
    }
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id !== undefined ? { id: tab.id, url: tab.url } : null;
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

export async function runScan(tabId: number): Promise<ScanCall> {
  const t0 = performance.now();
  await ensureContent(tabId);
  const t1 = performance.now();
  const [res] = await chrome.scripting.executeScript({
    target: { tabId }, world: 'ISOLATED',
    func: () => (globalThis as unknown as { VeiltraceContent: { scan: () => unknown } }).VeiltraceContent.scan(),
  });
  const t2 = performance.now();
  return { raw: res?.result, injectMs: t1 - t0, callMs: t2 - t1 };
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
