// External datasets written and labelled by others (D-099). First: the Indonesian SMS spam dataset by Yudi Wibisono
// (1,143 messages: normal, penipuan, promo; Creative Commons; https://yudiwbs.wordpress.com/2018/08/05/dataset-klasifikasi-
// bahasa-indonesia-sms-spam-klasifikasi-teks-dengan-scikit-learn/), downloaded locally and never committed.
// Each message is assigned to dev or test by a hash of its text before anyone reads it. The dev half may guide rule
// changes; the test half is locked (LOCK.json) on first use and evaluated only with --final, on owner request.
// Messages go through the same path as the "Cek Pesan" app (source "sms"). Node-only, never shipped.
// Second: the "VeilTrace Indonesian Synthetic Scam Corpus v1" (12,150 templated messages, scam/benign, 25 categories),
// generated for the owner and placed in corpus/external/synthetic-id. It ships its own split: train and validation are
// dev, test.jsonl is locked by hash. Its README warns of template leakage across splits, so no number from it is
// held-out or real-world evidence.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Verdict } from '../core/index.js';
import { analyze, analyzeCredentials, analyzePayments, analyzeSupport } from '../core/index.js';
import { messageSnapshot, type MessageSource } from '../pwa/message.js';
import { wilson } from './metrics.js';

export const SMS_DIR = join('corpus', 'external', 'sms-id');
const SALT = 'veiltrace-external-sms-id-v1';

export type SmsLabel = 'normal' | 'penipuan' | 'promo';
export interface SmsItem { key: string; text: string; label: SmsLabel; split: 'dev' | 'test' }

/** Minimal RFC 4180 CSV parser (quoted fields with commas, quotes and line breaks). */
export function parseCsv(src: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i] as string;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export function splitOf(text: string): { key: string; split: 'dev' | 'test' } {
  const h = createHash('sha256').update(`${SALT}:${text}`).digest();
  return { key: h.toString('hex').slice(0, 16), split: (h[0] as number) < 128 ? 'test' : 'dev' };
}

export function loadSms(file = join(SMS_DIR, 'dataset_sms_spam_v2.csv')): SmsItem[] {
  const [header, ...rows] = parseCsv(readFileSync(file, 'utf8').replace(/^\uFEFF/u, ''));
  if (header?.[0] !== 'Teks' || header[1] !== 'label') throw new Error('unexpected SMS dataset header');
  return rows.map(([text = '', label = '']) => ({ text, label: label as SmsLabel, ...splitOf(text) }));
}

const alerts = (v: Verdict): boolean => v === 'suspicious_correlation' || v === 'manipulative_instruction';

export function detectSms(text: string, source: MessageSource = 'sms'): Record<'cmd' | 'cred' | 'pay' | 'sup', Verdict> {
  const s = messageSnapshot(text, source);
  return { cmd: analyze(s).verdict, cred: analyzeCredentials(s).verdict, pay: analyzePayments(s).verdict, sup: analyzeSupport(s).verdict };
}

export function evaluateSms(items: readonly SmsItem[]) {
  const rows = items.map((it) => ({ ...it, verdicts: detectSms(it.text), alert: Object.values(detectSms(it.text)).some(alerts) }));
  const count = (label: SmsLabel, alert: boolean): number => rows.filter((r) => r.label === label && r.alert === alert).length;
  const tp = count('penipuan', true), fn = count('penipuan', false), fpNormal = count('normal', true), tnNormal = count('normal', false);
  const fpPromo = count('promo', true), tnPromo = count('promo', false);
  return {
    n: rows.length,
    penipuan: { tp, fn, recall: wilson(tp, tp + fn) },
    normal: { fp: fpNormal, tn: tnNormal, fpr: wilson(fpNormal, fpNormal + tnNormal) },
    promo: { flagged: fpPromo, quiet: tnPromo, rate: wilson(fpPromo, fpPromo + tnPromo) },
    rows,
  };
}

export const SYN_DIR = join('corpus', 'external', 'synthetic-id');
export type SynSplit = 'train' | 'validation' | 'test';
export interface SynItem { id: string; text: string; label: 'scam' | 'benign'; category: string; channel: string; split: SynSplit }

/** The dataset's channel names, mapped onto the PWA's message sources. */
export function sourceOf(channel: string): MessageSource {
  if (channel === 'Halaman web' || channel === 'Popup browser') return 'web';
  if (channel === 'Email') return 'email';
  return channel === 'SMS' ? 'sms' : 'chat';
}

/** The dataset's inert placeholders, replaced by defanged values of the same shape (as the realworld kit does). */
export function restoreSynthetic(text: string): string {
  return text.replace(/\[TAUTAN\]/gu, 'https://link.example.invalid/x').replace(/\[KONTAK\]/gu, '081200000000')
    .replace(/\[REKENING_SIMULASI\]/gu, '1234567890').replace(/\[LAMPIRAN_SIMULASI\]/gu, 'lampiran.apk');
}

export function loadSynthetic(dir = SYN_DIR, splits: readonly SynSplit[] = ['train', 'validation']): SynItem[] {
  return splits.flatMap((split) => readFileSync(join(dir, `${split}.jsonl`), 'utf8').split('\n').filter(Boolean).map((line) => {
    const r = JSON.parse(line) as Record<string, string>;
    if (r.label !== 'scam' && r.label !== 'benign') throw new Error(`unexpected label in ${split}.jsonl`);
    return { id: String(r.id), text: restoreSynthetic(String(r.text)), label: r.label, category: String(r.category), channel: String(r.channel), split };
  }));
}

export function evaluateSynthetic(items: readonly SynItem[]) {
  const rows = items.map((it) => {
    const verdicts = detectSms(it.text, sourceOf(it.channel));
    return { ...it, verdicts, alert: Object.values(verdicts).some(alerts) };
  });
  const byCategory: Record<string, { label: string; n: number; alerts: number }> = {};
  for (const r of rows) {
    const c = (byCategory[r.category] ??= { label: r.label, n: 0, alerts: 0 });
    c.n++; if (r.alert) c.alerts++;
  }
  const tp = rows.filter((r) => r.label === 'scam' && r.alert).length, fn = rows.filter((r) => r.label === 'scam' && !r.alert).length;
  const fp = rows.filter((r) => r.label === 'benign' && r.alert).length, tn = rows.filter((r) => r.label === 'benign' && !r.alert).length;
  return { n: rows.length, scam: { tp, fn, recall: wilson(tp, tp + fn) }, benign: { fp, tn, fpr: wilson(fp, fp + tn) }, byCategory, rows };
}

function mainSynthetic(): void {
  const lockFile = join(SYN_DIR, 'LOCK.json');
  const digest = createHash('sha256').update(readFileSync(join(SYN_DIR, 'test.jsonl'))).digest('hex');
  if (!existsSync(lockFile)) {
    writeFileSync(lockFile, JSON.stringify({ lockedAt: new Date().toISOString(), testSha256: digest }, null, 2) + '\n');
    console.log(`locked test.jsonl (${lockFile})`);
  }
  if ((JSON.parse(readFileSync(lockFile, 'utf8')) as { testSha256: string }).testSha256 !== digest) throw new Error('test.jsonl no longer matches LOCK.json');
  const split = process.argv.includes('--split') ? process.argv[process.argv.indexOf('--split') + 1] : 'dev';
  if (split === 'test' && !process.argv.includes('--final')) throw new Error('the test split runs only with --final, on owner request');
  const r = evaluateSynthetic(loadSynthetic(SYN_DIR, split === 'test' ? ['test'] : ['train', 'validation']));
  console.log(JSON.stringify({ split, n: r.n, scam: r.scam, benign: r.benign, byCategory: r.byCategory }, null, 2));
  const misses = process.argv.indexOf('--misses');
  if (split === 'dev' && misses > 0) {
    const cat = process.argv[misses + 1];
    for (const row of r.rows.filter((x) => (x.label === 'scam') !== x.alert && (!cat || cat.startsWith('--') || x.category === cat))) {
      console.log(`[${row.label} · ${row.category} · ${row.channel} · ${row.alert ? 'ALERT' : 'quiet'}] ${row.text}`);
    }
  }
}

function main(): void {
  if (process.argv.includes('--dataset') && process.argv[process.argv.indexOf('--dataset') + 1] === 'synthetic') { mainSynthetic(); return; }
  const items = loadSms();
  const lockFile = join(SMS_DIR, 'LOCK.json');
  const test = items.filter((i) => i.split === 'test');
  if (!existsSync(lockFile)) {
    writeFileSync(lockFile, JSON.stringify({ lockedAt: new Date().toISOString(), salt: SALT, test: test.map((t) => t.key).sort() }, null, 2) + '\n');
    console.log(`locked ${test.length} test messages (${lockFile})`);
  }
  const lock = JSON.parse(readFileSync(lockFile, 'utf8')) as { test: string[] };
  const missing = test.filter((t) => !lock.test.includes(t.key));
  if (missing.length > 0 || lock.test.length !== test.length) throw new Error('the dataset no longer matches LOCK.json');
  const split = process.argv.includes('--split') ? process.argv[process.argv.indexOf('--split') + 1] : 'dev';
  if (split === 'test' && !process.argv.includes('--final')) throw new Error('the test half runs only with --final, on owner request');
  const r = evaluateSms(items.filter((i) => i.split === split));
  const summary = { split, n: r.n, penipuan: r.penipuan, normal: r.normal, promo: r.promo };
  console.log(JSON.stringify(summary, null, 2));
  if (split === 'dev' && process.argv.includes('--misses')) {
    for (const row of r.rows.filter((x) => (x.label === 'penipuan') !== x.alert && x.label !== 'promo')) {
      console.log(`\n[${row.label} · ${row.alert ? 'ALERT' : 'quiet'} · ${row.key}] ${JSON.stringify(row.verdicts)}\n${row.text}`);
    }
  }
}

if (process.argv[1]?.endsWith('external-cli.mjs')) main();
