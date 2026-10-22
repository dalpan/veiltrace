// External dataset harness (D-099): CSV parsing and the deterministic dev/test split, without any dataset file.
import { describe, expect, it } from 'vitest';
import { parseCsv, splitOf } from '../src/eval/external.js';

describe('external dataset harness', () => {
  it('parses quoted fields with commas, quotes and line breaks', () => {
    expect(parseCsv('Teks,label\n"a, ""b""\nc",penipuan\nplain,normal\n')).toEqual([['Teks', 'label'], ['a, "b"\nc', 'penipuan'], ['plain', 'normal']]);
  });

  it('assigns each message to dev or test by a stable hash of its text', () => {
    expect(splitOf('contoh pesan')).toEqual(splitOf('contoh pesan'));
    const splits = Array.from({ length: 400 }, (_, i) => splitOf(`pesan ${i}`).split);
    const test = splits.filter((s) => s === 'test').length;
    expect(test).toBeGreaterThan(150);
    expect(test).toBeLessThan(250);
  });
});
