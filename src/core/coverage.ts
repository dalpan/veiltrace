// Complete vs partial scan status (ARCHITECTURE.md §3.10). Reporting only; never affects detection.
import type { AnalysisResult, PartialReason } from './types.js';

export type ScanGap = PartialReason | 'extractor-truncated' | 'core-truncated';

export interface ScanStatus {
  /** True only when no gap is known. "Complete" means complete as far as VEILTRACE can observe (§3.9). */
  complete: boolean;
  reasons: ScanGap[];
}

export function scanStatus(coverage: AnalysisResult['coverage']): ScanStatus {
  const reasons: ScanGap[] = [];
  if (coverage.partial) reasons.push(...coverage.partial);
  else {
    // Snapshots without explicit reasons (hand-written or older extractors): derive what we can.
    if (coverage.truncated) reasons.push('extractor-truncated');
    if (coverage.framesSkipped > 0) reasons.push('frames-skipped');
    if (coverage.closedShadowRootsSkipped > 0) reasons.push('closed-shadow-skipped');
  }
  if (coverage.coreTruncated) reasons.push('core-truncated');
  return { complete: reasons.length === 0, reasons: [...new Set(reasons)] };
}
