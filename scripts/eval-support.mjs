// Bundles the support development evaluation (src/eval/support.ts) with esbuild and runs it (M5.3).
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const outfile = 'dist/eval-support-cli.mjs';
await build({ entryPoints: ['src/eval/support.ts'], outfile, bundle: true, format: 'esm', platform: 'node', target: 'node20', packages: 'external', logLevel: 'warning' });
process.argv[1] = outfile;
await import(pathToFileURL(outfile).href);
