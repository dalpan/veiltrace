// Real-world field sample (D-082): redacted text records of scam and benign messages collected by people other than the
// rule author, with deterministic dev/test assignment, two-annotator labels, agreement, a hash lock for the test half, and
// an evaluation that runs all four detectors on each record. Node-only, never shipped. CLI: `npm run realworld -- <cmd>`.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyze, analyzeCredentials, analyzePayments, analyzeSupport, type PageSnapshot, type Verdict } from '../core/index.js';

export const DIR = join('corpus', 'realworld');
export const RECORDS = join(DIR, 'records');
export const LOCK = join(DIR, 'LOCK.json');
/** Fixed before the first record existed; changing it would reshuffle dev/test and is not allowed. */
const SPLIT_SALT = 'veiltrace-realworld-v1-2026-10-22';

export type Source = 'wa' | 'sms' | 'web-comment' | 'web-page' | 'email' | 'social' | 'other';
export type Context = 'chat' | 'comment' | 'page' | 'dialog';
export type Category = 'cmd' | 'cred' | 'pay' | 'sup' | 'none';
export type Expected = 'manipulative' | 'suspicious' | 'observed' | 'none';

export interface Label {
  annotator: string;
  truth: 'malicious' | 'benign';
  category: Category;
  expected: Expected;
}

export interface RecordV1 {
  id: string;
  schema: 1;
  lang: 'id' | 'en';
  source: Source;
  context: Context;
  /** Redacted text only. Raw submissions never enter the repository. */
  text: string;
  collected: string;
  collector: string;
  /** "public: <defanged reference>" or "private: volunteer submission". */
  origin: string;
  split: 'dev' | 'test';
  /** Set when the rule author saw the record before the split (D-091): it is then always dev, never held out. */
  seen?: string;
  labels: Label[];
  /** Set by adjudication when annotators disagree. */
  final?: Omit<Label, 'annotator'>;
}

// ---------- redaction ----------

export interface Redaction {
  text: string;
  replaced: Array<{ kind: string; count: number }>;
  warnings: string[];
}

const RULES: Array<{ kind: string; re: RegExp; to: string }> = [
  { kind: 'email', re: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[a-z]{2,}/giu, to: '[EMAIL]' },
  { kind: 'url', re: /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|id|net|org|co|xyz|top|site|online|info|link|me|io|app|ly|cc)(?:\/[^\s<>"']*)?/giu, to: '[TAUTAN]' },
  { kind: 'handle', re: /(?<![\p{L}\p{N}_])@[\p{L}\p{N}_.]{2,}/gu, to: '@[AKUN]' },
  { kind: 'phone', re: /(?:\+?\d[\d\s().-]{7,}\d)/gu, to: '[NOMOR]' },
  { kind: 'name-after-account', re: /\b(a\.?\s?n\.?|atas\s+nama)\s+[A-Z][\p{L}'.-]*(?:\s+[A-Z][\p{L}'.-]*){0,3}/gu, to: '$1 [NAMA]' },
  { kind: 'long-number', re: /\d{6,}/gu, to: '[ANGKA]' },
];

/** Masks contact details, links, handles, account and other long numbers. Names cannot be found reliably: see warnings. */
export function redact(raw: string): Redaction {
  let text = raw.replace(/\r\n?/g, '\n').trim();
  const replaced: Redaction['replaced'] = [];
  for (const r of RULES) {
    let count = 0;
    text = text.replace(r.re, (match: string, group?: unknown) => {
      // A phone match that is only a date or a price is left alone (fewer than 9 digits).
      if (r.kind === 'phone' && match.replace(/\D/g, '').length < 9) return match;
      count++;
      return r.to.replace('$1', typeof group === 'string' ? group : '');
    });
    if (count > 0) replaced.push({ kind: r.kind, count });
  }
  const warnings: string[] = [];
  if (/\b(?:Bapak|Ibu|Pak|Bu|Mas|Mbak|Kak|Mr|Mrs|Ms)\.?\s+[A-Z][a-z]+/u.test(text)) warnings.push('possible personal name after a title (Pak/Bu/Kak/Mr…): replace it by hand with [NAMA]');
  if (/\b\d{4,5}\b/u.test(text)) warnings.push('4–5 digit numbers remain (OTP codes, PINs?): replace real codes by hand with [KODE]');
  return { text, replaced, warnings };
}

/** Problems that make a record unfit for the repository (checked by tests over the whole corpus). */
export function privacyProblems(text: string): string[] {
  const out: string[] = [];
  if (/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[a-z]{2,}/iu.test(text)) out.push('email address');
  if (/\bhttps?:\/\/|\bwww\./iu.test(text)) out.push('link');
  if ((text.match(/\d/g) ?? []).length > 0 && /\d[\d\s().-]{7,}\d/u.test(text) && /\d{6,}|\d(?:[\s.-]?\d){8,}/u.test(text)) out.push('phone or long number');
  return out;
}

// ---------- records, split, lock ----------

export function splitFor(id: string): 'dev' | 'test' {
  const b = createHash('sha256').update(`${SPLIT_SALT}:${id}`).digest()[0] as number;
  return b < 128 ? 'test' : 'dev';
}

export function loadRecords(dir = RECORDS): RecordV1[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as RecordV1);
}

export const recordHash = (r: RecordV1): string => createHash('sha256').update(JSON.stringify(r)).digest('hex');

export interface LockFile {
  version: 1;
  lockedAt: string;
  test: Record<string, string>;
}

/** Errors when a locked test record changed or disappeared, or a new test record appeared after the lock. */
export function lockProblems(records: readonly RecordV1[], lock: LockFile | null): string[] {
  if (!lock) return [];
  const out: string[] = [];
  const byId = new Map(records.map((r) => [r.id, r]));
  for (const [id, hash] of Object.entries(lock.test)) {
    const r = byId.get(id);
    if (!r) out.push(`${id}: locked test record missing`);
    else if (recordHash(r) !== hash) out.push(`${id}: locked test record changed`);
  }
  for (const r of records) if (r.split === 'test' && !(r.id in lock.test)) out.push(`${r.id}: test record added after the lock (needs a new lock version)`);
  return out;
}

export function validateRecord(r: RecordV1): string[] {
  const e: string[] = [];
  const req = (c: boolean, m: string): void => { if (!c) e.push(`${r.id}: ${m}`); };
  req(/^RW-\d{4}$/.test(r.id), 'id must be RW-NNNN');
  req(r.schema === 1, 'schema must be 1');
  req(r.lang === 'id' || r.lang === 'en', 'lang must be id|en');
  req(['wa', 'sms', 'web-comment', 'web-page', 'email', 'social', 'other'].includes(r.source), 'invalid source');
  req(['chat', 'comment', 'page', 'dialog'].includes(r.context), 'invalid context');
  req(typeof r.text === 'string' && r.text.length > 0 && r.text.length <= 4000, 'text must be 1–4000 characters');
  req(r.split === (r.seen ? 'dev' : splitFor(r.id)), 'split must match the deterministic assignment (dev when seen)');
  req(r.seen === undefined || (typeof r.seen === 'string' && r.seen.length > 0), 'seen must be a non-empty reason');
  req(/^(public|private): /.test(r.origin), 'origin must start with "public: " or "private: "');
  for (const p of privacyProblems(r.text)) e.push(`${r.id}: contains ${p}; redact it`);
  for (const l of r.labels) {
    req(['malicious', 'benign'].includes(l.truth) && ['cmd', 'cred', 'pay', 'sup', 'none'].includes(l.category)
      && ['manipulative', 'suspicious', 'observed', 'none'].includes(l.expected), `invalid label by ${l.annotator}`);
    req((l.truth === 'benign') === (l.category === 'none' || l.expected === 'observed' || l.expected === 'none'), `inconsistent label by ${l.annotator}`);
  }
  return e;
}

// ---------- agreement ----------

/** Cohen's kappa between two annotators over the records both labelled. */
export function kappa(records: readonly RecordV1[], a: string, b: string, field: 'truth' | 'category'): { n: number; kappa: number | null; disagreements: string[] } {
  const pairs = records.flatMap((r) => {
    const la = r.labels.find((l) => l.annotator === a);
    const lb = r.labels.find((l) => l.annotator === b);
    return la && lb ? [{ id: r.id, x: la[field], y: lb[field] }] : [];
  });
  const n = pairs.length;
  if (n === 0) return { n, kappa: null, disagreements: [] };
  const values = [...new Set(pairs.flatMap((p) => [p.x, p.y]))];
  const po = pairs.filter((p) => p.x === p.y).length / n;
  const pe = values.reduce((s, v) => s + (pairs.filter((p) => p.x === v).length / n) * (pairs.filter((p) => p.y === v).length / n), 0);
  return { n, kappa: pe === 1 ? 1 : (po - pe) / (1 - pe), disagreements: pairs.filter((p) => p.x !== p.y).map((p) => p.id) };
}

/** The label a record is evaluated against: adjudicated, else unanimous; undefined when annotators disagree. */
export function resolved(r: RecordV1): Omit<Label, 'annotator'> | undefined {
  if (r.final) return r.final;
  if (r.labels.length < 2) return undefined;
  const [first, ...rest] = r.labels as [Label, ...Label[]];
  return rest.every((l) => l.truth === first.truth && l.category === first.category) ? { truth: first.truth, category: first.category, expected: first.expected } : undefined;
}

// ---------- evaluation ----------

const CONTAINER: Record<Context, string> = { chat: 'ugc:#message', comment: 'ugc:#comment', page: 'body', dialog: 'dialog:#d' };

/**
 * A text record shown as the content a detector would see: one block per non-empty line, inside a container that matches
 * where such text appears (a chat message or comment is content written by someone else). An approximation of a page.
 */
/**
 * Redaction placeholders stand for a link, a number or an address that was in the message. The detectors see a fictional value of
 * the same shape, as they would in the original message; nothing of the original is restored.
 */
export function restorePlaceholders(text: string): string {
  return text.replace(/\[TAUTAN\]/gu, 'https://link.example.invalid/x').replace(/\[NOMOR\]/gu, '081200000000')
    .replace(/\[EMAIL\]/gu, 'someone@example.invalid').replace(/\[ANGKA\]/gu, '1234567890');
}

export function snapshotOf(r: RecordV1): PageSnapshot {
  const lines = restorePlaceholders(r.text).split('\n').map((t) => t.trim()).filter(Boolean);
  return {
    schemaVersion: 1, url: 'about:blank', title: '', lang: r.lang,
    blocks: lines.map((t, i) => ({ id: `b${i}`, text: t, containerId: CONTAINER[r.context], locator: `#b${i}`, ctx: r.context === 'dialog' ? { dialog: true } : {}, headingContext: null })),
    hiddenCopyCandidates: [], copyTriggers: [], coverage: { framesSkipped: 0, truncated: false, closedShadowRootsSkipped: 0 },
  };
}

const TIER: Record<Verdict, number> = { none: 0, observed_instruction: 1, suspicious_correlation: 2, manipulative_instruction: 3 };

export function detect(r: RecordV1): { verdict: Verdict; byCategory: Record<Exclude<Category, 'none'>, Verdict> } {
  const s = snapshotOf(r);
  const byCategory = { cmd: analyze(s).verdict, cred: analyzeCredentials(s).verdict, pay: analyzePayments(s).verdict, sup: analyzeSupport(s).verdict };
  const verdict = Object.values(byCategory).reduce((a, b) => (TIER[b] > TIER[a] ? b : a), 'none' as Verdict);
  return { verdict, byCategory };
}

export interface EvalRow { id: string; truth: 'malicious' | 'benign'; category: Category; predicted: Verdict; alert: boolean; rightCategory: boolean | null }

export function evaluate(records: readonly RecordV1[], split: 'dev' | 'test'): { rows: EvalRow[]; excluded: string[]; tp: number; fp: number; tn: number; fn: number } {
  const rows: EvalRow[] = [];
  const excluded: string[] = [];
  for (const r of records.filter((x) => x.split === split)) {
    const label = resolved(r);
    if (!label) { excluded.push(r.id); continue; }
    const d = detect(r);
    const alert = TIER[d.verdict] >= 2;
    const rightCategory = label.truth === 'malicious' && label.category !== 'none' ? TIER[d.byCategory[label.category]] >= 2 : null;
    rows.push({ id: r.id, truth: label.truth, category: label.category, predicted: d.verdict, alert, rightCategory });
  }
  const count = (t: string, a: boolean): number => rows.filter((x) => x.truth === t && x.alert === a).length;
  return { rows, excluded, tp: count('malicious', true), fn: count('malicious', false), fp: count('benign', true), tn: count('benign', false) };
}

// ---------- CLI ----------

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

// ---------- screenshot import (D-096) ----------

/**
 * OCR output is one screen line per line: drops clock times, status-bar fragments and single characters, and joins a line
 * that continues the previous sentence (the previous line has no closing punctuation and this one starts in lower case).
 */
export function cleanOcrLines(lines: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+/gu, ' ').trim();
    if (!line || /^\d{1,2}[.:]\d{2}(?:\s*[✓√]+)?$/u.test(line) || (line.match(/\p{L}/gu) ?? []).length < 2) continue;
    const prev = out[out.length - 1];
    if (prev !== undefined && !/[.!?:;)\]]$/u.test(prev) && /^\p{Ll}/u.test(line)) out[out.length - 1] = `${prev} ${line}`;
    else out.push(line);
  }
  return out;
}

/** Label sheet for annotators (D-096): a static page, opened offline in any browser, that saves a labels JSON file. */
export function labelSheet(records: readonly RecordV1[], annotator: string): string {
  const data = JSON.stringify(records.map((r) => ({ id: r.id, source: r.source, text: r.text }))).replace(/</gu, '\\u003c');
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
<title>Lembar label VeilTrace</title><style>body{font:15px system-ui,sans-serif;max-width:820px;margin:16px auto;padding:0 12px}
article{border:1px solid #ccc;border-radius:8px;padding:12px;margin:12px 0}pre{white-space:pre-wrap;background:#f4f4f4;padding:8px}label{margin-right:12px}</style></head><body>
<h1>Lembar label · anotator ${annotator.replace(/[^\w-]/gu, '')}</h1>
<p>Baca setiap pesan dan pilih jawaban Anda sendiri, tanpa berdiskusi dengan anotator lain. <b>Benar</b>: penipuan/manipulasi atau bukan. <b>Kategori</b>: cmd = disuruh menjalankan perintah; cred = diminta password/OTP/PIN; pay = diminta membayar/transfer; sup = mengaku CS/bank/instansi/perusahaan, hadiah palsu, jasa ilegal; none = bukan penipuan. <b>Seharusnya</b>: manipulative (jelas menipu), suspicious (mencurigakan), observed (instruksi biasa), none (tidak ada apa-apa). Setelah selesai, klik Simpan dan kirim file JSON-nya ke pemilik proyek.</p>
<div id="list"></div><button id="save" type="button">Simpan label (JSON)</button> <a id="dl" hidden download="labels-${annotator.replace(/[^\w-]/gu, '')}.json">Unduh</a><p id="msg"></p>
<script>
const RECORDS=${data};const A=${JSON.stringify(annotator)};
const opts={truth:['malicious','benign'],category:['cmd','cred','pay','sup','none'],expected:['manipulative','suspicious','observed','none']};
const list=document.getElementById('list');
for(const r of RECORDS){const a=document.createElement('article');const h=document.createElement('h3');h.textContent=r.id+' · '+r.source;const pre=document.createElement('pre');pre.textContent=r.text;a.append(h,pre);
for(const [k,vals] of Object.entries(opts)){const p=document.createElement('p');p.append(k==='truth'?'Benar: ':k==='category'?'Kategori: ':'Seharusnya: ');
for(const v of vals){const l=document.createElement('label');const i=document.createElement('input');i.type='radio';i.name=r.id+'-'+k;i.value=v;l.append(i,' '+v);p.append(l);}a.append(p);}list.append(a);}
document.getElementById('save').onclick=()=>{const out=[];const missing=[];for(const r of RECORDS){const l={id:r.id,annotator:A};for(const k of Object.keys(opts)){const c=document.querySelector('input[name="'+r.id+'-'+k+'"]:checked');if(!c){missing.push(r.id);break;}l[k]=c.value;}if(Object.keys(l).length===5)out.push(l);}
document.getElementById('msg').textContent=missing.length?'Belum lengkap: '+[...new Set(missing)].join(', '):'Lengkap: '+out.length+' label.';
const dl=document.getElementById('dl');dl.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}));dl.hidden=false;dl.click();};
</script></body></html>
`;
}

function nextId(records: readonly RecordV1[]): string {
  const max = records.reduce((m, r) => Math.max(m, Number(r.id.slice(3))), 0);
  return `RW-${String(max + 1).padStart(4, '0')}`;
}

async function stdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  const records = loadRecords();
  const lock = existsSync(LOCK) ? (JSON.parse(readFileSync(LOCK, 'utf8')) as LockFile) : null;
  if (cmd === 'redact') {
    const r = redact(await stdin());
    console.log(r.text);
    console.error(JSON.stringify({ replaced: r.replaced, warnings: r.warnings }, null, 2));
  } else if (cmd === 'add') {
    const r = redact(await stdin());
    const id = nextId(records);
    const rec: RecordV1 = {
      id, schema: 1, lang: (arg('lang') ?? 'id') as RecordV1['lang'], source: (arg('source') ?? 'other') as Source, context: (arg('context') ?? 'chat') as Context,
      text: r.text, collected: arg('collected') ?? new Date().toISOString().slice(0, 10), collector: arg('collector') ?? 'unknown',
      origin: arg('origin') ?? 'private: volunteer submission', split: arg('seen') ? 'dev' : splitFor(id), labels: [],
    };
    if (arg('seen')) rec.seen = arg('seen');
    const errors = validateRecord(rec);
    if (errors.length > 0) throw new Error(`not added:\n${errors.join('\n')}`);
    mkdirSync(RECORDS, { recursive: true });
    writeFileSync(join(RECORDS, `${id}.json`), JSON.stringify(rec, null, 2) + '\n');
    console.log(`added ${id} (${rec.split}); redactions: ${JSON.stringify(r.replaced)}${r.warnings.length ? `\nCHECK BY HAND: ${r.warnings.join('; ')}` : ''}`);
  } else if (cmd === 'import') {
    // OCR every image in a folder on this Mac (macOS Vision), clean, redact and add it. The text is never printed: the
    // collector reviews each record with `show` and fixes names by hand before anyone labels it.
    const dir = process.argv[3];
    if (!dir || !existsSync(dir)) throw new Error('usage: npm run realworld -- import <folder> --collector <initials> [--source wa] [--lang id]');
    mkdirSync('dist', { recursive: true });
    if (!existsSync('dist/ocr')) execFileSync('swiftc', ['-O', 'scripts/ocr.swift', '-o', 'dist/ocr'], { stdio: 'inherit' });
    const seenOrigins = new Set(records.map((r) => r.origin));
    let all = [...records];
    for (const f of readdirSync(dir).filter((x) => /\.(?:jpe?g|png|heic)$/iu.test(x)).sort()) {
      const origin = `private: collector submission (${f})`;
      if (seenOrigins.has(origin)) { console.log(`skip ${f} (already imported)`); continue; }
      const lines = cleanOcrLines(execFileSync('dist/ocr', [join(dir, f)], { encoding: 'utf8' }).split('\n'));
      const red = redact(lines.join('\n'));
      const id = nextId(all);
      const rec: RecordV1 = {
        id, schema: 1, lang: (arg('lang') ?? 'id') as RecordV1['lang'], source: (arg('source') ?? 'wa') as Source, context: (arg('context') ?? 'chat') as Context,
        text: red.text.slice(0, 4000), collected: new Date().toISOString().slice(0, 10), collector: arg('collector') ?? 'unknown', origin, split: splitFor(id), labels: [],
      };
      const errors = validateRecord(rec);
      if (errors.length > 0) { console.log(`NOT ADDED ${f}: ${errors.join('; ')}`); continue; }
      writeFileSync(join(RECORDS, `${id}.json`), JSON.stringify(rec, null, 2) + '\n');
      all = [...all, rec];
      console.log(`added ${id} (${rec.split}) from ${f}; ${lines.length} lines; redactions ${JSON.stringify(red.replaced)}${red.warnings.length ? ' · CHECK NAMES/CODES BY HAND' : ''}`);
    }
    console.log('Review every new record with `npm run realworld -- show RW-NNNN` and edit names, codes or OCR noise in its JSON before labelling.');
  } else if (cmd === 'show') {
    const rec = records.find((r) => r.id === process.argv[3]);
    if (!rec) throw new Error('usage: npm run realworld -- show RW-NNNN');
    console.log(`${rec.id} · ${rec.split} · ${rec.source}/${rec.context} · ${rec.origin}\n\n${rec.text}`);
  } else if (cmd === 'sheet') {
    const annotator = arg('annotator') ?? 'A';
    const todo = records.filter((r) => !(lock && r.id in lock.test) && !r.labels.some((l) => l.annotator === annotator));
    const out = arg('out') ?? join('dist', `label-sheet-${annotator}.html`);
    mkdirSync('dist', { recursive: true });
    writeFileSync(out, labelSheet(todo, annotator));
    console.log(`label sheet for annotator ${annotator}: ${todo.length} records → ${out}`);
  } else if (cmd === 'label-import') {
    const file = process.argv[3];
    if (!file) throw new Error('usage: npm run realworld -- label-import <labels.json>');
    const labels = JSON.parse(readFileSync(file, 'utf8')) as Array<Label & { id: string }>;
    let n = 0;
    for (const { id, ...label } of labels) {
      const rec = records.find((r) => r.id === id);
      if (!rec || (lock && id in lock.test)) { console.log(`skip ${id}`); continue; }
      const next = { ...rec, labels: [...rec.labels.filter((l) => l.annotator !== label.annotator), label] };
      const errors = validateRecord(next);
      if (errors.length > 0) { console.log(`skip ${id}: ${errors.join('; ')}`); continue; }
      writeFileSync(join(RECORDS, `${id}.json`), JSON.stringify(next, null, 2) + '\n');
      n++;
    }
    console.log(`imported ${n} labels from ${file}`);
  } else if (cmd === 'label') {
    const id = process.argv[3] as string;
    const rec = records.find((r) => r.id === id);
    if (!rec) throw new Error(`no record ${id}`);
    if (lock && id in lock.test) throw new Error(`${id} is a locked test record`);
    const label: Label = { annotator: arg('annotator') ?? '', truth: arg('truth') as Label['truth'], category: arg('category') as Category, expected: arg('expected') as Expected };
    rec.labels = [...rec.labels.filter((l) => l.annotator !== label.annotator), label];
    const errors = validateRecord(rec);
    if (errors.length > 0 || !label.annotator) throw new Error(errors.join('\n') || '--annotator is required');
    writeFileSync(join(RECORDS, `${id}.json`), JSON.stringify(rec, null, 2) + '\n');
    console.log(`labelled ${id} by ${label.annotator}`);
  } else if (cmd === 'agree') {
    const [a, b] = [arg('a') ?? 'A', arg('b') ?? 'B'];
    for (const field of ['truth', 'category'] as const) console.log(field, JSON.stringify(kappa(records, a, b, field)));
  } else if (cmd === 'lock') {
    if (lock) throw new Error('already locked; a new lock version needs an owner decision');
    const test = records.filter((r) => r.split === 'test');
    const unresolved = test.filter((r) => !resolved(r)).map((r) => r.id);
    if (unresolved.length > 0) throw new Error(`resolve labels first (adjudicate "final"): ${unresolved.join(', ')}`);
    writeFileSync(LOCK, JSON.stringify({ version: 1, lockedAt: new Date().toISOString(), test: Object.fromEntries(test.map((r) => [r.id, recordHash(r)])) }, null, 2) + '\n');
    console.log(`locked ${test.length} test records`);
  } else if (cmd === 'eval') {
    const split = (arg('split') ?? 'dev') as 'dev' | 'test';
    if (split === 'test' && !process.argv.includes('--final')) throw new Error('the test half is evaluated only with --final, on owner request, after the lock');
    if (split === 'test' && !lock) throw new Error('lock the test half first');
    const problems = lockProblems(records, lock);
    if (problems.length > 0) throw new Error(problems.join('\n'));
    const r = evaluate(records, split);
    console.log(JSON.stringify({ split, n: r.rows.length, excluded: r.excluded, tp: r.tp, fp: r.fp, tn: r.tn, fn: r.fn, rows: r.rows }, null, 2));
  } else {
    console.log('usage: npm run realworld -- redact|add|import|show|sheet|label|label-import|agree|lock|eval  (see corpus/realworld/README.md)');
  }
}

if (process.argv[1]?.endsWith('realworld-cli.mjs')) await main();
