// Public API of the VEILTRACE detection core.
export { analyze } from './analyze.js';
export { ENGINE_VERSION, WINDOW_BLOCKS } from './constants.js';
export { RULES } from './correlate.js';
export { LEXICON, SIGNALS } from './lexicon/index.js';
export { normalize, toOriginalRange } from './normalize.js';
export type * from './types.js';
