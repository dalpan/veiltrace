// Corpus loading, label validation and hash manifests (EVALUATION_PLAN.md §2–§3). Node-only, never shipped.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Classification } from '../core/types.js';

export type Split = 'dev' | 'test';
export type Truth = 'malicious' | 'benign';
export type ExpectedClass = Classification | 'none';

export interface ScenarioLabel {
  id: string;
  split: Split;
  lang: 'en' | 'id';
  category: 'positive' | 'benign' | 'ambiguous' | 'adversarial';
  threatClass: string;
  truth: Truth;
  expectedClass: ExpectedClass;
  hardNegative: boolean;
  /** First page is the entry point. URLs use fictional hosts and are served from local files. */
  pages: Array<{ url: string; file: string }>;
  /** Simulated user interaction before scanning. */
  steps: Array<{ click: string }>;
  /** CSS selector that must contain all evidence of a true positive (null for benign scenarios). */
  evidenceWithin: string | null;
  description: string;
  rationale: string;
  author: string;
  created: string;
}

export interface Scenario {
  dir: string;
  label: ScenarioLabel;
}

const CLASSES: readonly ExpectedClass[] = ['none', 'observed_instruction', 'suspicious_correlation', 'manipulative_instruction'];

export function validateLabel(l: ScenarioLabel, dirName: string, split: Split): string[] {
  const errors: string[] = [];
  const req = (cond: boolean, msg: string): void => { if (!cond) errors.push(`${dirName}: ${msg}`); };
  req(l.id === dirName, 'id must equal directory name');
  req(l.split === split, `split must be "${split}"`);
  req(l.lang === 'en' || l.lang === 'id', 'lang must be en|id');
  req(['positive', 'benign', 'ambiguous', 'adversarial'].includes(l.category), 'invalid category');
  req(l.truth === 'malicious' || l.truth === 'benign', 'truth must be malicious|benign');
  req(CLASSES.includes(l.expectedClass), 'invalid expectedClass');
  req(l.truth !== 'malicious' || l.expectedClass === 'manipulative_instruction' || l.expectedClass === 'suspicious_correlation',
    'malicious scenarios must expect a positive class');
  req(l.truth !== 'benign' || l.expectedClass === 'none' || l.expectedClass === 'observed_instruction',
    'benign scenarios must expect none|observed_instruction');
  req(l.truth !== 'malicious' || typeof l.evidenceWithin === 'string', 'malicious scenarios need evidenceWithin');
  req(Array.isArray(l.pages) && l.pages.length > 0 && l.pages.every((p) => /^https:\/\/[a-z0-9.-]+\.(example|test|invalid)\//.test(p.url)),
    'pages must use fictional .example/.test/.invalid hosts');
  req(Array.isArray(l.steps), 'steps must be an array');
  req(typeof l.hardNegative === 'boolean', 'hardNegative must be boolean');
  req(!l.hardNegative || l.truth === 'benign', 'hardNegative implies benign');
  return errors;
}

export function loadSplit(root: string, split: Split): Scenario[] {
  const base = join(root, split);
  return readdirSync(base)
    .filter((d) => statSync(join(base, d)).isDirectory())
    .sort()
    .map((d) => ({ dir: join(base, d), label: JSON.parse(readFileSync(join(base, d, 'label.json'), 'utf8')) as ScenarioLabel }));
}

export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

export interface Manifest {
  split: Split;
  frozenAt: string;
  scenarios: number;
  files: Record<string, string>;
  /** sha256 over the sorted "path␠hash\n" lines. */
  aggregate: string;
}

export function computeManifest(root: string, split: Split, frozenAt: string): Manifest {
  const base = join(root, split);
  const files: Record<string, string> = {};
  for (const f of listFiles(base)) {
    const rel = relative(base, f).split('\\').join('/');
    if (rel === 'MANIFEST.json' || rel === 'README.md') continue;
    files[rel] = sha256(readFileSync(f));
  }
  const aggregate = sha256(Object.keys(files).sort().map((k) => `${k} ${files[k]}\n`).join(''));
  return { split, frozenAt, scenarios: loadSplit(root, split).length, files, aggregate };
}

/** Returns a list of differences between the stored manifest and the files on disk (empty = intact). */
export function verifyManifest(root: string, split: Split): string[] {
  const stored = JSON.parse(readFileSync(join(root, split, 'MANIFEST.json'), 'utf8')) as Manifest;
  const now = computeManifest(root, split, stored.frozenAt);
  const diffs: string[] = [];
  for (const k of new Set([...Object.keys(stored.files), ...Object.keys(now.files)])) {
    if (stored.files[k] !== now.files[k]) diffs.push(k);
  }
  if (stored.aggregate !== now.aggregate) diffs.push('(aggregate)');
  return diffs;
}
