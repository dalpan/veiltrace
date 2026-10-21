// Shared Playwright helpers: offline pages and in-page extractor execution.
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { ExtractOptions, ExtractResult } from '../../src/extract/index.js';
import { extractInPage, extractorSource } from '../../src/eval/inject.js';

export { extractorSource };

export interface OfflinePage {
  page: Page;
  context: BrowserContext;
  blocked: string[];
}

/** Serves `files` (url → html) offline; any other request is aborted and recorded. */
export async function openOffline(browser: Browser, files: Record<string, string>, entry?: string): Promise<OfflinePage> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const blocked: string[] = [];
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    const body = files[url];
    if (body !== undefined) await route.fulfill({ status: 200, body, headers: { 'content-type': 'text/html; charset=utf-8' } });
    else {
      blocked.push(url);
      await route.abort('blockedbyclient');
    }
  });
  const page = await context.newPage();
  await page.goto(entry ?? Object.keys(files)[0]!, { waitUntil: 'load' });
  return { page, context, blocked };
}

export function html(body: string, head = ''): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`;
}

/** Runs the extractor inside the page. `adapterExpr` is an optional JS expression for getShadowRoot. */
export function extract(page: Page, options: Omit<ExtractOptions, 'getShadowRoot' | 'now'> = {}, adapterExpr?: string): Promise<ExtractResult> {
  return extractInPage(page, options, adapterExpr);
}

export async function launch(): Promise<Browser> {
  return chromium.launch();
}
