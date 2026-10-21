// Entry point bundled as an IIFE (dist/extractor.js, global `VeiltraceExtractor`).
export { EXTRACTOR_VERSION, extractSnapshot, resolveLocator } from './extract.js';
export type { BudgetHit, ExtractOptions, ExtractResult, ExtractStats } from './extract.js';
export { watchForChanges } from './watch.js';
export type { ChangeReason, WatchOptions } from './watch.js';
