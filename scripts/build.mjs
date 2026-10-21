// Bundles the detection core. M3 adds the popup and extractor entry points here.
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
