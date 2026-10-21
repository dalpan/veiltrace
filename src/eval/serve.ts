// Offline fixture serving through Playwright request interception. No sockets are opened and every
// request that is not a corpus file is aborted and recorded.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrowserContext } from 'playwright';
import type { Scenario } from './corpus.js';

export const VIEWPORT = { width: 1280, height: 800 };

export interface RequestLog {
  served: string[];
  blocked: string[];
}

const TYPES: Record<string, string> = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', json: 'application/json' };

/** Routes every request of the context: corpus pages are fulfilled from disk, everything else is aborted. */
export async function routeScenario(context: BrowserContext, sc: Scenario, log: RequestLog): Promise<void> {
  const pages = new Map(sc.label.pages.map((p) => [p.url, join(sc.dir, p.file)]));
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    const file = pages.get(url);
    if (file) {
      log.served.push(url);
      const ext = file.split('.').pop() ?? 'html';
      await route.fulfill({ status: 200, body: readFileSync(file), headers: { 'content-type': TYPES[ext] ?? 'application/octet-stream' } });
    } else {
      log.blocked.push(url);
      await route.abort('blockedbyclient');
    }
  });
}
