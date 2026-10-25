// Organization rule packs (D-109): validation, signatures and their effect on the detectors.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyzePayments } from '../src/core/index.js';
import { compileExtras, parsePack } from '../src/extension/rulepack/pack.js';
import { verifyEnvelope } from '../src/extension/rulepack/verify.js';
// @ts-expect-error -- plain ESM script without type declarations
import { keygen, signPack } from '../scripts/rulepack.mjs';
import { snapshot } from './fixtures/build.js';

const KEY = JSON.parse(readFileSync('tests/fixtures/rulepack/test-only-key.json', 'utf8')) as { kid: string; publicKey: string; privatePem: string };
const PACK = {
  format: 'veiltrace-rulepack', v: 1, id: 'unit-bansos-2026-11', issuer: 'Unit test', issued: '2026-11-01',
  entries: [{ id: 'bansos-kilat', detector: 'pay', signal: 'PR.PRIZE', lang: 'id', strength: 'weak', pattern: 'bansos\\s+kilat', examples: ['program Bansos Kilat'] }],
};
const LURE = ['Peserta program Bansos Kilat: transfer biaya Rp 50.000 terlebih dahulu.'];

describe('rule pack validation', () => {
  it('accepts a well-formed pack and rejects unknown signals, the ClickFix engine, risky or non-matching patterns', () => {
    expect(parsePack(PACK)?.entries).toHaveLength(1);
    const bad = (e: Record<string, unknown>) => parsePack({ ...PACK, entries: [{ ...PACK.entries[0], ...e }] });
    expect(bad({ signal: 'C.NEGATION' })).toBeNull();
    expect(bad({ detector: 'cmd' })).toBeNull();
    expect(bad({ pattern: '(a+)+$' })).toBeNull();
    expect(bad({ pattern: 'x'.repeat(301) })).toBeNull();
    expect(bad({ examples: ['tidak ada yang cocok'] })).toBeNull();
    expect(parsePack({ ...PACK, id: 'Bad Id' })).toBeNull();
  });

  it('adds signals to the detectors without changing results when no pack is used', () => {
    const without = analyzePayments(snapshot(LURE));
    expect(without.verdict).toBe('observed_instruction');
    const extra = compileExtras([parsePack(PACK)!]);
    const withPack = analyzePayments(snapshot(LURE), { extra: extra.pay });
    expect(withPack.verdict).toBe('suspicious_correlation');
    expect(withPack.findings[0]!.ruleId).toBe('PR1');
    expect(withPack.observations.some((o) => o.entryId === 'pack:unit-bansos-2026-11:bansos-kilat')).toBe(true);
    expect(analyzePayments(snapshot(LURE)).verdict).toBe('observed_instruction');
  });
});

describe('rule pack signatures', () => {
  const text = JSON.stringify(PACK);
  it('verifies a pack signed with a trusted key (Node signing, WebCrypto verification)', async () => {
    const env = signPack(text, KEY.kid, KEY.privatePem);
    expect((await verifyEnvelope(env, [KEY]))?.id).toBe('unit-bansos-2026-11');
  });

  it('rejects a changed payload, an unknown key id and a signature by another key', async () => {
    const env = signPack(text, KEY.kid, KEY.privatePem);
    expect(await verifyEnvelope({ ...env, payload: text.replace('kilat', 'kilatt') }, [KEY])).toBeNull();
    expect(await verifyEnvelope({ ...env, kid: 'other' }, [KEY])).toBeNull();
    const other = keygen('veiltrace-test');
    expect(await verifyEnvelope(signPack(text, KEY.kid, other.privatePem), [KEY])).toBeNull();
  });
});
