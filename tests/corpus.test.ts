import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEXICON } from '../src/core/lexicon/index.js';
import { normalize } from '../src/core/normalize.js';
import { loadSplit, validateLabel, verifyManifest, type Split } from '../src/eval/corpus.js';
import { KNOWN_LIMITATIONS, SCENARIOS } from './fixtures/scenarios.js';

const ROOT = 'corpus';

/** Crude visible-text approximation for overlap checks only (no browser, no detection). */
function htmlSentences(html: string): string[] {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return sentences(text);
}

/**
 * Composed sentences of >= 6 words. Shorter canonical lure phrases ("verify you are human", "press win + r")
 * legitimately recur across real lures, the lexicon and both splits. They are reported in
 * corpus/test/README.md as a known bias instead of failing this check.
 */
const MIN_WORDS = 6;

function sentences(text: string): string[] {
  return text
    .split(/[\n.!?]+/u)
    .map((s) => normalize(s).text.trim())
    .filter((s) => s.split(' ').length >= MIN_WORDS);
}

function corpusSentences(split: Split): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(join(ROOT, split))) return out;
  for (const sc of loadSplit(ROOT, split)) {
    for (const p of sc.label.pages) {
      for (const s of htmlSentences(readFileSync(join(sc.dir, p.file), 'utf8'))) out.set(s, sc.label.id);
    }
  }
  return out;
}

describe('held-out test split integrity (frozen)', () => {
  it('MANIFEST.json matches every file on disk', () => {
    expect(verifyManifest(ROOT, 'test')).toEqual([]);
  });

  it('labels are valid', () => {
    for (const sc of loadSplit(ROOT, 'test')) expect(validateLabel(sc.label, sc.dir.split('/').pop()!, 'test')).toEqual([]);
  });

  it('has the documented composition', () => {
    const labels = loadSplit(ROOT, 'test').map((s) => s.label);
    expect(labels).toHaveLength(26);
    expect(labels.filter((l) => l.truth === 'malicious')).toHaveLength(12);
    expect(labels.filter((l) => l.hardNegative)).toHaveLength(14);
    expect(labels.filter((l) => l.lang === 'id')).toHaveLength(11);
  });
});

describe('dev split labels', () => {
  it('are valid', () => {
    for (const sc of existsSync(join(ROOT, 'dev')) ? loadSplit(ROOT, 'dev') : []) {
      expect(validateLabel(sc.label, sc.dir.split('/').pop()!, 'dev')).toEqual([]);
    }
  });
});

describe('evaluation leakage checks (sentences of >= 6 words, normalized)', () => {
  const test = corpusSentences('test');
  const devOnly = [
    ...[...SCENARIOS, ...KNOWN_LIMITATIONS].flatMap((s) => s.snapshot.blocks.flatMap((b) => sentences(b.text))),
    ...LEXICON.flatMap((e) => e.examples.flatMap((x) => sentences(x))),
  ];

  it('no test sentence is copied from M1 fixtures or lexicon examples', () => {
    const hits = devOnly.filter((s) => test.has(s)).map((s) => `${test.get(s)}: "${s}"`);
    expect(hits).toEqual([]);
  });

  it('no test sentence is copied into the dev corpus', () => {
    const dev = corpusSentences('dev');
    const hits = [...dev.keys()].filter((s) => test.has(s)).map((s) => `${dev.get(s)} ⟷ ${test.get(s)}: "${s}"`);
    expect(hits).toEqual([]);
  });
});
