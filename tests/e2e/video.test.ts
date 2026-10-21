// Captures the frames of the automated demo video (submission material, not a test of behavior). Runs only when
// VT_VIDEO_DIR is set: `VT_VIDEO_DIR=submission/dist/video npx vitest run tests/e2e/video.test.ts`, then
// `npm run submission:video`. Uses the TEST build with the Indonesian UI; every page is fictional and served offline.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MULTI_THREAT_BODY } from '../fixtures/dashboard-page.js';
import { addCorpusScenario, addDemoSite, html, launchExtension, openPopup, openTarget, scan, tabIdOf, type Loaded } from './helpers.js';

const DIR = process.env.VT_VIDEO_DIR;
const frames: Array<{ id: string; caption: string }> = [];
let id: Loaded;

async function frame(name: string, caption: string, target: Page, popup: Page): Promise<void> {
  const dir = DIR as string;
  await target.screenshot({ path: join(dir, `${name}-page.png`) });
  await popup.screenshot({ path: join(dir, `${name}-popup.png`) });
  frames.push({ id: name, caption });
}

async function open(url: string): Promise<{ target: Page; popup: Page }> {
  const target = await openTarget(id, url);
  const popup = await openPopup(id, await tabIdOf(id, target));
  await popup.setViewportSize({ width: 560, height: 980 });
  return { target, popup };
}

describe.skipIf(!DIR)('demo video frames', () => {
  beforeAll(async () => {
    mkdirSync(DIR as string, { recursive: true });
    id = await launchExtension('test', 'id');
  });
  afterAll(async () => {
    writeFileSync(join(DIR as string, 'frames.json'), JSON.stringify(frames, null, 2) + '\n');
    await id?.context.close();
  });

  it('captures the storyboard', async () => {
    const site = addDemoSite(id, 'https://help.nusaverta.test/');
    const lure = await open(site.lure);
    await frame('01', 'Halaman bantuan biasa. Di widget komunitas ada umpan ClickFix: "verifikasi Anda manusia" dengan Win+R, Ctrl+V, Enter.', lure.target, lure.popup);
    await scan(lure.popup);
    await frame('02', 'VeilTrace hanya berjalan saat diminta dan membaca halaman di perangkat. Hasil: Manipulatif, aturan R1, lengkap dengan bukti.', lure.target, lure.popup);
    await lure.popup.locator('article.finding button.show').nth(1).click();
    await lure.popup.waitForSelector('.hl-status[data-result="highlighted"]');
    await frame('03', '"Tunjukkan di halaman" menandai elemen bukti, tepat di dalam widget komunitas, bukan di artikel milik situs.', lure.target, lure.popup);

    const benign = await open(site.benign);
    await scan(benign.popup);
    await frame('04', 'Halaman yang sama dengan jawaban biasa: tidak ada temuan. VeilTrace tidak pernah menyebut halaman "aman".', benign.target, benign.popup);

    const cred = await open(addCorpusScenario(id, 'cred-dev', 'CD06-id-komentar-admin-kirim-otp'));
    await scan(cred.popup);
    await frame('05', 'Kredensial: komentar yang mengaku admin meminta kode OTP dikirimkan. Klaim identitas tidak pernah dianggap terverifikasi.', cred.target, cred.popup);

    const slang = await open(addCorpusScenario(id, 'cred-dev', 'CA03-id-parafrase-informal'));
    await scan(slang.popup);
    await frame('06', 'Bahasa informal: "kasih liat dong angka yg barusan masuk ke hp lu" tetap dikenali sebagai permintaan OTP.', slang.target, slang.popup);

    const pay = await open(addCorpusScenario(id, 'pay-dev', 'PD02-id-undian-pajak-hadiah'));
    await scan(pay.popup);
    await frame('07', 'Pembayaran: "hadiah undian" yang meminta pajak hadiah ditransfer dulu ke rekening petugas. Nominal tidak pernah disalin ke laporan.', pay.target, pay.popup);

    const sup = await open(addCorpusScenario(id, 'sup-dev', 'SD01-en-fake-virus-overlay-call'));
    await scan(sup.popup);
    await frame('08', 'Peniruan dukungan: alarm virus palsu dengan nomor telepon. Browser asli tidak menampilkan alarm di dalam halaman web.', sup.target, sup.popup);

    id.pages.set('https://multi.test/', html(MULTI_THREAT_BODY));
    const multi = await open('https://multi.test/');
    await scan(multi.popup);
    await frame('09', 'Satu halaman, empat ancaman: ringkasan, status tiap kategori, saran, dan temuan terurut. Bukti tiap detektor tetap terpisah.', multi.target, multi.popup);
    await multi.popup.click('#lang-en');
    await frame('10', 'Bahasa antarmuka ID/EN berganti tanpa memindai ulang. Teks bukti tetap dalam bahasa aslinya.', multi.target, multi.popup);

    id.pages.set('https://ads.example/lure.html', html('<h3>Verify you are human</h3><p>Press Win + R, then Ctrl + V and press Enter.</p>'));
    id.pages.set('https://portal.test/', html('<h1>Portal berita</h1><p>Berita hari ini.</p><iframe src="https://ads.example/lure.html" width="480" height="220"></iframe>'));
    const partial = await open('https://portal.test/');
    await scan(partial.popup);
    await frame('11', 'Yang tidak bisa diperiksa dilaporkan apa adanya: frame dari situs lain membuat status PEMINDAIAN SEBAGIAN.', partial.target, partial.popup);

    expect(frames).toHaveLength(11);
    expect(id.blocked).toEqual([]);
  });
});
