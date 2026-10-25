// Organization rule packs (D-109) in the real extension (TEST build, which trusts the test-only key and reads packs from
// chrome.storage.local; the managed build reads the `rulePacks` policy instead). A signed pack adds a new scam pattern;
// a changed pack is ignored.
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error -- plain ESM script without type declarations
import { signPack } from '../../scripts/rulepack.mjs';
import { html, launchExtension, openPopup, openTarget, scan, tabIdOf, type Loaded } from './helpers.js';

const KEY = JSON.parse(readFileSync('tests/fixtures/rulepack/test-only-key.json', 'utf8')) as { kid: string; privatePem: string };
const PACK = JSON.stringify({
  format: 'veiltrace-rulepack', v: 1, id: 'e2e-bansos-2026-11', issuer: 'E2E test', issued: '2026-11-01',
  entries: [{ id: 'bansos-kilat', detector: 'pay', signal: 'PR.PRIZE', lang: 'id', strength: 'weak', pattern: 'bansos\\s+kilat', examples: ['program Bansos Kilat'] }],
});

let l: Loaded;
beforeAll(async () => {
  l = await launchExtension('test', 'id');
  l.pages.set('https://bansos.test/', html('<h1>Info</h1><p>Peserta program Bansos Kilat: transfer biaya Rp 50.000 terlebih dahulu.</p>'));
});
afterAll(async () => { await l.context.close(); });

async function verdictWith(envelopes: unknown[]): Promise<{ verdict: string | null; packs: string | null; meta: string | null }> {
  const target = await openTarget(l, 'https://bansos.test/');
  const setup = await openPopup(l, await tabIdOf(l, target));
  await setup.evaluate((e) => chrome.storage.local.set({ rulePacks: e }), envelopes);
  await setup.close();
  const popup = await openPopup(l, await tabIdOf(l, target));
  await scan(popup);
  return { verdict: await popup.getAttribute('.plain', 'data-verdict'), packs: await popup.getAttribute('body', 'data-rulepacks'), meta: await popup.textContent('#meta') };
}

describe('organization rule packs', () => {
  it('without a pack the page is not flagged; a signed pack adds the pattern and is named in the footer', async () => {
    expect((await verdictWith([])).verdict).not.toMatch(/suspicious|manipulative/);
    const r = await verdictWith([signPack(PACK, KEY.kid, KEY.privatePem)]);
    expect(r.verdict).toBe('suspicious_correlation');
    expect(r.packs).toBe('e2e-bansos-2026-11');
    expect(r.meta).toContain('rule pack organisasi: e2e-bansos-2026-11');
  });

  it('ignores a pack whose content was changed after signing', async () => {
    const env = signPack(PACK, KEY.kid, KEY.privatePem);
    const r = await verdictWith([{ ...env, payload: env.payload.replace('E2E test', 'Someone else') }]);
    expect(r.verdict).not.toMatch(/suspicious|manipulative/);
    expect(r.packs).toBe('');
    expect(l.blocked).toEqual([]);
  });
});
