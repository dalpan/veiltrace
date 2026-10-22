// Renders the hackathon submission documents (submission/*.md) to PDF with the Playwright Chromium already used for tests.
// Supports the Markdown subset those files use: headings, paragraphs, lists, tables, blockquotes, rules, bold, italics,
// inline code, bare links, and images on their own line (`![caption](path)`, embedded as data URIs; several images on one
// line are placed side by side). Output: submission/dist/*.pdf (git-ignored). Offline; no network access.
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1">$1</a>');

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };
const IMAGE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+=(\d+))?\)/g;
function figure(line, baseDir) {
  const imgs = [...line.matchAll(IMAGE)].map(([, alt, src, w]) => {
    const file = resolve(baseDir, src);
    const data = readFileSync(file).toString('base64');
    return `<figure${w ? ` style="width:${w}%"` : ''}><img src="data:${MIME[extname(file).toLowerCase()] ?? 'image/png'};base64,${data}" alt="${esc(alt)}"><figcaption>${inline(alt)}</figcaption></figure>`;
  });
  return `<div class="figs">${imgs.join('')}</div>`;
}

export function markdownToHtml(md, baseDir = '.') {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^---\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^\s*!\[/.test(line)) { out.push(figure(line, baseDir)); i++; continue; }
    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [head, , ...body] = rows;
      out.push(`<table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${
        body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    const list = /^(-|\d+\.)\s+/.exec(line);
    if (list) {
      const ordered = /\d/.test(list[1]);
      // Items, each with its own text and optional indented sub-items.
      const items = [];
      while (i < lines.length && (/^(-|\d+\.)\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        const cur = lines[i];
        if (/^(-|\d+\.)\s+/.test(cur)) items.push({ text: cur.replace(/^(-|\d+\.)\s+/, ''), sub: [] });
        else if (/^\s{2,}(-|\d+\.)\s+/.test(cur)) items[items.length - 1].sub.push(cur.trim().replace(/^(-|\d+\.)\s+/, ''));
        else {
          const last = items[items.length - 1];
          if (last.sub.length > 0) last.sub[last.sub.length - 1] += ' ' + cur.trim();
          else last.text += ' ' + cur.trim();
        }
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t.text)}${t.sub.length > 0 ? `<ul>${t.sub.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</${tag}>`);
      continue;
    }
    const buf = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#|>|\||-\s|\d+\.\s|---)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

const CSS = `@page { size: A4; margin: 18mm 16mm; }
body { font: 10.5pt/1.5 "Helvetica Neue", Arial, sans-serif; color: #1b1f1a; }
h1 { font-size: 20pt; margin: 0 0 4pt; color: #2f3a1f; } h2, h3 { break-after: avoid; } h2 { font-size: 13.5pt; margin: 16pt 0 6pt; color: #2f3a1f; border-bottom: 1px solid #c9d0bd; padding-bottom: 2pt; }
h3 { font-size: 11.5pt; margin: 12pt 0 4pt; } p { margin: 5pt 0; } ul, ol { margin: 4pt 0 4pt 16pt; padding: 0; } li { margin: 2pt 0; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 9.5pt; page-break-inside: avoid; } th, td { border: 1px solid #c9d0bd; padding: 4pt 6pt; vertical-align: top; text-align: left; }
th { background: #eef1e8; } code { font: 9pt Menlo, Consolas, monospace; background: #f1f3ee; padding: 0 2pt; }
blockquote { margin: 8pt 0; padding: 6pt 10pt; border-left: 3px solid #8f9f5e; background: #f6f8f2; } hr { border: 0; border-top: 1px solid #c9d0bd; margin: 10pt 0; }
a { color: #3d5a1f; word-break: break-all; }
.figs { display: flex; gap: 8pt; align-items: flex-start; justify-content: center; margin: 8pt 0; page-break-inside: avoid; }
figure { margin: 0; flex: 1; text-align: center; } figure img { max-width: 100%; max-height: 120mm; border: 1px solid #c9d0bd; }
figcaption { font-size: 8.5pt; color: #555; margin-top: 2pt; }`;

if (process.argv[1]?.endsWith('submission-pdf.mjs')) {
  const dir = 'submission';
  const outDir = join(dir, 'dist');
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const page = await browser.newPage();
      await page.route('**/*', (r) => r.abort());
      await page.setContent(`<!doctype html><html lang="id"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${markdownToHtml(readFileSync(join(dir, f), 'utf8'), dirname(join(dir, f)))}</body></html>`);
      const out = join(outDir, `${basename(f, '.md')}.pdf`);
      await page.pdf({ path: out, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
        footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666">VeilTrace · <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
        margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' } });
      console.log(`wrote ${out}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
