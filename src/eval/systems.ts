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

const M1 = { ruleset: 'm1' } as const;

/**
 * 'veiltrace' is the production engine (0.3.0; 'veiltrace-0.2.0' is the held-out v1 engine). B0 and the ablations keep their M2 definitions on the M1
 * decision table (ruleset 'm1') so the baseline is unchanged by the M4.3A adoption (EVAL_PREREGISTRATION.md).
 */
export const SYSTEMS: readonly SystemDef[] = [
  { id: 'veiltrace', description: 'Production engine 0.3.0 (ruleset m5): m4.1 + own-voice verification gate + procedural dialogs (D-083)', run: (s) => analyze(s) },
  { id: 'veiltrace-0.2.0', description: 'Engine 0.2.0 (ruleset m4.1), the engine evaluated on held-out v1', run: (s) => analyze(s, { ruleset: 'm4.1' }) },
  { id: 'veiltrace-m1', description: 'M1 baseline engine 0.1.0-m1 (ruleset m1)', run: (s) => analyze(s, M1) },
  {
    id: 'B0', description: 'Baseline: page-level co-occurrence, same signals and M1 R1–R5 table, no negation, no context modifiers',
    run: (s) => analyze(pageLevel(s), { ...M1, ...PAGE_WIDE, negation: false, contextModifiers: false }),
  },
  { id: 'A1-page+context', description: 'Ablation (M1 table): page-level, with negation and context modifiers', run: (s) => analyze(pageLevel(s), { ...M1, ...PAGE_WIDE }) },
  { id: 'A2-region-only', description: 'Ablation (M1 table): region-local, no negation, no context modifiers', run: (s) => analyze(s, { ...M1, negation: false, contextModifiers: false }) },
];

/** Dev-only research variants (IMPLEMENTATION_PLAN.md M2 R-1…R-3). Never evaluated on the test split. */
export function researchVariants(): SystemDef[] {
  const ks = [2, 4, 6, 8, 12, 16, Number.POSITIVE_INFINITY];
  return [
    ...ks.map((k) => ({ id: `K=${k === Number.POSITIVE_INFINITY ? '∞' : k}`, description: `window ${k} blocks (M1 table)`, run: (s: PageSnapshot) => analyze(s, { ...M1, windowBlocks: k }) })),
    { id: 'R4:minFamilies=2', description: 'R4 needs ≥ 2 weak pretext families', run: (s) => analyze(s, { ...M1, experimental: { r4MinWeakFamilies: 2 } }) },
    { id: 'R4:noAuthorityOnly', description: 'R4 ignores authority-only pretext', run: (s) => analyze(s, { ...M1, experimental: { r4ExcludeAuthorityOnly: true } }) },
    { id: 'MOD:noDemotionInDialogs', description: 'No context demotion when all evidence is in dialogs/overlays', run: (s) => analyze(s, { ...M1, experimental: { noDemotionInDialogs: true } }) },
    {
      id: 'COMBINED', description: 'R4:noAuthorityOnly + MOD:noDemotionInDialogs',
      run: (s) => analyze(s, { ...M1, experimental: { r4ExcludeAuthorityOnly: true, noDemotionInDialogs: true } }),
    },
  ];
}

/** M4.1 candidates (dev only). Each variant changes exactly what its id says relative to the M3 baseline. */
export function m41Variants(): SystemDef[] {
  const v = (id: string, description: string, experimental: NonNullable<AnalyzeOptions['experimental']>): SystemDef =>
    ({ id, description, run: (s: PageSnapshot) => analyze(s, { ...M1, experimental }) });
  return [
    { id: 'M3-baseline', description: 'Accepted M1 model as shipped in M3', run: (s) => analyze(s, M1) },
    v('P1', 'R4 ignores authority-only pretext', { r4ExcludeAuthorityOnly: true }),
    v('P1b', 'P1, unless the region stages a concealed clipboard payload', { r4AuthorityOnlyUnlessConcealed: true }),
    v('P2-A', 'Concealed clipboard payload suppresses contextual demotion', { concealedPayloadOverride: true }),
    v('P2-B', 'Terse verification dialog suppresses contextual demotion', { verificationGateOverride: 'skip' }),
    v('P2-C', 'Terse verification dialog caps contextual demotion at 1 tier', { verificationGateOverride: 'cap1' }),
    v('P2-D', 'Reported list intros do not bind inside dialogs/overlays', { reportedListIntroOutsideDialogsOnly: true }),
    v('R4-beta', 'C.PROCEDURAL: single-family R4 in procedural documents is demoted 1 tier', { proceduralDocModifier: true }),
    v('P2-A+C', 'P2-A and P2-C', { concealedPayloadOverride: true, verificationGateOverride: 'cap1' }),
    v('P1b+P2-A+R4-beta', 'Conservative combination', { r4AuthorityOnlyUnlessConcealed: true, concealedPayloadOverride: true, proceduralDocModifier: true }),
    v('P1b+P2-A+P2-C+R4-beta', 'Conservative combination plus gate cap', {
      r4AuthorityOnlyUnlessConcealed: true, concealedPayloadOverride: true, verificationGateOverride: 'cap1', proceduralDocModifier: true,
    }),
    { id: 'm4.1-rc1', description: 'M4.1 rule set (now the production default, engine 0.2.0)', run: (s) => analyze(s, { ruleset: 'm4.1' }) },
  ];
}