// Public API of the VEILTRACE detection core.
export { analyze } from './analyze.js';
export { M41_RULESET, M5_RULESET } from './analyze.js';
export { ENGINE_VERSION, ENGINE_VERSION_M1, ENGINE_VERSION_M41, WINDOW_BLOCKS } from './constants.js';
export { scanStatus } from './coverage.js';
export type { ScanGap, ScanStatus } from './coverage.js';
export { RULES } from './correlate.js';
export { LEXICON, SIGNALS } from './lexicon/index.js';
export { normalize, toOriginalRange } from './normalize.js';
export type * from './types.js';
// EXPERIMENTAL credential-disclosure detector (M5.1). Separate from analyze(); never changes ClickFix results.
export { analyzeCredentials, CRED_DETECTOR_VERSION, CRED_RULES } from './credential/analyze.js';
export { CRED_LEXICON } from './credential/lexicon.js';
export type * from './credential/types.js';
// EXPERIMENTAL payment-manipulation detector (M5.2). Separate from analyze() and analyzeCredentials(); changes neither.
export { analyzePayments, PAY_DETECTOR_VERSION, PAY_RULES } from './payment/analyze.js';
export { PAY_LEXICON } from './payment/lexicon.js';
export type * from './payment/types.js';
// EXPERIMENTAL fake-support and authority-impersonation detector (M5.3). Independent; changes no other detector's result.
export { analyzeSupport, SUPPORT_DETECTOR_VERSION, SUPPORT_RULES } from './support/analyze.js';
export { SUPPORT_LEXICON } from './support/lexicon.js';
export type * from './support/types.js';
