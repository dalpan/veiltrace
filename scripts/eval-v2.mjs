// Bundles the held-out v2 harness (src/eval/v2.ts) with esbuild and runs it (D-085).
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const outfile = 'dist/eval-v2-cli.mjs';
await build({ entryPoints: ['src/eval/v2.ts'], outfile, bundle: true, format: 'esm', platform: 'node', target: 'node20', packages: 'external', logLevel: 'warning' });
process.argv[1] = outfile;
await import(pathToFileURL(outfile).href);
