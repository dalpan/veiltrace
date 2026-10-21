// Held-out v2 is frozen (D-085): every file must match MANIFEST.json, and the harness refuses to run without --final.
// This test reads hashes only; it never runs a detector on the split.
import { describe, expect, it } from 'vitest';
import { manifestProblems } from '../src/eval/v2.js';

describe('held-out v2 lock', () => {
  it('every scenario file matches the frozen manifest', () => {
    expect(manifestProblems()).toEqual([]);
  });
});
