// Bundles the external-dataset harness (src/eval/external.ts) with esbuild and runs it (D-099).
// Download first: corpus/external/sms-id/dataset_sms_spam_v2.csv (see docs/EVALUATION_PLAN.md §9).
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const outfile = 'dist/external-cli.mjs';
await build({ entryPoints: ['src/eval/external.ts'], outfile, bundle: true, format: 'esm', platform: 'node', target: 'node20', packages: 'external', logLevel: 'warning' });
process.argv[1] = outfile;
await import(pathToFileURL(outfile).href);
