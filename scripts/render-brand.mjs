// Renders brand assets from assets/brand/logo.svg and the demo screenshots in docs/images (dev tooling, Playwright Chromium,
// offline). Writes assets/brand/logo-512.png, logo-wordmark.png and social-card.jpg (1200×630, under 500 KB). With
// `--screens <dir>` it also writes five 1600×900 annotated screenshots of the fictional demo scenes into <dir>.
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { iconPng } from './icons.mjs';

const OUT = 'assets/brand';
const img = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
const svg = (f) => `data:image/svg+xml;base64,${readFileSync(f).toString('base64')}`;
const FONT = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'JetBrains Mono', Menlo, monospace";
const PAGE = (w, h, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}body{width:${w}px;height:${h}px;overflow:hidden;font-family:${FONT};background:#121510;color:#EEF0E6;
background-image:linear-gradient(rgba(150,168,112,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(150,168,112,.05) 1px,transparent 1px);background-size:32px 32px}
.shot{border:1px solid #3D4739;border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.45)}</style></head><body>${body}</body></html>`;

function socialCard() {
  return PAGE(1200, 630, `
<div style="position:absolute;inset:0;background:radial-gradient(circle at 80% 35%,#2A3320 0%,transparent 55%)"></div>
<div style="position:absolute;left:64px;top:64px;width:600px">
  <img src="${svg('assets/brand/logo.svg')}" style="width:104px;height:104px">
  <div style="font-size:86px;font-weight:700;letter-spacing:-1px;margin-top:24px">Veil<span style="color:#B9C98A">Trace</span></div>
  <div style="font-size:31px;line-height:1.3;color:#C9CFBF;margin-top:10px">Uncover the manipulation behind the page.</div>
  <div style="font-size:24px;line-height:1.4;color:#B9C98A;margin-top:22px">Deteksi indikasi penipuan, social engineering, dan manipulasi di halaman web, pesan, dan gambar, langsung di perangkat.</div>
  <div style="font-family:${MONO};font-size:17px;letter-spacing:1px;color:#9AA38E;margin-top:30px">CLICKFIX · OTP · PAYMENT · FAKE SUPPORT · OCR</div>
</div>
<img class="shot" src="${img('docs/images/cmd-lure-popup-top.png')}" style="position:absolute;left:700px;top:70px;width:410px">
<img class="shot" src="${img('docs/images/pwa-result-crop.png')}" style="position:absolute;left:950px;top:250px;width:210px">`);
}

const SCENES = [
  ['cmd-lure', 'CAPTCHA palsu (ClickFix) di blog resep', 'Kategori Command Execution: CAPTCHA asli tidak pernah menyuruh menekan Win+R dan menempel command.'],
  ['cred-lure', 'Penjual di marketplace meminta kode OTP', 'Kategori Credential Disclosure: permintaan kode yang masuk ke HP ditandai, lengkap dengan bukti.'],
  ['pay-lure', '"Admin undian" meminta biaya pencairan', 'Kategori Payment Manipulation: pola bayar dulu agar hadiah cair, dalam bahasa gaul.'],
  ['sup-lure', 'Alarm keamanan palsu dengan nomor telepon', 'Kategori Support & Authority Impersonation: browser asli tidak menampilkan alert seperti ini di halaman web.'],
];

function sceneShot([name, title, caption]) {
  return PAGE(1600, 900, `
<div style="position:absolute;left:56px;top:44px;display:flex;align-items:center;gap:16px">
  <img src="${svg('assets/brand/logo.svg')}" style="width:52px;height:52px">
  <div><div style="font-size:34px;font-weight:700">${title}</div><div style="font-size:21px;color:#B9C98A;margin-top:4px">${caption}</div></div>
</div>
<img class="shot" src="${img(`docs/images/${name}-page.png`)}" style="position:absolute;left:56px;top:170px;width:960px">
<img class="shot" src="${img(`docs/images/${name}-popup-top.png`)}" style="position:absolute;left:1060px;top:170px;width:484px">
<div style="position:absolute;left:56px;bottom:34px;font-family:${MONO};font-size:16px;color:#9AA38E">Halaman demo fiktif · VeilTrace berjalan on-device, tanpa server</div>`);
}

function pwaShot() {
  return PAGE(1600, 900, `
<div style="position:absolute;left:80px;top:150px;width:760px">
  <img src="${svg('assets/brand/logo.svg')}" style="width:80px;height:80px">
  <div style="font-size:52px;font-weight:700;line-height:1.15;margin-top:28px">Cek Pesan: pesan dan screenshot diperiksa langsung di HP</div>
  <div style="font-size:26px;line-height:1.45;color:#C9CFBF;margin-top:24px">Tempel pesan, pilih screenshot, atau di Android cukup <b>Share</b> dari aplikasi chat. Tidak ada yang dikirim ke mana pun dan tidak muncul di URL.</div>
  <div style="font-size:24px;color:#B9C98A;margin-top:28px">veiltrace.click/app</div>
</div>
<img class="shot" src="${img('docs/images/pwa-result-crop.png')}" style="position:absolute;left:980px;top:60px;width:460px">`);
}

async function shoot(browser, html, w, h, path, type = 'png') {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.route('**/*', (r) => (r.request().url().startsWith('data:') ? r.continue() : r.abort()));
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path, type, ...(type === 'jpeg' ? { quality: 86 } : {}) });
  await page.close();
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'logo-512.png'), iconPng(512));
const browser = await chromium.launch();
try {
  await shoot(browser, `<!doctype html><body style="margin:0;background:transparent"><img src="${svg('assets/brand/logo-wordmark.svg')}" style="width:660px;height:144px;display:block">`, 660, 144, join(OUT, 'logo-wordmark.png'));
  await shoot(browser, socialCard(), 1200, 630, join(OUT, 'social-card.jpg'), 'jpeg');
  const i = process.argv.indexOf('--screens');
  if (i > 0) {
    const dir = process.argv[i + 1];
    mkdirSync(dir, { recursive: true });
    for (const [n, s] of SCENES.entries()) await shoot(browser, sceneShot(s), 1600, 900, join(dir, `${n + 1}-${s[0]}.jpg`), 'jpeg');
    await shoot(browser, pwaShot(), 1600, 900, join(dir, '5-cek-pesan.jpg'), 'jpeg');
  }
} finally {
  await browser.close();
}
console.log(`social card: ${Math.round(statSync(join(OUT, 'social-card.jpg')).size / 1024)} KB`);
