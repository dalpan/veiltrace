// Loads organization rule packs (D-109) in builds that can have them: the managed build reads the `rulePacks` policy
// (chrome.storage.managed); the TEST build also reads chrome.storage.local so e2e tests can supply packs. Other builds
// have no trusted key and no storage permission, so this returns nothing.
import type { RulePack } from './pack.js';
import { verifyEnvelope, type TrustedKey } from './verify.js';

declare const __VT_RULEPACK_KEYS__: TrustedKey[];
declare const __VT_TEST__: boolean;

const KEYS: TrustedKey[] = typeof __VT_RULEPACK_KEYS__ !== 'undefined' ? __VT_RULEPACK_KEYS__ : [];

async function read(area: 'managed' | 'local'): Promise<unknown[]> {
  try {
    const store = chrome.storage?.[area];
    if (!store) return [];
    const got = (await store.get('rulePacks')) as { rulePacks?: unknown };
    const list = typeof got.rulePacks === 'string' ? JSON.parse(got.rulePacks) as unknown : got.rulePacks;
    return Array.isArray(list) ? list.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export async function loadRulePacks(): Promise<RulePack[]> {
  if (KEYS.length === 0) return [];
  const envelopes = [...await read('managed'), ...(__VT_TEST__ ? await read('local') : [])];
  const packs = await Promise.all(envelopes.map((e) => verifyEnvelope(e, KEYS)));
  const seen = new Set<string>();
  return packs.filter((p): p is RulePack => p !== null && !seen.has(p.id) && Boolean(seen.add(p.id)));
}
