// M5.1: structural form-field extraction (privacy) and the EXPERIMENTAL credential detector on the cred-dev corpus.
import type { Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyzeCredentials } from '../../src/core/index.js';
import { loadCredDev, runCredScenario, SENTINEL } from '../../src/eval/cred.js';
import { extract, html, launch, openOffline } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

const PAGE = html(`
  <div role="dialog" id="dlg"><h2>Sign in</h2><p>Your account will be suspended today.</p>
    <form id="f1" action="https://collector.example.invalid/x" method="post">
      <label for="u">Email</label><input id="u" type="email" value="prefilled@example.invalid">
      <label for="p">Password</label><input id="p" type="password" value="DEFAULT-SECRET-123">
      <input id="o" autocomplete="one-time-code" placeholder="Code from SMS">
      <input id="n" inputmode="numeric" maxlength="6" aria-label="Six digits">
      <label for="pin">PIN</label><input id="pin" name="pin" type="password">
      <textarea id="s" name="mnemonic" aria-label="Recovery phrase"></textarea>
      <input type="hidden" name="csrf" value="HIDDEN-TOKEN-456">
      <input type="checkbox" id="remember"><button type="submit">Go</button>
    </form></div>
  <form id="f2" action="/login"><label for="q">Search</label><input id="q" type="search"></form>
  <form id="f3" action="javascript:void(0)"><input id="z" type="password" aria-label="Pass"></form>`);

describe('structural form fields (extractor 0.2.0-m5 and later)', () => {
  it('records kind, hints and page-authored labels, never values; hidden inputs and controls are skipped', async () => {
    const { page, context } = await openOffline(browser, { 'https://fields.test/': PAGE });
    await page.fill('#p', `typed-${SENTINEL}`);
    await page.fill('#o', SENTINEL);
    await page.fill('#s', SENTINEL);
    const { snapshot } = await extract(page);
    const json = JSON.stringify(snapshot);
    for (const secret of [SENTINEL, 'DEFAULT-SECRET-123', 'HIDDEN-TOKEN-456', 'prefilled@example.invalid']) expect(json).not.toContain(secret);
    expect(snapshot.formFields!.map((f) => [f.kind, f.label, f.hints[0] ?? ''])).toEqual([
      ['email', 'Email', 'type=email'],
      ['password', 'Password', 'type=password'],
      ['otp', 'Code from SMS', 'autocomplete=one-time-code'],
      ['otp', 'Six digits', 'inputmode=numeric'],
      ['pin', 'PIN', 'name/label: PIN'],
      ['secret-phrase', 'Recovery phrase', 'name/label: recovery phrase'],
      ['text', 'Search', ''],
      ['password', 'Pass', 'type=password'],
    ]);
    expect(snapshot.forms!.map((f) => [f.id, f.destination, f.method])).toEqual([['form0', 'other-origin', 'post'], ['form1', 'same-origin', 'get'], ['form2', 'javascript', 'get']]);
    expect(snapshot.forms![0]!.ancestorContainerIds![0]).toMatch(/^dialog:/);
    expect(json).not.toContain('collector.example.invalid');
    await context.close();
  });

  it('fields do not change the blocks the ClickFix engine reads', async () => {
    const { page, context } = await openOffline(browser, { 'https://fields.test/': PAGE });
    const before = (await extract(page)).snapshot.blocks;
    await page.fill('#p', SENTINEL);
    expect((await extract(page)).snapshot.blocks).toEqual(before);
    await context.close();
  });

  it('the overlay form above (threat + recovery-phrase field) is manipulative (CR2); the destination is reported, not scored', async () => {
    const { page, context } = await openOffline(browser, { 'https://fields.test/': PAGE });
    const r = analyzeCredentials((await extract(page)).snapshot);
    expect(r.findings[0]).toMatchObject({ ruleId: 'CR2', classification: 'manipulative_instruction', formDestination: 'other-origin' });
    await context.close();
  });
});

describe('targeted privacy and correlation regressions (M5.1 finalization)', () => {
  it('a field id, name or autocomplete value carrying a secret never reaches the snapshot or the result', async () => {
    const page = html(`<form action="/x"><label for="pw-${SENTINEL}">Password</label>
      <input id="pw-${SENTINEL}" name="pass_${SENTINEL}" type="password" autocomplete="current-password ${SENTINEL}" value="${SENTINEL}-default">
      <input name="otp_${SENTINEL}" autocomplete="one-time-code" aria-label="Code"></form>`);
    const { page: p, context } = await openOffline(browser, { 'https://ids.test/': page });
    await p.fill('[type=password]', SENTINEL);
    const { snapshot } = await extract(p);
    const r = analyzeCredentials(snapshot);
    expect(JSON.stringify(snapshot)).not.toContain(SENTINEL);
    expect(JSON.stringify(r)).not.toContain(SENTINEL);
    expect(snapshot.formFields!.map((f) => [f.kind, f.hints])).toEqual([['password', ['type=password']], ['otp', ['autocomplete=one-time-code']]]);
    expect(snapshot.formFields!.every((f) => /input:nth-of-type\(\d+\)$/.test(f.locator ?? ''))).toBe(true);
    await context.close();
  });

  it('an attacker-controlled label is page text: bounded to 160 characters and kept as plain text', async () => {
    const label = `<img src=x onerror=alert(1)> Enter your PIN ${'x'.repeat(400)}`;
    const page = html(`<label for="f">${label.replace(/</g, '&lt;')}</label><input id="f" name="pin" type="password">`);
    const { page: p, context } = await openOffline(browser, { 'https://label.test/': page });
    const { snapshot } = await extract(p);
    const f = snapshot.formFields![0]!;
    expect(f.label.length).toBeLessThanOrEqual(160);
    expect(f.label.startsWith('<img src=x onerror=alert(1)> Enter your PIN')).toBe(true);
    await context.close();
  });

  it('nested containers: a form inside a section inside a dialog shares the dialog scope; a form in a comment does not inherit the article', async () => {
    const page = html(`<div role="dialog"><p>Your account will be locked today.</p><section><form><label for="p">Password</label><input id="p" type="password"></form></section></div>
      <article><p>Your account will be suspended unless you act.</p><div class="comment"><form><label for="q">Password</label><input id="q" type="password"></form></div></article>`);
    const { page: p, context } = await openOffline(browser, { 'https://nested.test/': page });
    const { snapshot } = await extract(p);
    expect(snapshot.forms!.map((f) => f.ancestorContainerIds!.map((a) => a.slice(0, a.indexOf(':') + 1) || a))).toEqual([['section:', 'dialog:', 'body'], ['ugc:']]);
    const r = analyzeCredentials(snapshot);
    expect(r.findings.map((x) => `${x.ruleId}:${x.classification}`)).toEqual(['CR4:suspicious_correlation', 'CR5:observed_instruction']);
    await context.close();
  });
});

describe('cred-dev corpus through the real extractor (invariants, not metrics)', () => {
  for (const sc of loadCredDev()) {
    it(`${sc.label.id}: no typed value leaks, no network, true positives localized`, async () => {
      const run = await runCredScenario(browser, sc);
      expect(run.sentinelLeaked).toBe(false);
      expect(run.requestsDuringScan).toBe(0);
      if (run.localized !== null) expect(run.localized).toBe(true);
    });
  }
});
