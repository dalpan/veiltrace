// Web chat clients (D-088): a conversation that holds incoming messages is one user-content container, so consecutive
// messages correlate. The markup imitates common chat-client patterns (message-in/out classes, a per-message
// data-pre-plain-text attribute) on a fictional app; it is not a copy of any real client.
import type { Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyzeCredentials, analyzePayments } from '../../src/core/index.js';
import { extract, html, launch, openOffline } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

const msg = (dir: 'in' | 'out', who: string, text: string) =>
  `<div role="row"><div class="focusable-list-item message-${dir}"><div class="copyable-text" data-pre-plain-text="[10.02, 22/10/2026] ${who}: "><span dir="ltr">${text}</span></div></div></div>`;
const CHAT = html(`<div id="app"><div id="side"><div>Keluarga</div><div>CS Toko</div></div><div id="main" role="application"><header>CS Toko SportMurah</header>
  <div role="grid" aria-label="Daftar pesan">
  ${msg('out', 'Saya', 'kak pesanan saya kok dibatalin ya')}
  ${msg('in', 'CS Toko', 'iya kak sistem lagi error, dananya mau sy refund manual')}
  ${msg('in', 'CS Toko', 'nanti ada kode masuk ke hp kakak, tolong kirim ke sini ya kodenya biar refund nya diproses')}
  </div></div></div>`);

describe('web chat extraction', () => {
  it('the conversation is one user-content container (the header is not); the OTP request is flagged in user content', async () => {
    const { page, context } = await openOffline(browser, { 'https://web.obrolanku.test/': CHAT });
    const { snapshot } = await extract(page);
    const container = (t: string) => snapshot.blocks.find((b) => b.text.includes(t))?.containerId;
    expect(container('nanti ada kode masuk')).toMatch(/^ugc:/);
    expect(container('dananya mau sy refund')).toBe(container('nanti ada kode masuk'));
    expect(container('CS Toko SportMurah')).not.toMatch(/^ugc:/);
    const r = analyzeCredentials(snapshot);
    expect(r.verdict).toBe('manipulative_instruction');
    expect(r.findings[0]!.trustContext).toContain('user-content');
    await context.close();
  });

  it('a prize "admin" announcing a prize and then asking for a fee in separate messages → payment manipulative (PR1)', async () => {
    const page = html(`<div role="grid">${msg('in', 'Admin', 'selamat kak, saldo hadiah 2jt udah siap dicairin ya')}${msg('out', 'Saya', 'caranya gimana min')}
      ${msg('in', 'Admin', 'tf dlu biaya admin 50rb ke rek admin, abis itu langsung cair')}</div>`);
    const { page: p, context } = await openOffline(browser, { 'https://web.obrolanku.test/2': page });
    const r = analyzePayments((await extract(p)).snapshot);
    expect(r.verdict).toBe('manipulative_instruction');
    expect(r.findings[0]!.ruleId).toBe('PR1');
    expect(r.findings[0]!.trustContext).toContain('user-content');
    await context.close();
  });

  it('an ordinary list on a normal page (no chat markers) is not user content', async () => {
    const { page, context } = await openOffline(browser, { 'https://shop.test/': html('<ul role="list"><li>Gratis ongkir</li><li>Bayar di tempat</li></ul>') });
    const { snapshot } = await extract(page);
    expect(snapshot.blocks.every((b) => !b.containerId.startsWith('ugc:'))).toBe(true);
    await context.close();
  });
});
