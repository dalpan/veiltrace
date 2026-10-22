// Held-out v3 is frozen (D-096): every file must match MANIFEST.json, and the harness refuses to run without --final.
// This test reads hashes only; it never runs a detector on the split.
import { describe, expect, it } from 'vitest';
import { manifestProblems } from '../src/eval/v2.js';
import { V3_DIR } from '../src/eval/v3.js';

describe('held-out v3 lock', () => {
  it('every scenario file matches the frozen manifest', () => {
    expect(manifestProblems(V3_DIR)).toEqual([]);
  });
});
