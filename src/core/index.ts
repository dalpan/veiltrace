// Public API of the VEILTRACE detection core.
export { analyze } from './analyze.js';
export { M41_RULESET } from './analyze.js';
export { ENGINE_VERSION, ENGINE_VERSION_M1, WINDOW_BLOCKS } from './constants.js';
export { scanStatus } from './coverage.js';
export type { ScanGap, ScanStatus } from './coverage.js';
export { RULES } from './correlate.js';
export { LEXICON, SIGNALS } from './lexicon/index.js';
export { normalize, toOriginalRange } from './normalize.js';
export type * from './types.js';
