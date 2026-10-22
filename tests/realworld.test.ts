// Real-world field sample tooling (D-082): redaction, privacy guard, deterministic split, lock, agreement and evaluation.
// The last block validates every committed record, so a record with a phone number or a changed locked record fails CI.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  cleanOcrLines, detect, evaluate, kappa, labelSheet, loadRecords, LOCK, lockProblems, privacyProblems, recordHash, redact, resolved, splitFor, validateRecord,
  type LockFile, type RecordV1,
} from '../src/eval/realworld.js';

const rec = (id: string, text: string, labels: RecordV1['labels'] = [], extra: Partial<RecordV1> = {}): RecordV1 => ({
  id, schema: 1, lang: 'id', source: 'wa', context: 'chat', text, collected: '2026-10-22', collector: 'T', origin: 'private: volunteer submission',
  split: splitFor(id), labels, ...extra,
});
const both = (truth: 'malicious' | 'benign', category: RecordV1['labels'][number]['category'], expected: RecordV1['labels'][number]['expected']) =>
  (['A', 'B'] as const).map((annotator) => ({ annotator, truth, category, expected }));

describe('redaction', () => {
  it('masks phone, account and long numbers, links, emails, handles and names after "a.n."', () => {
    const r = redact('Transfer ke BCA 1234567890 a.n. Budi Santoso, WA 0812-3456-7890, email cs@bank-palsu.co.id, cek https://promo-hadiah.xyz/klaim atau DM @admin_resmi');
    expect(r.text).toBe('Transfer ke BCA [NOMOR] a.n. [NAMA], WA [NOMOR], email [EMAIL], cek [TAUTAN] atau DM @[AKUN]');
    expect(privacyProblems(r.text)).toEqual([]);
  });

  it('keeps dates and prices, and warns about names after titles and short codes it cannot judge', () => {
    const r = redact('Pak Joko, bayar Rp 150.000 sebelum 30-10-2026. Kodenya 4829.');
    expect(r.text).toContain('Rp 150.000');
    expect(r.text).toContain('30-10-2026');
    expect(r.warnings.join(' ')).toMatch(/personal name/);
    expect(r.warnings.join(' ')).toMatch(/4–5 digit/);
  });

  it('the privacy guard flags what must not be committed', () => {
    expect(privacyProblems('hubungi 081234567890')).toEqual(['phone or long number']);
    expect(privacyProblems('buka https://x.example/a')).toEqual(['link']);
    expect(privacyProblems('kirim ke a@b.co')).toEqual(['email address']);
    expect(privacyProblems('bayar Rp 150.000 hari ini')).toEqual([]);
  });
});

describe('records, split and lock', () => {
  it('assigns dev/test deterministically from the id (the salt is fixed)', () => {
    expect(['RW-0001', 'RW-0002', 'RW-0003', 'RW-0004'].map(splitFor)).toEqual(['RW-0001', 'RW-0002', 'RW-0003', 'RW-0004'].map(splitFor));
    const ids = Array.from({ length: 400 }, (_, i) => `RW-${String(i + 1).padStart(4, '0')}`);
    const test = ids.filter((id) => splitFor(id) === 'test').length;
    expect(test).toBeGreaterThan(160);
    expect(test).toBeLessThan(240);
  });

  it('rejects malformed, inconsistent or unredacted records', () => {
    expect(validateRecord(rec('RW-0001', 'kirim kode otp ya'))).toEqual([]);
    expect(validateRecord(rec('RW-0001', 'hubungi 081234567890')).join(' ')).toMatch(/redact/);
    expect(validateRecord(rec('RW-0001', 'x', [], { split: splitFor('RW-0001') === 'dev' ? 'test' : 'dev' })).join(' ')).toMatch(/deterministic/);
    expect(validateRecord(rec('RW-0001', 'x', [{ annotator: 'A', truth: 'benign', category: 'cred', expected: 'manipulative' }])).join(' ')).toMatch(/inconsistent/);
  });

  it('a record the rule author saw before the split is always dev (D-091)', () => {
    const testId = ['RW-0001', 'RW-0002', 'RW-0003', 'RW-0004', 'RW-0005'].find((id) => splitFor(id) === 'test')!;
    expect(validateRecord(rec(testId, 'x', [], { split: 'dev', seen: 'rule author' }))).toEqual([]);
    expect(validateRecord(rec(testId, 'x', [], { split: 'test', seen: 'rule author' })).join(' ')).toMatch(/deterministic/);
  });

  it('detects a changed or missing locked record and test records added after the lock', () => {
    const records = [rec('RW-0001', 'a'), rec('RW-0002', 'b'), rec('RW-0003', 'c'), rec('RW-0004', 'd')];
    const testOnes = records.filter((r) => r.split === 'test');
    const lock: LockFile = { version: 1, lockedAt: 'x', test: Object.fromEntries(testOnes.map((r) => [r.id, recordHash(r)])) };
    expect(lockProblems(records, lock)).toEqual([]);
    if (testOnes[0]) {
      const changed = records.map((r) => (r.id === testOnes[0]!.id ? { ...r, text: 'edited' } : r));
      expect(lockProblems(changed, lock).join(' ')).toMatch(/changed/);
    }
    const later = Array.from({ length: 20 }, (_, i) => rec(`RW-${String(100 + i).padStart(4, '0')}`, 'x')).find((r) => r.split === 'test')!;
    expect(lockProblems([...records, later], lock).join(' ')).toMatch(/added after the lock/);
  });
});

describe('agreement and evaluation', () => {
  it('computes Cohen’s kappa and lists disagreements; only agreed or adjudicated labels are evaluated', () => {
    const records = [
      rec('RW-0001', 'x', both('malicious', 'cred', 'manipulative')),
      rec('RW-0002', 'x', both('benign', 'none', 'none')),
      rec('RW-0003', 'x', [{ annotator: 'A', truth: 'malicious', category: 'pay', expected: 'suspicious' }, { annotator: 'B', truth: 'benign', category: 'none', expected: 'none' }]),
    ];
    const k = kappa(records, 'A', 'B', 'truth');
    expect(k.n).toBe(3);
    expect(k.disagreements).toEqual(['RW-0003']);
    expect(k.kappa).toBeCloseTo(0.4, 5);
    expect(resolved(records[2]!)).toBeUndefined();
    expect(resolved({ ...records[2]!, final: { truth: 'malicious', category: 'pay', expected: 'suspicious' } })?.category).toBe('pay');
  });

  it('runs all four detectors on a text record shown as a chat message', () => {
    const otp = rec('RW-0001', 'bro buat verif akun, kasih liat dong angka yg barusan masuk ke hp lu, cepetan ya', both('malicious', 'cred', 'manipulative'));
    expect(detect(otp)).toMatchObject({ verdict: 'manipulative_instruction', byCategory: { cred: 'manipulative_instruction', cmd: 'none' } });
    const ok = rec('RW-0002', 'Pesanan kakak sudah dikirim ya, nomor resinya ada di aplikasi.', both('benign', 'none', 'none'));
    const split = otp.split;
    const r = evaluate([otp, { ...ok, split }], split);
    expect({ tp: r.tp, fp: r.fp, tn: r.tn, fn: r.fn }).toEqual({ tp: 1, fp: 0, tn: 1, fn: 0 });
    expect(r.rows[0]!.rightCategory).toBe(true);
  });
});

describe('committed real-world records', () => {
  const records = loadRecords();
  it('are valid and redacted', () => {
    expect(records.flatMap(validateRecord)).toEqual([]);
  });
  it('respect the test-half lock, if one exists', () => {
    const lock = existsSync(LOCK) ? (JSON.parse(readFileSync(LOCK, 'utf8')) as LockFile) : null;
    expect(lockProblems(records, lock)).toEqual([]);
  });
});

describe('screenshot import and label sheet (D-096)', () => {
  it('drops clock times and fragments and joins continuation lines from OCR', () => {
    expect(cleanOcrLines(['10.28', '4G', 'Halo kak, kami dari layanan', 'pelanggan resmi.', '09.43 ✓✓', 'Balas YA untuk lanjut'])).toEqual(
      ['Halo kak, kami dari layanan pelanggan resmi.', 'Balas YA untuk lanjut']);
  });

  it('builds an offline label sheet whose embedded text cannot close the script', () => {
    const html = labelSheet([rec('RW-0001', 'hi </script><img src=x onerror=alert(1)>')], 'B');
    expect(html).not.toContain('</script><img');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain('labels-B.json');
  });
});
