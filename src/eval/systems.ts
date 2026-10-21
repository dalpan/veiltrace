// Systems compared by the harness. All of them consume the *same* extracted PageSnapshot and the same
// lexicon/normalization; they differ only in correlation scope and context handling (EVALUATION_PLAN.md §5).
import { analyze } from '../core/analyze.js';
import type { AnalysisResult, AnalyzeOptions, PageSnapshot } from '../core/types.js';

export interface SystemDef {
  id: string;
  description: string;
  run: (s: PageSnapshot) => AnalysisResult;
}

/** Collapses every block and auxiliary source into one page-wide container. */
export function pageLevel(s: PageSnapshot): PageSnapshot {
  return {
    ...s,
    blocks: s.blocks.map((b) => ({ ...b, containerId: 'page' })),
    hiddenCopyCandidates: s.hiddenCopyCandidates.map((h) => ({ ...h, containerId: 'page' })),
    copyTriggers: s.copyTriggers.map((t) => ({ ...t, containerId: 'page' })),
  };
}

const PAGE_WIDE: AnalyzeOptions = { windowBlocks: Number.POSITIVE_INFINITY };

export const SYSTEMS: readonly SystemDef[] = [
  { id: 'veiltrace', description: 'M1 model: region-local windows (K=8) + negation + context modifiers', run: (s) => analyze(s) },
  {
    id: 'B0', description: 'Baseline: page-level co-occurrence, same signals and R1–R5 table, no negation, no context modifiers',
    run: (s) => analyze(pageLevel(s), { ...PAGE_WIDE, negation: false, contextModifiers: false }),
  },
  { id: 'A1-page+context', description: 'Ablation: page-level, with negation and context modifiers', run: (s) => analyze(pageLevel(s), PAGE_WIDE) },
  { id: 'A2-region-only', description: 'Ablation: region-local, no negation, no context modifiers', run: (s) => analyze(s, { negation: false, contextModifiers: false }) },
];

/** Dev-only research variants (IMPLEMENTATION_PLAN.md M2 R-1…R-3). Never evaluated on the test split. */
export function researchVariants(): SystemDef[] {
  const ks = [2, 4, 6, 8, 12, 16, Number.POSITIVE_INFINITY];
  return [
    ...ks.map((k) => ({ id: `K=${k === Number.POSITIVE_INFINITY ? '∞' : k}`, description: `window ${k} blocks`, run: (s: PageSnapshot) => analyze(s, { windowBlocks: k }) })),
    { id: 'R4:minFamilies=2', description: 'R4 needs ≥ 2 weak pretext families', run: (s) => analyze(s, { experimental: { r4MinWeakFamilies: 2 } }) },
    { id: 'R4:noAuthorityOnly', description: 'R4 ignores authority-only pretext', run: (s) => analyze(s, { experimental: { r4ExcludeAuthorityOnly: true } }) },
    { id: 'MOD:noDemotionInDialogs', description: 'No context demotion when all evidence is in dialogs/overlays', run: (s) => analyze(s, { experimental: { noDemotionInDialogs: true } }) },
    {
      id: 'COMBINED', description: 'R4:noAuthorityOnly + MOD:noDemotionInDialogs',
      run: (s) => analyze(s, { experimental: { r4ExcludeAuthorityOnly: true, noDemotionInDialogs: true } }),
    },
  ];
}
