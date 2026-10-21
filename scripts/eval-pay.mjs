// Bundles the payment development evaluation (src/eval/pay.ts) with esbuild and runs it (M5.2).
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const outfile = 'dist/eval-pay-cli.mjs';
await build({ entryPoints: ['src/eval/pay.ts'], outfile, bundle: true, format: 'esm', platform: 'node', target: 'node20', packages: 'external', logLevel: 'warning' });
process.argv[1] = outfile;
await import(pathToFileURL(outfile).href);
