// On-page guard (D-108). Runs only with automatic scanning on (auto.js, the granted origins), in the tab's isolated world.
// It warns at the moment of action: when a scanned page is manipulative, when the page copies a command to the clipboard
// (the copy is replaced by a warning), before an Android app (.apk) is downloaded, and when a secret field is focused on a
// page with manipulation signs. It never reads what the user types, adds no messaging and makes no request. Its texts are
// the extension's own (textContent only); styles use CSSOM, which a page's style-src CSP does not block.
import type { ScanReport } from '../content/report.js';
import { aggregate } from '../popup/aggregate.js';
import { detectLang, MESSAGES, type Messages } from '../popup/i18n.js';
import { plainItems } from '../popup/plain.js';
import { guardPlan, isApkDownload, isSecretField, looksLikeCommand, type GuardPlan } from './signals.js';

declare const __VT_TEST__: boolean;

export const GUARD_ATTR = 'data-veiltrace-guard';
type Kind = 'page' | 'clipboard' | 'apk' | 'secret';

const css = (el: HTMLElement, props: Record<string, string>): void => {
  for (const [k, v] of Object.entries(props)) el.style.setProperty(k, v, 'important');
};

function node(tag: string, text: string, props: Record<string, string>): HTMLElement {
  const el = document.createElement(tag);
  el.textContent = text;
  css(el, props);
  return el;
}

export interface Guard {
  onReport(r: ScanReport): void;
}

export function createGuard(): Guard {
  const m: Messages = MESSAGES[detectLang(navigator.language)];
  let report: ScanReport | null = null;
  let plan: GuardPlan = { page: false, alerting: [] };
  const shown = new Set<Kind>();
  let host: HTMLElement | null = null;
  const allowedApk = new Set<string>();

  function close(): void {
    host?.remove();
    host = null;
  }

  function show(kind: Kind, title: string, lines: string[], buttons: Array<{ label: string; primary: boolean; act: () => void }>): void {
    close();
    host = document.createElement('div');
    host.setAttribute(GUARD_ATTR, kind);
    css(host, { position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', 'z-index': '2147483647', width: 'min(560px, calc(100vw - 32px))', margin: '0', padding: '0' });
    // Closed in released builds so the page cannot read or restyle the warning; open in the TEST build for the e2e tests.
    const root = host.attachShadow({ mode: __VT_TEST__ ? 'open' : 'closed' });
    const box = node('div', '', {
      background: '#1a1210', color: '#f4efe9', border: '1px solid #c8463f', 'border-left': '6px solid #c8463f', 'border-radius': '10px',
      padding: '16px 18px', 'box-shadow': '0 18px 50px rgba(0,0,0,.55)', font: '15px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', 'text-align': 'left',
    });
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-label', title);
    box.append(node('div', m.guard.brand, { font: '600 11px ui-monospace, Menlo, monospace', 'letter-spacing': '1.5px', color: '#ff9a92', margin: '0 0 6px' }));
    box.append(node('div', title, { 'font-size': '18px', 'font-weight': '700', margin: '0 0 6px', color: '#ffffff' }));
    for (const line of lines) box.append(node('p', line, { margin: '6px 0 0', color: '#e9e2da' }));
    const row = node('div', '', { display: 'flex', gap: '8px', 'justify-content': 'flex-end', margin: '14px 0 0', 'flex-wrap': 'wrap' });
    for (const b of buttons) {
      const btn = node('button', b.label, {
        font: '600 14px system-ui, sans-serif', padding: '8px 14px', 'border-radius': '6px', cursor: 'pointer',
        border: b.primary ? '1px solid #b9c98a' : '1px solid #6b6460', background: b.primary ? '#b9c98a' : 'transparent', color: b.primary ? '#141713' : '#f4efe9',
      });
      btn.setAttribute('type', 'button');
      btn.setAttribute('data-action', b.primary ? 'primary' : 'secondary');
      btn.addEventListener('click', b.act);
      row.append(btn);
    }
    box.append(row);
    root.append(box);
    document.documentElement.append(host);
    (row.querySelector('button[data-action="primary"]') as HTMLElement | null)?.focus();
  }

  const once = (kind: Kind, f: () => void): void => {
    if (shown.has(kind)) return;
    shown.add(kind);
    f();
  };
  const dismiss = { label: m.guard.dismiss, primary: true, act: close };

  // 1. A manipulative page: say what it asks and what to do, as soon as it is scanned.
  function pageWarning(): void {
    if (!report) return;
    const items = plainItems(report, aggregate(report), m);
    once('page', () => show('page', m.guard.pageTitle, items.flatMap((it) => [`${m.plain.askLabel}: ${it.ask}`, it.advice]).slice(0, 4), [dismiss]));
  }

  // 2. A command put on the clipboard: by a hidden element (the page copying behind the reader's back), or anything that
  // looks like a command on a page already flagged for command execution. The copy is replaced by a warning.
  document.addEventListener('copy', (e) => {
    const active = document.activeElement;
    let text = '';
    let hidden = false;
    if (active instanceof HTMLTextAreaElement || (active instanceof HTMLInputElement && active.type === 'text')) {
      const r = active.getBoundingClientRect();
      hidden = r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || getComputedStyle(active).opacity === '0';
      // Only a hidden field, filled by the page itself, is read; what a person selects in a visible field is not.
      if (hidden) text = active.value.slice(active.selectionStart ?? 0, active.selectionEnd ?? 0);
    } else {
      text = document.getSelection()?.toString() ?? '';
    }
    const flagged = plan.alerting.includes('command');
    if (!looksLikeCommand(text) || !(hidden || flagged)) return;
    e.preventDefault();
    e.clipboardData?.setData('text/plain', m.guard.clipboardReplacement);
    show('clipboard', m.guard.clipboardTitle, [m.guard.clipboardText], [dismiss]);
  }, true);

  // 3. An Android app download from a link: held until the reader decides.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href]');
    if (!(a instanceof HTMLAnchorElement) || !isApkDownload(a.href, a.getAttribute('download'), location.href)) return;
    if (allowedApk.has(a.href)) return;
    e.preventDefault();
    const href = a.href;
    show('apk', m.guard.apkTitle, [m.guard.apkText], [
      { label: m.guard.proceed, primary: false, act: () => { allowedApk.add(href); close(); location.assign(href); } },
      { label: m.guard.cancel, primary: true, act: close },
    ]);
  }, true);

  // 4. A secret field focused on a page with manipulation signs (credential, payment or support).
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) || !plan.alerting.some((c) => c !== 'command')) return;
    const label = el.labels?.[0]?.textContent ?? '';
    if (!isSecretField({ type: el.type, autocomplete: el.autocomplete, name: el.name, id: el.id, placeholder: el.placeholder, label: `${label} ${el.getAttribute('aria-label') ?? ''}` })) return;
    once('secret', () => show('secret', m.guard.secretTitle, [m.guard.secretText], [dismiss]));
  }, true);

  return {
    onReport(r) {
      report = r;
      plan = guardPlan(r);
      if (plan.page) pageWarning();
    },
  };
}
