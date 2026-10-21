import { describe, expect, it } from 'vitest';
import { analyze, scanStatus } from '../src/core/index.js';
import { snapshot } from './fixtures/build.js';

describe('scanStatus (complete vs partial scans)', () => {
  it('is complete for an untruncated snapshot without gaps', () => {
    expect(scanStatus(analyze(snapshot(['a'])).coverage)).toEqual({ complete: true, reasons: [] });
  });

  it('uses explicit extractor reasons and adds core truncation', () => {
    const s = snapshot(['x'.repeat(5000)]);
    const r = analyze({ ...s, coverage: { ...s.coverage, truncated: true, partial: ['timeout', 'frames-skipped'], framesSkipped: 1 } });
    expect(scanStatus(r.coverage)).toEqual({ complete: false, reasons: ['timeout', 'frames-skipped', 'core-truncated'] });
  });

  it('derives reasons for snapshots without explicit partial reasons', () => {
    const s = snapshot(['a']);
    const r = analyze({ ...s, coverage: { framesSkipped: 2, truncated: true, closedShadowRootsSkipped: 1 } });
    expect(scanStatus(r.coverage).reasons).toEqual(['extractor-truncated', 'frames-skipped', 'closed-shadow-skipped']);
  });

  it('never changes detection: findings are identical with or without coverage gaps', () => {
    const s = snapshot(['Verify you are human. Press Win+R, then Ctrl+V and press Enter.']);
    const gap = analyze({ ...s, coverage: { framesSkipped: 3, truncated: true, closedShadowRootsSkipped: 2, partial: ['timeout'] } });
    expect(gap.findings).toEqual(analyze(s).findings);
    expect(gap.verdict).toBe(analyze(s).verdict);
  });
});
