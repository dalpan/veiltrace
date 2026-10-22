// Optional on-device AI second opinion (D-093) in the real extension popup (TEST build). Playwright's Chromium has no built-in
// model, so one context checks the "unsupported" state and another stands in a fake LanguageModel to check the flow: payload
// preview first, masked text, fixed-label rendering, an unchanged VeilTrace result and no network.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { html, launchExtension, scanUrl, type Loaded } from './helpers.js';

let plain: Loaded;
let fake: Loaded;
const ANSWER = { assessment: 'manipulative', tactics: ['impersonation', 'too-good-to-be-true'], lines: [2], confidence: 'medium' };

beforeAll(async () => {
  [plain, fake] = await Promise.all([launchExtension('test', 'en-US'), launchExtension('test', 'en-US')]);
  await fake.context.addInitScript((answer: string) => {
    if (!location.protocol.startsWith('chrome-extension')) return;
    const w = window as unknown as Record<string, unknown>;
    w.__aiCalls = [];
    w.LanguageModel = {
      availability: async () => 'available',
      create: async (options: unknown) => ({
        prompt: async (input: string, opts: unknown) => { (w.__aiCalls as unknown[]).push({ options, input, opts }); return answer; },
        destroy: () => undefined,
      }),
    };
  }, JSON.stringify(ANSWER));
});
afterAll(async () => { await Promise.all([plain.context.close(), fake.context.close()]); });

const PAGE = html('<h1>PLN - 81 anniversary Hadiah</h1><p>Selamat! Anda berkesempatan mendapatkan Rp 1.500.000.</p><p>Hubungi admin di 0812 0000 4444.</p>');

describe('AI second opinion panel', () => {
  it('is offered after a scan and says when no built-in model is available', async () => {
    plain.pages.set('https://ai-plain.test/', PAGE);
    const { popup } = await scanUrl(plain, 'https://ai-plain.test/');
    expect(await popup.isVisible('#ai')).toBe(true);
    // Playwright's Chromium exposes the API without a model ("unavailable"); browsers without the API say "unsupported".
    expect(await popup.textContent('#ai-intro')).toMatch(/Not available in this browser|not available on this device/);
    expect(await popup.isVisible('#ai-prepare')).toBe(false);
  });

  it('shows the masked text first, runs only on the second click, and renders fixed labels beside an unchanged result', async () => {
    fake.pages.set('https://ai-fake.test/', PAGE);
    const { popup } = await scanUrl(fake, 'https://ai-fake.test/');
    const verdictBefore = await popup.getAttribute('.threat-summary', 'data-verdict');
    await popup.click('#ai-prepare');
    await popup.waitForSelector('#ai-preview:not([hidden])');
    const lines = await popup.$$eval('#ai-lines li', (els) => els.map((e) => e.textContent));
    expect(lines).toContain('Hubungi admin di [NUMBER].');
    expect(lines.join(' ')).not.toContain('0812');
    expect(await popup.evaluate(() => ((window as unknown as { __aiCalls: unknown[] }).__aiCalls).length)).toBe(0);
    await popup.click('#ai-run');
    await popup.waitForSelector('.ai-opinion');
    const call = await popup.evaluate(() => ((window as unknown as { __aiCalls: Array<{ input: string; opts: { responseConstraint?: unknown } }> }).__aiCalls)[0]);
    expect(call?.input).toContain('<page>');
    expect(call?.input).not.toContain('0812');
    expect(call?.opts.responseConstraint).toBeTruthy();
    expect(await popup.getAttribute('.ai-opinion', 'data-assessment')).toBe('manipulative');
    expect(await popup.textContent('.ai-assessment')).toBe('The AI sees signs of manipulation.');
    expect(await popup.$$eval('.ai-tactics li', (els) => els.map((e) => e.textContent))).toEqual(['claims to be a bank, company, support or official', 'prize, refund or job that is too good to be true']);
    expect(await popup.$$eval('.ai-lines li', (els) => els.map((e) => e.textContent))).toEqual([lines[1]]);
    expect(await popup.getAttribute('.threat-summary', 'data-verdict')).toBe(verdictBefore);
    // The page has no documented pattern, so the panel says plainly that the AI and VeilTrace disagree.
    expect(verdictBefore).not.toMatch(/suspicious|manipulative/);
    expect(await popup.getAttribute('.ai-disagree', 'data-disagree')).toBe('ai-alerts');
    expect(fake.blocked).toEqual([]);
  });
});
