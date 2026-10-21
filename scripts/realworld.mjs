// Bundles the real-world field sample tool (src/eval/realworld.ts) with esbuild and runs it (D-082).
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const outfile = 'dist/realworld-cli.mjs';
await build({ entryPoints: ['src/eval/realworld.ts'], outfile, bundle: true, format: 'esm', platform: 'node', target: 'node20', packages: 'external', logLevel: 'warning' });
process.argv[1] = outfile;
await import(pathToFileURL(outfile).href);
