// Helpers to write PageSnapshot fixtures by hand (M1 has no DOM extractor).
import type { BlockContext, CopyTrigger, FormField, FormInfo, HiddenCopyCandidate, PageSnapshot } from '../../src/core/types.js';

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
  /** M5.1 structural form fields (ids fd0, fd1, …); omitted from the snapshot when not given. */
  fields?: Array<Omit<FormField, 'id' | 'hints'> & { hints?: string[] }>;
  forms?: FormInfo[];
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
    ...(extras.fields ? { formFields: extras.fields.map((f, i) => ({ hints: [], ...f, id: `fd${i}` })) } : {}),
    ...(extras.forms ? { forms: extras.forms } : {}),
  };
}

/** Assigns the same container and context to a list of texts. */
export function inContainer(c: string, texts: string[], ctx: BlockContext = {}, h?: string): BlockSpec[] {
  return texts.map((t) => ({ t, c, ctx, ...(h ? { h } : {}) }));
}
