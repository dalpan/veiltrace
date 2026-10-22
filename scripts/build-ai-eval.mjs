// Builds dist/extension-ai-eval: the production extension plus ai-eval.html, a page that runs Chrome's built-in model on the
// development scenarios' masked payloads and reports how its opinion compares with the labels and with VeilTrace (D-093).
// Never released: `npm run release` packages only dist/extension. Load it unpacked in Chrome (temporarily, instead of the
// normal build), open chrome-extension://<id>/ai-eval.html, press Run and save the JSON for docs/AI_EVAL.md.
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildExtension } from './build-extension.mjs';

const cli = 'dist/ai-data-cli.mjs';
await build({ entryPoints: ['src/eval/ai-data.ts'], outfile: cli, bundle: true, format: 'esm', platform: 'node', target: 'node20', packages: 'external', logLevel: 'warning' });
execFileSync(process.execPath, [cli], { stdio: 'inherit' });
const data = readFileSync('dist/ai-eval-data.json', 'utf8');

const outdir = 'dist/extension-ai-eval';
await buildExtension({ outdir, ai: true });
await build({
  entryPoints: ['src/extension/ai/eval-page.ts'], outfile: join(outdir, 'ai-eval.js'), bundle: true, format: 'iife', target: 'chrome120',
  define: { __AI_EVAL_DATA__: data.trim() }, logLevel: 'warning',
});
writeFileSync(join(outdir, 'ai-eval.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>VeilTrace · AI eval</title>
<style>body{font:14px system-ui,sans-serif;margin:20px;background:#0d0f0d;color:#e3e7dc}button,a{margin-right:8px}pre{white-space:pre-wrap;background:#141713;padding:10px}
table{border-collapse:collapse;font-size:12px}td,th{border:1px solid #2d342b;padding:3px 6px}tr[data-wrong="true"]{background:#2a1413}a{color:#b9c98a}</style></head>
<body><h1>VeilTrace · on-device AI evaluation (development data)</h1>
<p id="count"></p><p id="availability"></p>
<p><button id="run" type="button">Run</button><button id="stop" type="button">Stop</button><a id="save" download="ai-eval-results.json" hidden>Save results (JSON)</a></p>
<p id="progress"></p><pre id="summary"></pre>
<table><thead><tr><th>id</th><th>split</th><th>truth</th><th>VeilTrace</th><th>AI</th><th>tactics</th><th>confidence</th><th>time</th></tr></thead><tbody id="rows"></tbody></table>
<script src="ai-eval.js"></script></body></html>
`);
console.log(`built ${outdir} (open chrome-extension://<id>/ai-eval.html)`);
