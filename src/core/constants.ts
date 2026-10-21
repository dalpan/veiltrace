// Tunable parameters. Change them only with evidence from the dev split (never the test split).

/** Production engine (D-055): ruleset 'm4.1' = M1 decision model + P1b + P2-A + R4-beta, as approved at M4.1. */
export const ENGINE_VERSION = '0.2.0';
/** Engine version reported when analyze() runs with the M1 baseline ruleset ({ ruleset: 'm1' }). */
export const ENGINE_VERSION_M1 = '0.1.0-m1';

/** Correlation window: observations correlate only within this many consecutive blocks of one region (D-019). */
export const WINDOW_BLOCKS = 8;
/** Max characters between a negation cue and the action it negates. */
export const NEGATION_MAX_GAP = 40;
/** Minimum non-code prose (words) in a region for C.CODE_EXAMPLE to apply. */
export const CODE_EXAMPLE_MIN_PROSE_WORDS = 15;

// Input bounds enforced by the core (in addition to extractor budgets).
export const MAX_BLOCKS = 5000;
export const MAX_BLOCK_CHARS = 2000;
export const MAX_AUX_SOURCES = 200;
export const MAX_AUX_CHARS = 4000;
