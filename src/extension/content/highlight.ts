// "Show on page": a temporary overlay box drawn above an evidence element. It never touches the element
// itself (no style, attribute, value or focus changes, no clicks), never inserts page-visible text, and
// removes itself after `durationMs`. Its only effects are one extension-owned element and a scroll.
import { isSafeLocator, resolveLocator } from '../../extract/extract.js';

export type HighlightStatus =
  | 'highlighted' | 'invalid-locator' | 'not-found' | 'frame-inaccessible' | 'not-visible';

export interface HighlightResult {
  status: HighlightStatus;
}

const MARK = 'data-veiltrace-highlight';
let active: { el: HTMLElement; timer: number } | null = null;

export function clearHighlight(): void {
  if (!active) return;
  clearTimeout(active.timer);
  active.el.remove();
  active = null;
}

function frameOffset(el: Element): { x: number; y: number; insideFixed: boolean } {
  let x = 0;
  let y = 0;
  let insideFixed = false;
  for (let win: Window | null = el.ownerDocument.defaultView; win && win.frameElement; win = win.parent) {
    const fr = win.frameElement.getBoundingClientRect();
    const cs = win.parent.getComputedStyle(win.frameElement);
    x += fr.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
    y += fr.top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop);
  }
  // An element inside a fixed-position container (typical lure overlay) does not move with page scroll.
  for (let cur: Element | null = el; cur; cur = cur.parentElement ?? ((cur.getRootNode() as ShadowRoot).host ?? null)) {
    const win = cur.ownerDocument.defaultView;
    if (win && win.getComputedStyle(cur).position === 'fixed') {
      insideFixed = true;
      break;
    }
  }
  return { x, y, insideFixed };
}

function isRendered(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  const win = el.ownerDocument.defaultView;
  if (!win) return false;
  for (let cur: Element | null = el; cur; cur = cur.parentElement) {
    const s = win.getComputedStyle(cur);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
  }
  const docW = Math.max(el.ownerDocument.documentElement.scrollWidth, win.innerWidth);
  return r.right > 0 && r.left < docW && r.bottom > -win.scrollY;
}

export function highlight(
  locator: unknown,
  durationMs: number,
  getShadowRoot?: (el: Element) => ShadowRoot | null,
): HighlightResult {
  clearHighlight();
  if (!isSafeLocator(locator)) return { status: 'invalid-locator' };
  const el = resolveLocator(document, locator, getShadowRoot);
  if (!el) return { status: locator.includes('::frame::') ? 'frame-inaccessible' : 'not-found' };
  if (!isRendered(el)) return { status: 'not-visible' };

  el.scrollIntoView({ block: 'center', inline: 'nearest' });
  const r = el.getBoundingClientRect();
  const off = frameOffset(el);
  const box = document.createElement('div');
  box.setAttribute(MARK, '');
  const pad = 4;
  const fixed = off.insideFixed;
  const left = r.left + off.x - pad + (fixed ? 0 : window.scrollX);
  const top = r.top + off.y - pad + (fixed ? 0 : window.scrollY);
  const css: Record<string, string> = {
    position: fixed ? 'fixed' : 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${r.width + pad * 2}px`,
    height: `${r.height + pad * 2}px`,
    border: '3px solid #f59e0b',
    'border-radius': '6px',
    'box-shadow': '0 0 0 4px rgba(245, 158, 11, 0.35)',
    background: 'rgba(245, 158, 11, 0.08)',
    'pointer-events': 'none',
    'z-index': '2147483647',
    margin: '0',
    padding: '0',
    'box-sizing': 'border-box',
  };
  // CSSOM property writes are not blocked by a page's style-src CSP (unlike style attributes or <style>).
  for (const [k, v] of Object.entries(css)) box.style.setProperty(k, v, 'important');
  document.documentElement.appendChild(box);
  active = { el: box, timer: window.setTimeout(clearHighlight, durationMs) };
  return { status: 'highlighted' };
}
