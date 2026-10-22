// Bundles the held-out v3 harness (src/eval/v3.ts) with esbuild and runs it (D-096).
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const outfile = 'dist/eval-v3-cli.mjs';
await build({ entryPoints: ['src/eval/v3.ts'], outfile, bundle: true, format: 'esm', platform: 'node', target: 'node20', packages: 'external', logLevel: 'warning' });
process.argv[1] = outfile;
await import(pathToFileURL(outfile).href);
