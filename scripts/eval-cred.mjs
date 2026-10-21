// Bundles the credential development evaluation (src/eval/cred.ts) with esbuild and runs it (M5.1).
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const outfile = 'dist/eval-cred-cli.mjs';
await build({ entryPoints: ['src/eval/cred.ts'], outfile, bundle: true, format: 'esm', platform: 'node', target: 'node20', packages: 'external', logLevel: 'warning' });
process.argv[1] = outfile;
await import(pathToFileURL(outfile).href);
