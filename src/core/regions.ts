// Regions: maximal runs of consecutive blocks sharing a containerId (DETECTION_MODEL.md §3, D-019).
import type { Block, Region } from './types.js';

export interface RegionInfo {
  region: Region;
  index: number;
  blocks: Block[];
  /** True for containers that only hold hidden candidates / triggers. They never correlate. */
  unplaced: boolean;
}

export function buildRegions(blocks: readonly Block[]): RegionInfo[] {
  const out: RegionInfo[] = [];
  let run: Block[] = [];
  const flush = (): void => {
    if (run.length === 0) return;
    const first = run[0] as Block;
    const last = run[run.length - 1] as Block;
    out.push({
      region: {
        id: `${first.containerId}:${first.id}-${last.id}`,
        containerId: first.containerId,
        blockIds: run.map((b) => b.id),
      },
      index: out.length,
      blocks: run,
      unplaced: false,
    });
    run = [];
  };
  for (const b of blocks) {
    if (run.length > 0 && (run[0] as Block).containerId !== b.containerId) flush();
    run.push(b);
  }
  flush();
  return out;
}

export function unplacedRegion(containerId: string, index: number): RegionInfo {
  return {
    region: { id: `${containerId}:unplaced`, containerId, blockIds: [] },
    index,
    blocks: [],
    unplaced: true,
  };
}
