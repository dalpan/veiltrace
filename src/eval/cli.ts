// `npm run eval -- <command> [--split dev|test] [--final]`. See EVALUATION_PLAN.md.
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { computeManifest, loadSplit, validateLabel, verifyManifest, type Split } from './corpus.js';
import { routeScenario, VIEWPORT, type RequestLog } from './serve.js';

const ROOT = 'corpus';

const entryUrl = (sc: { label: { pages: Array<{ url: string }> } }): string => (sc.label.pages[0] as { url: string }).url;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string): boolean => process.argv.includes(`--${name}`);

function splitArg(): Split {
  const s = arg('split');
  if (s !== 'dev' && s !== 'test') throw new Error('--split dev|test is required');
  return s;
}

/** Structural validation only: schema, hashes, offline loading, steps and evidence selectors. No detection runs. */
export async function validate(split: Split): Promise<string[]> {
  const errors: string[] = [];
  const scenarios = loadSplit(ROOT, split);
  for (const sc of scenarios) errors.push(...validateLabel(sc.label, sc.dir.split('/').pop() as string, split));
  if (split === 'test') errors.push(...verifyManifest(ROOT, 'test').map((d) => `MANIFEST mismatch: ${d}`));
  const browser = await chromium.launch();
  try {
    for (const sc of scenarios) {
      const context = await browser.newContext({ viewport: VIEWPORT });
      const log: RequestLog = { served: [], blocked: [] };
      await routeScenario(context, sc, log);
      const page = await context.newPage();
      await page.goto(entryUrl(sc), { waitUntil: 'load' });
      for (const step of sc.label.steps) await page.click(step.click, { timeout: 2000 }).catch(() => errors.push(`${sc.label.id}: step ${step.click} failed`));
      if (sc.label.evidenceWithin && (await page.$(sc.label.evidenceWithin)) === null) errors.push(`${sc.label.id}: evidenceWithin ${sc.label.evidenceWithin} not found`);
      if (log.blocked.length > 0) errors.push(`${sc.label.id}: fixture attempted external requests: ${log.blocked.join(', ')}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return errors;
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === 'manifest') {
    const split = splitArg();
    const path = join(ROOT, split, 'MANIFEST.json');
    if (split === 'test' && existsSync(path) && !flag('refreeze')) throw new Error('Test split is frozen. Refreezing requires --refreeze and an owner-approved DECISIONS.md entry.');
    const m = computeManifest(ROOT, split, arg('date') ?? new Date().toISOString().slice(0, 10));
    writeFileSync(path, JSON.stringify(m, null, 2) + '\n');
    console.log(`${split}: ${m.scenarios} scenarios, ${Object.keys(m.files).length} files, aggregate ${m.aggregate}`);
    return;
  }
  if (cmd === 'validate') {
    const split = splitArg();
    const errors = await validate(split);
    if (errors.length > 0) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else console.log(`${split}: valid (${loadSplit(ROOT, split).length} scenarios)`);
    return;
  }
  throw new Error(`Unknown command: ${String(cmd)}`);
}

await main();
