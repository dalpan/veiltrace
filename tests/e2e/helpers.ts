// Loads the real unpacked extension into Chromium (new headless mode supports extensions).
// The TEST build adds host permissions for fictional hosts and ?tab= targeting (D-013), because
// Playwright cannot click the toolbar action that grants activeTab.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';
// @ts-expect-error -- plain ESM build script without type declarations
import { buildExtension } from '../../scripts/build-extension.mjs';

export interface Loaded {
  context: BrowserContext;
  extId: string;
  dir: string;
  served: string[];
  blocked: string[];
  /** url → html for fictional hosts; mutate to add pages. */
  pages: Map<string, string>;
}

const built = new Map<string, Promise<string>>();

export function extensionDir(kind: 'test' | 'prod' | 'managed'): Promise<string> {
  if (!built.has(kind)) {
    // One directory per Vitest worker: test files run in parallel and each rebuilds (rm + write) its extension.
    const outdir = join('dist/e2e', `w${process.env.VITEST_POOL_ID ?? process.pid}`, `extension-${kind}`);
    built.set(kind, (buildExtension({ test: kind === 'test', managed: kind === 'managed', outdir }) as Promise<string>).then((d) => realpathSync(d)));
  }
  return built.get(kind) as Promise<string>;
}

/** Chrome derives an unpacked extension's id from its absolute path. */
export function extensionIdFor(dir: string): string {
  return [...createHash('sha256').update(dir).digest('hex').slice(0, 32)].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');
}

/** `uiLang` pins the browser UI language (the popup follows chrome.i18n.getUILanguage()); tests must not depend on the host OS locale. */
export async function launchExtension(kind: 'test' | 'prod' | 'managed', uiLang: 'en-US' | 'id' = 'en-US'): Promise<Loaded> {
  const dir = await extensionDir(kind);
  mkdirSync(join(tmpdir(), 'veiltrace-e2e'), { recursive: true });
  const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'veiltrace-e2e', 'profile-')), {
    // VT_E2E_CHANNEL=msedge runs the same tests in an installed Microsoft Edge (any Chromium browser Playwright supports).
    channel: process.env.VT_E2E_CHANNEL ?? 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    locale: uiLang,
    args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`, `--lang=${uiLang}`],
  });
  const loaded: Loaded = { context, extId: extensionIdFor(dir), dir, served: [], blocked: [], pages: new Map() };
  await context.route(/^https?:\/\//, async (route) => {
    const url = route.request().url();
    const body = loaded.pages.get(url);
    if (body !== undefined) {
      loaded.served.push(url);
      await route.fulfill({ status: 200, body, headers: { 'content-type': url.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8' } });
    } else {
      loaded.blocked.push(url);
      await route.abort('blockedbyclient');
    }
  });
  return loaded;
}

export function html(body: string, head = ''): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`;
}

/** Serves every page of a corpus scenario from disk under its fictional URLs. */
export function addCorpusScenario(l: Loaded, split: 'dev' | 'cred-dev' | 'pay-dev' | 'sup-dev', id: string): string {
  const dir = join('corpus', split, id);
  const label = JSON.parse(readFileSync(join(dir, 'label.json'), 'utf8')) as { pages: Array<{ url: string; file: string }> };
  for (const p of label.pages) l.pages.set(p.url, readFileSync(join(dir, p.file), 'utf8'));
  return (label.pages[0] as { url: string }).url;
}

/** Serves the fictional demo site (demo/nusaverta) under `base` (e.g. https://help.nusaverta.test/); returns page URLs. */
export function addDemoSite(l: Loaded, base: string): { lure: string; benign: string; cli: string } {
  for (const f of ['index.html', 'benign.html', 'cli.html', 'style.css']) l.pages.set(base + f, readFileSync(join('demo', 'nusaverta', f), 'utf8'));
  return { lure: `${base}index.html`, benign: `${base}benign.html`, cli: `${base}cli.html` };
}

export async function openTarget(l: Loaded, url: string, body?: string): Promise<Page> {
  if (body !== undefined) l.pages.set(url, body);
  const page = await l.context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  return page;
}

let probe: Page | undefined;

/** Chrome tab id of `page`: bring it to the front, then ask an already-open extension page for the active tab. */
export async function tabIdOf(l: Loaded, page: Page): Promise<number> {
  if (!probe || probe.isClosed() || probe.context() !== l.context) {
    probe = await l.context.newPage();
    await probe.goto(`chrome-extension://${l.extId}/popup.html`);
  }
  await page.bringToFront();
  const ids = (await probe.evaluate('chrome.tabs.query({ active: true, lastFocusedWindow: true }).then((ts) => ts.map((t) => t.id))')) as number[];
  if (ids.length !== 1) throw new Error(`expected one active tab, found ${ids.length}`);
  return ids[0] as number;
}

/** Opens the popup UI (as a tab) targeting `tabId` (test build only). */
export async function openPopup(l: Loaded, tabId: number): Promise<Page> {
  const popup = await l.context.newPage();
  // Chrome popups are at most 800×600; the dashboard is designed for 560 px.
  await popup.setViewportSize({ width: 560, height: 600 });
  await popup.goto(`chrome-extension://${l.extId}/popup.html?tab=${tabId}`);
  return popup;
}

export async function scan(popup: Page): Promise<string> {
  await popup.click('#scan');
  await popup.waitForSelector('body[data-state="done"], body[data-state="error"]');
  // The dashboard sits under "Technical details" (D-107); the tests inspect it, so open it as a user would.
  if (await popup.$('details.tech:not([open]) > summary')) await popup.click('details.tech > summary');
  return (await popup.getAttribute('body', 'data-state')) as string;
}

export async function verdict(popup: Page): Promise<string | null> {
  return popup.getAttribute('.summary', 'data-verdict');
}

export async function rules(popup: Page): Promise<string[]> {
  return popup.$$eval('article.finding', (els) => els.map((e) => `${e.getAttribute('data-rule')}:${e.getAttribute('data-classification')}`));
}

/** Full scan flow for a URL already registered in l.pages. */
export async function scanUrl(l: Loaded, url: string): Promise<{ target: Page; popup: Page; state: string }> {
  const target = await openTarget(l, url);
  const popup = await openPopup(l, await tabIdOf(l, target));
  const state = await scan(popup);
  return { target, popup, state };
}

export async function shot(popup: Page, name: string): Promise<void> {
  const dir = process.env.VT_SCREENSHOTS;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  await popup.screenshot({ path: join(dir, `${name}.png`), fullPage: true });
}
