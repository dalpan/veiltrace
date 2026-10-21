import { build } from 'esbuild';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

describe('core purity lint rule (IMPLEMENTATION_PLAN.md M1 AC2)', () => {
  const eslint = new ESLint();
  const lint = async (code: string, filePath: string) => (await eslint.lintText(code, { filePath }))[0]!.messages;

  it('rejects browser, network, timer and nondeterministic APIs inside src/core', async () => {
    const violations = [
      'export const a = window.location.href;',
      'export const b = document.title;',
      'export const c = chrome.runtime.id;',
      "export const d = fetch('https://example.invalid');",
      'export const e = setTimeout(() => 0, 1);',
      'export const f = Date.now();',
      'export const g = Math.random();',
      'export const h = new Date();',
      'export const i = globalThis.navigator;',
    ];
    for (const code of violations) {
      const messages = await lint(code, 'src/core/__probe.ts');
      expect(messages.length, code).toBeGreaterThan(0);
      expect(messages.map((m) => m.ruleId), code).toEqual(
        expect.arrayContaining([expect.stringMatching(/no-restricted-(globals|properties|syntax)/)]),
      );
    }
  });

  it('allows pure code inside src/core', async () => {
    expect(await lint('export const x = [1, 2].map((n) => n * 2);', 'src/core/__probe.ts')).toEqual([]);
  });
});

describe('core bundle (IMPLEMENTATION_PLAN.md M1 AC9)', () => {
  it('builds with esbuild and contains no network or dynamic-code APIs', async () => {
    const out = await build({
      entryPoints: ['src/core/index.ts'],
      bundle: true,
      format: 'esm',
      platform: 'neutral',
      target: 'es2022',
      write: false,
      minify: false,
    });
    const code = out.outputFiles[0]!.text;
    expect(code.length).toBeGreaterThan(1000);
    for (const forbidden of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource', 'importScripts', 'eval(', 'new Function', 'chrome.', 'browser.']) {
      expect(code.includes(forbidden), forbidden).toBe(false);
    }
  });
});

describe('extractor read-only lint rule and bundle (M2)', () => {
  const eslint = new ESLint();
  const lint = async (code: string) => (await eslint.lintText(code, { filePath: 'src/extract/__probe.ts' }))[0]!.messages;

  it('rejects DOM mutation, page interaction, network and dynamic code inside src/extract', async () => {
    for (const code of [
      'export function f(el: Element) { el.setAttribute("a", "b"); }',
      'export function f(el: Element) { el.innerHTML = ""; }',
      'export function f(el: HTMLElement) { el.click(); }',
      'export function f(el: Element) { el.remove(); }',
      'export function f(d: Document) { d.body.appendChild(d.createElement("p")); }',
      'export function f(el: HTMLInputElement) { el.value = "x"; }',
      'export function f(el: Element) { el.dispatchEvent(new Event("x")); }',
      "export const g = () => fetch('https://example.invalid');",
      "export const h = () => eval('1');",
    ]) {
      const messages = await lint(code);
      expect(messages.some((m) => m.ruleId === 'no-restricted-syntax' || m.ruleId === 'no-restricted-globals'), code).toBe(true);
    }
  });

  it('builds an IIFE without network or dynamic-code APIs', async () => {
    const out = await build({ entryPoints: ['src/extract/index.ts'], bundle: true, format: 'iife', globalName: 'VeiltraceExtractor', platform: 'browser', write: false });
    const code = out.outputFiles[0]!.text;
    for (const forbidden of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource', 'eval(', 'new Function', 'chrome.', 'innerHTML =', '.click()']) {
      expect(code.includes(forbidden), forbidden).toBe(false);
    }
  });
});
