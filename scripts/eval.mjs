// Bundles the Node-only evaluation CLI (src/eval) with esbuild and runs it with the given arguments.
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const outfile = 'dist/eval-cli.mjs';
await build({
  entryPoints: ['src/eval/cli.ts'],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  packages: 'external',
  logLevel: 'warning',
});
await import(pathToFileURL(outfile).href);
