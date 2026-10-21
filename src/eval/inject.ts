// Builds the extractor IIFE in memory and runs it inside a Playwright page.
import { build } from 'esbuild';
import type { Page } from 'playwright';
import type { ExtractOptions, ExtractResult } from '../extract/index.js';

let bundle: Promise<string> | undefined;

export function extractorSource(): Promise<string> {
  bundle ??= build({
    entryPoints: ['src/extract/index.ts'],
    bundle: true,
    format: 'iife',
    globalName: 'VeiltraceExtractor',
    platform: 'browser',
    target: 'es2022',
    write: false,
  }).then((r) => (r.outputFiles[0] as { text: string }).text);
  return bundle;
}

/** Runs the extractor in the page's main world (the M3 extension will use an isolated world). */
export async function extractInPage(page: Page, options: Omit<ExtractOptions, 'getShadowRoot' | 'now'> = {}, adapterExpr?: string): Promise<ExtractResult> {
  const src = await extractorSource();
  const adapter = adapterExpr ? `, getShadowRoot: ${adapterExpr}` : '';
  return page.evaluate(`(() => { ${src}; return VeiltraceExtractor.extractSnapshot(document, { ...${JSON.stringify(options)}${adapter} }); })()`) as Promise<ExtractResult>;
}

/** For each locator: does it resolve to an element inside `selector` (crossing shadow roots and frames)? */
export async function locatorsWithin(page: Page, locators: readonly string[], selector: string): Promise<boolean[]> {
  const src = await extractorSource();
  return page.evaluate(`(() => { ${src};
    const within = (el, sel) => { for (let cur = el; cur; ) { if (cur.matches && cur.matches(sel)) return true;
      if (cur.parentElement) cur = cur.parentElement; else { const root = cur.getRootNode && cur.getRootNode();
        cur = root && root.host ? root.host : (cur.ownerDocument && cur.ownerDocument.defaultView && cur.ownerDocument.defaultView.frameElement) || null; } }
      return false; };
    return ${JSON.stringify(locators)}.map((l) => { const el = VeiltraceExtractor.resolveLocator(document, l); return !!el && within(el, ${JSON.stringify(selector)}); });
  })()`) as Promise<boolean[]>;
}
