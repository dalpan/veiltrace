// Public API of the VEILTRACE detection core.
export { analyze } from './analyze.js';
export { ENGINE_VERSION, WINDOW_BLOCKS } from './constants.js';
export { scanStatus } from './coverage.js';
export type { ScanGap, ScanStatus } from './coverage.js';
export { RULES } from './correlate.js';
export { LEXICON, SIGNALS } from './lexicon/index.js';
export { normalize, toOriginalRange } from './normalize.js';
export type * from './types.js';
