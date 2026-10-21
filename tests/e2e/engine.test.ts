// Engine 0.2.0 output in the real extension popup (EN and ID): C.PROCEDURAL, overrides, version display.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCorpusScenario, launchExtension, rules, scanUrl, shot, verdict, type Loaded } from './helpers.js';

let en: Loaded;
let id: Loaded;
beforeAll(async () => { [en, id] = await Promise.all([launchExtension('test', 'en-US'), launchExtension('test', 'id')]); });
afterAll(async () => { await Promise.all([en.context.close(), id.context.close()]); });

describe('engine 0.2.0 in the popup', () => {
  it('troubleshooting docs: observed with an explained procedural-document demotion (was suspicious under M1)', async () => {
    const { popup } = await scanUrl(en, addCorpusScenario(en, 'dev', 'D17-en-vendor-troubleshooting-fix'));
    expect(await verdict(popup)).toBe('observed_instruction');
    expect(await rules(popup)).toEqual(['R4:observed_instruction']);
    await popup.click('details.observed summary');
    const card = popup.locator('article.finding').first();
    expect(await card.locator('.context').first().textContent()).toBe('Lowered from suspicious because of context: the instruction is a step in a procedural document.');
    expect(await card.locator('.risk').textContent()).toBe('Action risk: high. Following it would run code on your computer.');
    expect(await card.locator('.chip.severity').textContent()).toBe('Severity: informational');
    expect(await card.locator('.chip').nth(2).textContent()).toBe('Confidence: low');
    expect(await popup.textContent('#meta')).toContain('Engine 0.2.0');
    await shot(popup, '12-procedural-en');
  });

  it('override: a concealed clipboard payload keeps a lure manipulative despite a planted educational cue', async () => {
    const { popup } = await scanUrl(en, addCorpusScenario(en, 'dev', 'D45-en-concealed-payload-edu-cue'));
    expect(await verdict(popup)).toBe('manipulative_instruction');
    const o = popup.locator('.override[data-override="O.CONCEALED_PAYLOAD"]');
    expect(await o.count()).toBe(1);
    expect(await o.locator('.context').first().textContent()).toContain('Not lowered: this part of the page also places hidden text on your clipboard');
    expect(await o.locator('.context').nth(1).textContent()).toBe('Context set aside: the surrounding text is educational or awareness material.');
    expect(await o.locator('.snippet').first().textContent()).toContain('mshta');
    expect(await o.locator('.ev-label').first().textContent()).toContain('Hidden clipboard text');
    await shot(popup, '13-override-en');
  });

  it('the same metadata is fully translated in the Indonesian UI', async () => {
    const proc = await scanUrl(id, addCorpusScenario(id, 'dev', 'D27-id-troubleshooting-fix'));
    expect(await verdict(proc.popup)).toBe('observed_instruction');
    await proc.popup.click('details.observed summary');
    expect(await proc.popup.locator('article.finding .context').first().textContent()).toBe('Diturunkan dari mencurigakan karena konteks: instruksi adalah langkah dalam dokumen prosedural.');
    const ov = await scanUrl(id, addCorpusScenario(id, 'dev', 'D45-en-concealed-payload-edu-cue'));
    const o = ov.popup.locator('.override').first();
    expect(await o.locator('.context').first().textContent()).toContain('Tidak diturunkan:');
    expect(await o.locator('.context').nth(1).textContent()).toContain('Konteks yang dikesampingkan:');
    expect(await ov.popup.textContent('#meta')).toContain('Engine 0.2.0');
    await shot(ov.popup, '14-override-id');
  });
});
