// Writes offline pages for the manual production checklist (docs/DEMO.md) to dist/manual/.
// Serve with: python3 -m http.server 8080 -d dist/manual   (and a second origin on port 8081 for the iframe page)
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = 'dist/manual';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const id of ['D01-en-blog-security-check-overlay', 'D06-id-recipe-comment-lure', 'D16-en-vendor-install-script', 'D17-en-vendor-troubleshooting-fix',
  'D27-id-troubleshooting-fix', 'D45-en-concealed-payload-edu-cue']) {
  cpSync(join('corpus/dev', id), join(out, id), { recursive: true });
}

// Fictional demo site (docs/PRESENTER_GUIDE.md): http://localhost:8080/demo/ (also via 127.0.0.1 for the domain-invariance check).
cpSync('demo/nusaverta', join(out, 'demo'), { recursive: true });
// Realistic demo gallery (demo/scenes): http://localhost:8080/demo/scenes/
cpSync('demo/scenes', join(out, 'demo', 'scenes'), { recursive: true });

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>\n`;

// > 5,000 text blocks → "Partial scan" (block budget).
writeFileSync(join(out, 'large.html'), page('Large catalogue',
  `<main>${Array.from({ length: 6000 }, (_, i) => `<p>Catalogue entry ${i}: standard item, in stock.</p>`).join('')}</main>`));

// Lure in an iframe from another origin (port 8081) → "frames from other sites could not be examined".
writeFileSync(join(out, 'cross-origin.html'), page('Portal',
  '<p>Portal news.</p><iframe src="http://127.0.0.1:8081/frame-lure.html" width="500" height="200" title="embedded"></iframe>'));
writeFileSync(join(out, 'frame-lure.html'), page('Embedded',
  '<h3>Verify you are human</h3><p>Press Win + R, then Ctrl + V and press Enter.</p>'));

console.log(`manual fixtures written to ${out}`);
