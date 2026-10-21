// Bundles the detection core (ESM) and the DOM extractor (IIFE, injectable). M3 adds the popup.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/core/index.ts'],
  outfile: 'dist/core.mjs',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  sourcemap: true,
  legalComments: 'none',
  logLevel: 'info',
});

await build({
  entryPoints: ['src/extract/index.ts'],
  outfile: 'dist/extractor.js',
  bundle: true,
  format: 'iife',
  globalName: 'VeiltraceExtractor',
  platform: 'browser',
  target: 'es2022',
  legalComments: 'none',
  logLevel: 'info',
});
