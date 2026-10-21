// Assembles the automated demo video from the frames captured by tests/e2e/video.test.ts (VT_VIDEO_DIR).
// Each card is composed as an HTML page (page screenshot + popup screenshot + caption) and rendered with the Playwright
// Chromium used for tests; ffmpeg only encodes the sequence. Output: <dir>/veiltrace-demo.mp4 (git-ignored). Offline.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const dir = resolve(process.argv[2] ?? 'submission/dist/video');
const SECONDS = Number(process.env.VT_FRAME_SECONDS ?? 7);
if (!existsSync(join(dir, 'frames.json'))) throw new Error(`no frames.json in ${dir}; run the capture first (see tests/e2e/video.test.ts)`);
const frames = JSON.parse(readFileSync(join(dir, 'frames.json'), 'utf8'));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const img = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;
const BASE = `*{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;background:#12150f;color:#e6e9df;font-family:"Helvetica Neue",Arial,sans-serif;overflow:hidden}
.mono{font-family:Menlo,Consolas,monospace;letter-spacing:4px;color:#b9c98a;font-size:26px}`;

const cardHtml = (title, sub) => `<style>${BASE}</style><div style="padding:300px 140px">
<div class="mono">KARTIKA CYBER HACKATHON 2026 · DEMO PURWARUPA</div>
<h1 style="font-family:Menlo,Consolas,monospace;font-size:130px;letter-spacing:10px;margin:28px 0">${esc(title)}</h1>
<p style="font-size:44px;line-height:1.4;color:#c5ccbb;max-width:1500px;margin:0">${esc(sub)}</p></div>`;

const frameHtml = (n, f) => `<style>${BASE}</style>
<div style="position:absolute;left:40px;top:40px;width:1260px;height:788px;border:2px solid #3d4739;overflow:hidden"><img src="${img(join(dir, `${f.id}-page.png`))}" style="width:1260px"></div>
<div style="position:absolute;left:1340px;top:40px;width:540px;height:850px;border:2px solid #8f9f5e;overflow:hidden;background:#0d0f0d"><img src="${img(join(dir, `${f.id}-popup.png`))}" style="width:540px"></div>
<div class="mono" style="position:absolute;left:40px;top:846px">LANGKAH ${n} / ${frames.length}</div>
<div style="position:absolute;left:0;right:0;top:910px;bottom:0;background:#1a1e19;border-top:4px solid #8f9f5e;padding:30px 60px;font-size:38px;line-height:1.35">${esc(f.caption)}</div>`;

const browser = await chromium.launch();
const cards = [];
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.route('**/*', (r) => r.abort());
  const shoot = async (name, html) => {
    await page.setContent(`<!doctype html><html lang="id"><head><meta charset="utf-8"></head><body>${html}</body></html>`);
    const out = join(dir, `${name}.png`);
    await page.screenshot({ path: out });
    cards.push(out);
  };
  await shoot('00-title', cardHtml('VEILTRACE', 'Ungkap manipulasi di balik halaman. Ekstensi browser luring, Bahasa Indonesia & Inggris. Semua halaman dalam video ini fiktif.'));
  for (const [i, f] of frames.entries()) await shoot(`${f.id}-frame`, frameHtml(i + 1, f));
  await shoot('99-end', cardHtml('Lihat buktinya.', 'Luring · tanpa telemetri · izin minimal (activeTab + scripting) · Apache-2.0. Proyek independen, tidak berafiliasi dengan instansi mana pun.'));
} finally {
  await browser.close();
}

const list = cards.map((p) => `file '${p}'\nduration ${SECONDS}`).join('\n') + `\nfile '${cards[cards.length - 1]}'\n`;
writeFileSync(join(dir, 'concat.txt'), list);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'concat.txt'), '-vf', 'fps=30,format=yuv420p',
  '-c:v', 'libx264', '-crf', '20', '-movflags', '+faststart', join(dir, 'veiltrace-demo.mp4')]);
console.log(`wrote ${join(dir, 'veiltrace-demo.mp4')} (${cards.length} cards × ${SECONDS}s)`);
