// Helpers to write PageSnapshot fixtures by hand (M1 has no DOM extractor).
import type { BlockContext, CopyTrigger, HiddenCopyCandidate, PageSnapshot } from '../../src/core/types.js';

export interface BlockSpec {
  t: string;
  /** containerId, default "body". */
  c?: string;
  ctx?: BlockContext;
  /** headingContext */
  h?: string;
}

export interface SnapshotExtras {
  hidden?: Array<Omit<HiddenCopyCandidate, 'id' | 'via'> & { via?: HiddenCopyCandidate['via'] }>;
  triggers?: Array<Omit<CopyTrigger, 'id'>>;
  url?: string;
  title?: string;
}

export function snapshot(blocks: Array<BlockSpec | string>, extras: SnapshotExtras = {}): PageSnapshot {
  return {
    schemaVersion: 1,
    url: extras.url ?? 'http://localhost/fixture',
    title: extras.title ?? 'fixture',
    lang: null,
    blocks: blocks.map((b, i) => {
      const spec = typeof b === 'string' ? { t: b } : b;
      return {
        id: `b${i}`,
        text: spec.t,
        containerId: spec.c ?? 'body',
        locator: `#b${i}`,
        ctx: spec.ctx ?? {},
        headingContext: spec.h ?? null,
      };
    }),
    hiddenCopyCandidates: (extras.hidden ?? []).map((h, i) => ({ via: 'hidden-el', ...h, id: `h${i}` })),
    copyTriggers: (extras.triggers ?? []).map((t, i) => ({ ...t, id: `t${i}` })),
    coverage: { framesSkipped: 0, truncated: false, closedShadowRootsSkipped: 0 },
  };
}

/** Assigns the same container and context to a list of texts. */
export function inContainer(c: string, texts: string[], ctx: BlockContext = {}, h?: string): BlockSpec[] {
  return texts.map((t) => ({ t, c, ctx, ...(h ? { h } : {}) }));
}
