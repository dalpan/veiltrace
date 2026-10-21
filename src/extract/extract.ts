// DOM → PageSnapshot. Runs in a page (extension isolated world in M3; Playwright in tests).
// Read-only by construction: no DOM writes, no event dispatch, no script execution (lint-enforced).
// See docs/ARCHITECTURE.md §3 for behavior and limits.
import type { Block, BlockContext, CopyTrigger, HiddenCopyCandidate, PageSnapshot, PartialReason } from '../core/types.js';

export const EXTRACTOR_VERSION = '0.1.0-m2';

export interface ExtractOptions {
  maxNodes?: number;
  maxBlocks?: number;
  maxBlockChars?: number;
  maxTotalChars?: number;
  maxAux?: number;
  timeBudgetMs?: number;
  /** Closed-shadow-root adapter, e.g. chrome.dom.openOrClosedShadowRoot in an extension content script. */
  getShadowRoot?: (el: Element) => ShadowRoot | null;
  /** 'semantic' (default) uses all boundary elements; 'coarse' only dialogs, overlays, frames and body (research ablation). */
  containerStrategy?: 'semantic' | 'coarse';
  now?: () => number;
}

export type BudgetHit = 'nodes' | 'blocks' | 'chars' | 'time' | null;

export interface ExtractStats {
  extractorVersion: string;
  elapsedMs: number;
  nodesVisited: number;
  textChars: number;
  blocks: number;
  hiddenCopyCandidates: number;
  copyTriggers: number;
  framesInspected: number;
  budgetHit: BudgetHit;
}

export interface ExtractResult {
  snapshot: PageSnapshot;
  stats: ExtractStats;
}

const DEFAULTS = { maxNodes: 50_000, maxBlocks: 5000, maxBlockChars: 2000, maxTotalChars: 1_000_000, maxAux: 200, timeBudgetMs: 1500 };

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'OBJECT', 'EMBED', 'CANVAS', 'VIDEO', 'AUDIO', 'MAP', 'SELECT', 'OPTION']);
const INLINE_DISPLAYS = new Set(['inline', 'inline-block', 'inline-flex', 'inline-grid', 'inline-table', 'contents', 'ruby', 'ruby-text']);
const HEADINGS = new Set(['H1', 'H2', 'H3']);
const UGC_TOKEN = /(?:^|[-_\s])(?:comments?|replies|reply|reviews?|post-body|user-content|ugc|forum-post)(?:[-_\s]|$)/i;
const COPY_TOKEN = /(?:^|[-_\s])(?:copy|clipboard)(?:[-_\s]|$)/i;
/** Never read values of fields whose name/id/autocomplete suggest secrets or personal data. */
const SENSITIVE_FIELD = /pass|pwd|token|csrf|xsrf|auth|session|secret|otp|one-time|nonce|key|card|cc-|cvv|pin|ssn|nik|email|phone|tel/i;
const LOCATOR_SEP = { shadow: '::shadow::', frame: '::frame::' } as const;

interface Container {
  id: string;
  heading: string | null;
}

interface Inherited {
  ctx: BlockContext;
  container: Container;
  /** Element whose block-level box owns inline text. */
  owner: Element;
  ownerLocator: () => string;
  /** This element's text is not visible (computed per element: visibility and font-size can be re-enabled by children). */
  invisible: boolean;
  /** Hidden for the whole subtree (opacity 0, clipping, collapsed overflow): children cannot undo it. */
  hardHidden: boolean;
  win: Window;
  /** Locator prefix for nodes inside shadow roots / frames, ending with a separator. */
  prefix: string;
  /** Root used to compute CSS paths (document or shadow root). */
  root: Document | ShadowRoot;
}

interface Segment {
  blockId: string | null;
  parts: string[];
  inh: Inherited;
}

function cssPath(el: Element, root: Document | ShadowRoot): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur) {
    const id = cur.id;
    if (id && /^[A-Za-z][\w-]*$/.test(id) && root.querySelectorAll(`#${id}`).length === 1) {
      parts.unshift(`#${id}`);
      break;
    }
    const parentEl: Element | null = cur.parentElement;
    const tag = cur.tagName.toLowerCase();
    if (!parentEl || tag === 'body') {
      parts.unshift(tag);
      break;
    }
    let index = 1;
    for (let sib = cur.previousElementSibling; sib; sib = sib.previousElementSibling) if (sib.tagName === cur.tagName) index++;
    parts.unshift(`${tag}:nth-of-type(${index})`);
    cur = parentEl;
  }
  return parts.join(' > ');
}

/** Resolves a locator produced by the extractor (supports ::shadow:: and ::frame:: segments). */
export function resolveLocator(doc: Document, locator: string, getShadowRoot?: (el: Element) => ShadowRoot | null): Element | null {
  const pieces = locator.split(/(::shadow::|::frame::)/);
  let root: Document | ShadowRoot = doc;
  let el = null as Element | null;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i] as string;
    if (p === LOCATOR_SEP.shadow) {
      const sr: ShadowRoot | null = el ? (getShadowRoot?.(el) ?? el.shadowRoot) : null;
      if (!sr) return null;
      root = sr;
    } else if (p === LOCATOR_SEP.frame) {
      const d: Document | null = el instanceof HTMLIFrameElement ? safeFrameDoc(el) : null;
      if (!d) return null;
      root = d;
    } else {
      el = root.querySelector(p);
      if (!el) return null;
    }
  }
  return el;
}

function safeFrameDoc(f: HTMLIFrameElement): Document | null {
  try {
    return f.contentDocument;
  } catch {
    return null;
  }
}

function containerKind(el: Element, style: CSSStyleDeclaration, win: Window, coarse: boolean): string | null {
  const tag = el.tagName;
  const role = el.getAttribute('role');
  if (tag === 'DIALOG' || role === 'dialog' || role === 'alertdialog' || el.getAttribute('aria-modal') === 'true') return 'dialog';
  if (style.position === 'fixed' || (style.position === 'absolute' && Number(style.zIndex) >= 100)) {
    const r = el.getBoundingClientRect();
    if (r.width * r.height >= 0.15 * win.innerWidth * win.innerHeight) return 'overlay';
  }
  if (coarse) return null;
  const tokens = `${el.id} ${typeof el.className === 'string' ? el.className : ''}`;
  if (UGC_TOKEN.test(tokens) || el.getAttribute('itemprop') === 'comment' || /Comment/.test(el.getAttribute('itemtype') ?? '')) return 'ugc';
  switch (tag) {
    case 'ARTICLE': return 'article';
    case 'SECTION': return 'section';
    case 'ASIDE': return 'aside';
    case 'NAV': return 'nav';
    case 'HEADER': return 'header';
    case 'FOOTER': return 'footer';
    case 'MAIN': return 'main';
    case 'FORM': return 'form';
  }
  if (role && ['main', 'region', 'complementary', 'navigation', 'banner', 'contentinfo', 'form', 'alert', 'article'].includes(role)) return role;
  return null;
}

function isCopyTrigger(el: Element): boolean {
  const tag = el.tagName;
  const interactive = tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY' || el.getAttribute('role') === 'button' ||
    (tag === 'INPUT' && ['button', 'submit'].includes((el as HTMLInputElement).type));
  if (!interactive) return false;
  if (el.hasAttribute('data-clipboard-text') || el.hasAttribute('data-clipboard-target') || el.hasAttribute('data-copy')) return true;
  if (/clipboard/i.test(el.getAttribute('onclick') ?? '')) return true;
  return COPY_TOKEN.test(`${el.id} ${typeof el.className === 'string' ? el.className : ''}`);
}

function isSensitiveField(el: Element): boolean {
  if (el instanceof HTMLInputElement && !['text', 'search', ''].includes(el.type)) return true;
  const attrs = `${el.getAttribute('name') ?? ''} ${el.id} ${el.getAttribute('autocomplete') ?? ''}`;
  return SENSITIVE_FIELD.test(attrs);
}

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function extractSnapshot(doc: Document, options: ExtractOptions = {}): ExtractResult {
  const o = { ...DEFAULTS, ...options };
  const now = o.now ?? (() => (globalThis.performance ? globalThis.performance.now() : 0));
  const getShadowRoot = o.getShadowRoot ?? ((el: Element) => el.shadowRoot);
  const coarse = o.containerStrategy === 'coarse';
  const t0 = now();

  const blocks: Block[] = [];
  const hidden: HiddenCopyCandidate[] = [];
  const triggers: CopyTrigger[] = [];
  const seenHidden = new Set<Element>();
  let nodes = 0;
  let chars = 0;
  let framesSkipped = 0;
  let framesInspected = 0;
  let closedSkipped = 0;
  let budget: BudgetHit = null;
  let blockTextCapped = 0;
  let auxCapped = false;
  let blockSeq = 0;
  let segment: Segment | null = null;
  let lastBlockId: string | undefined;

  const stop = (): boolean => budget !== null;
  const hit = (b: Exclude<BudgetHit, null>): void => { if (!budget) budget = b; };

  function flush(): void {
    const seg = segment;
    segment = null;
    if (!seg || seg.blockId === null) return;
    let text = collapse(seg.parts.join(''));
    if (!text) return;
    if (text.length > o.maxBlockChars) {
      // Cap this block only; the scan continues (reported as 'block-text-capped').
      text = text.slice(0, o.maxBlockChars);
      blockTextCapped++;
    }
    if (blocks.length >= o.maxBlocks) {
      hit('blocks');
      return;
    }
    chars += text.length;
    if (chars > o.maxTotalChars) hit('chars');
    blocks.push({
      id: seg.blockId,
      text,
      containerId: seg.inh.container.id,
      locator: seg.inh.ownerLocator(),
      ctx: { ...seg.inh.ctx },
      headingContext: seg.inh.container.heading,
    });
    lastBlockId = seg.blockId;
  }

  function appendText(text: string, inh: Inherited): void {
    if (!segment || segment.inh.owner !== inh.owner || segment.inh.container !== inh.container) {
      flush();
      segment = { blockId: null, parts: [], inh };
    }
    if (segment.blockId === null && text.trim()) segment.blockId = `b${blockSeq++}`;
    segment.parts.push(text);
  }

  function addHidden(text: string, via: HiddenCopyCandidate['via'], el: Element, inh: Inherited): void {
    const t = collapse(text).slice(0, 4000);
    if (!t || seenHidden.has(el)) return;
    if (hidden.length >= o.maxAux) {
      auxCapped = true;
      return;
    }
    seenHidden.add(el);
    hidden.push({ id: `h${hidden.length}`, text: t, containerId: inh.container.id, via, locator: inh.prefix + cssPath(el, inh.root), ...(lastBlockId ? { afterBlockId: lastBlockId } : {}) });
  }

  function textVisible(node: Text): boolean {
    const d = node.ownerDocument;
    const scrollY = d.defaultView?.scrollY ?? 0;
    const docWidth = Math.max(d.documentElement.scrollWidth, d.defaultView?.innerWidth ?? 0);
    const range = d.createRange();
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i] as DOMRect;
      if (r.width >= 1 && r.height >= 1 && r.right > 0 && r.bottom > -scrollY && r.left < docWidth) return true;
    }
    return false;
  }

  /** Copy targets and hidden payload holders inside a subtree that is not rendered. */
  function scanHiddenSubtree(root: Element, inh: Inherited): void {
    const candidates = root.matches('textarea, [data-clipboard-text]') ? [root] : [];
    candidates.push(...Array.from(root.querySelectorAll('textarea, [data-clipboard-text]')));
    for (const el of candidates) {
      if (el.hasAttribute('data-clipboard-text')) addHidden(el.getAttribute('data-clipboard-text') ?? '', 'data-attr', el, inh);
      else if (!isSensitiveField(el)) addHidden((el as HTMLTextAreaElement).defaultValue, 'input', el, inh);
    }
  }

  function walkChildren(parent: Node, inh: Inherited): void {
    for (let child = parent.firstChild; child && !stop(); child = child.nextSibling) walk(child, inh);
  }

  function walk(node: Node, inh: Inherited): void {
    if (stop()) return;
    if (++nodes > o.maxNodes) return hit('nodes');
    if ((nodes & 255) === 0 && now() - t0 > o.timeBudgetMs) return hit('time');

    if (node.nodeType === 3) {
      const t = node as Text;
      if (!inh.invisible && t.data.trim() && textVisible(t)) appendText(t.data, inh);
      else if (!inh.invisible && t.data.length > 0 && !t.data.trim()) appendText(' ', inh);
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as Element;
    if (SKIP_TAGS.has(el.tagName)) return;

    const style = inh.win.getComputedStyle(el);
    const notRendered = style.display === 'none';
    const hardHidden = inh.hardHidden || Number(style.opacity) === 0 || isClipped(el, style);
    const invisible = hardHidden || notRendered || style.visibility !== 'visible' || style.fontSize === '0px';

    // Trigger and hidden-value collection happen regardless of visibility.
    if (isCopyTrigger(el) && triggers.length >= o.maxAux) auxCapped = true;
    if (isCopyTrigger(el) && triggers.length < o.maxAux) {
      if (!invisible) {
        const label = collapse((el as HTMLElement).innerText || el.getAttribute('aria-label') || (el as HTMLInputElement).value || '');
        triggers.push({ id: `t${triggers.length}`, label: label.slice(0, 200), containerId: inh.container.id, locator: inh.prefix + cssPath(el, inh.root), ...(lastBlockId ? { afterBlockId: lastBlockId } : {}) });
      }
      const data = el.getAttribute('data-clipboard-text');
      if (data) addHidden(data, 'data-attr', el, inh);
      const target = el.getAttribute('data-clipboard-target') ?? el.getAttribute('data-copy');
      if (target) {
        let t: Element | null;
        try { t = inh.root.querySelector(target); } catch { t = null; }
        if (t && !isSensitiveField(t)) {
          const text = t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement ? t.defaultValue : t.textContent ?? '';
          // Visible targets are already blocks; only record payloads the reader cannot see.
          if (isHiddenElement(t)) addHidden(text, t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement ? 'input' : 'hidden-el', t, inh);
        }
      }
    }
    if (notRendered) {
      scanHiddenSubtree(el, inh);
      return;
    }
    if (el instanceof HTMLTextAreaElement) {
      // Off-screen or invisible textareas are a classic clipboard-staging spot; read-only visible ones display page-authored text.
      // Only defaultValue (page-authored) is read, never what the user typed.
      if (!isSensitiveField(el)) {
        if (invisible || isHiddenElement(el)) addHidden(el.defaultValue, 'input', el, inh);
        else if (el.readOnly) appendText(` ${el.defaultValue} `, inh);
      }
      return;
    }

    const blockLevel = !INLINE_DISPLAYS.has(style.display);
    const kind = containerKind(el, style, inh.win, coarse);
    let next: Inherited = inh;
    if (kind || blockLevel) {
      const container: Container = kind
        ? { id: `${kind}:${inh.prefix}${cssPath(el, inh.root)}`, heading: inh.container.heading }
        : inh.container;
      const ctx: BlockContext = { ...inh.ctx };
      const tag = el.tagName;
      if (tag === 'PRE') ctx.pre = true;
      if (tag === 'CODE' || tag === 'KBD' || tag === 'SAMP') ctx.code = true;
      if (tag === 'BLOCKQUOTE' || tag === 'Q') ctx.quote = true;
      if (tag === 'ARTICLE' || tag === 'MAIN' || el.getAttribute('role') === 'main' || el.getAttribute('role') === 'article') ctx.article = true;
      if (tag === 'FORM') ctx.form = true;
      if (kind === 'dialog') ctx.dialog = true;
      if (kind === 'overlay') ctx.overlay = true;
      if (kind === 'ugc') ctx.ugc = true;
      if (el.getAttribute('aria-hidden') === 'true') ctx.ariaHidden = true;
      let loc: string | undefined;
      next = { ...inh, ctx, container, owner: blockLevel ? el : inh.owner, ownerLocator: blockLevel ? () => (loc ??= inh.prefix + cssPath(el, inh.root)) : inh.ownerLocator, invisible, hardHidden };
      if (blockLevel) flush();
    } else if (invisible !== inh.invisible || hardHidden !== inh.hardHidden) {
      next = { ...inh, invisible, hardHidden };
    }

    // Replaced elements and attribute text the reader sees.
    if (!invisible) {
      if (el.tagName === 'IMG' && (el as HTMLImageElement).alt) appendText(` ${(el as HTMLImageElement).alt} `, next);
      if (el.tagName === 'BR') appendText(' ', next);
      if (el instanceof HTMLInputElement) {
        if (['button', 'submit', 'reset'].includes(el.type) && el.value) appendText(` ${el.value} `, next);
        else if (!isSensitiveField(el) && el.placeholder) appendText(` ${el.placeholder} `, next);
      }
      if (el instanceof HTMLTextAreaElement && el.placeholder) appendText(` ${el.placeholder} `, next);
      if ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && !el.textContent?.trim() && el.getAttribute('aria-label')) {
        appendText(` ${el.getAttribute('aria-label')} `, next);
      }
    }

    if (el.tagName === 'IFRAME') {
      const fdoc = safeFrameDoc(el as HTMLIFrameElement);
      if (!fdoc || !fdoc.body || !fdoc.defaultView) framesSkipped++;
      else if (!invisible) {
        framesInspected++;
        flush();
        const frameLoc = inh.prefix + cssPath(el, inh.root) + LOCATOR_SEP.frame;
        const container: Container = { id: `frame:${frameLoc}`, heading: null };
        walkChildren(fdoc.body, { ...next, container, owner: fdoc.body, ownerLocator: () => `${frameLoc}body`, win: fdoc.defaultView, prefix: frameLoc, root: fdoc, ctx: {} });
        flush();
      }
      return;
    }

    const sr = getShadowRoot(el);
    if (sr) {
      flush();
      const shadowLoc = inh.prefix + cssPath(el, inh.root) + LOCATOR_SEP.shadow;
      const container: Container = kind ? next.container : { id: `widget:${shadowLoc}`, heading: next.container.heading };
      walkChildren(sr, { ...next, container, prefix: shadowLoc, root: sr });
      flush();
    } else if (el.tagName.includes('-') && !el.firstChild && !invisible) {
      const r = el.getBoundingClientRect();
      if (r.width * r.height > 0) closedSkipped++; // likely a closed shadow root we cannot read
    }

    walkChildren(el, next);
    if (next.owner !== inh.owner) flush();
    if (HEADINGS.has(el.tagName) && !invisible) next.container.heading = collapse((el as HTMLElement).innerText).slice(0, 200) || next.container.heading;
  }

  function isClipped(el: Element, style: CSSStyleDeclaration): boolean {
    if (style.clip === 'rect(0px, 0px, 0px, 0px)' || style.clipPath === 'inset(50%)' || style.clipPath === 'inset(100%)') return true;
    if (style.overflow === 'hidden' || style.overflow === 'clip') {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) return true;
    }
    return false;
  }

  function isHiddenElement(el: Element): boolean {
    const win = el.ownerDocument.defaultView;
    if (!win) return true;
    for (let cur: Element | null = el; cur; cur = cur.parentElement) {
      const s = win.getComputedStyle(cur);
      if (s.display === 'none' || s.visibility !== 'visible' || Number(s.opacity) === 0 || isClipped(cur, s)) return true;
    }
    const r = el.getBoundingClientRect();
    const docWidth = Math.max(el.ownerDocument.documentElement.scrollWidth, win.innerWidth);
    return r.right <= 0 || r.bottom <= -win.scrollY || r.left >= docWidth || r.width < 1 || r.height < 1;
  }

  function partialReasons(): PartialReason[] {
    const out: PartialReason[] = [];
    if (budget === 'nodes') out.push('node-budget');
    if (budget === 'blocks') out.push('block-budget');
    if (budget === 'chars') out.push('char-budget');
    if (budget === 'time') out.push('timeout');
    if (blockTextCapped > 0) out.push('block-text-capped');
    if (auxCapped) out.push('aux-capped');
    if (framesSkipped > 0) out.push('frames-skipped');
    if (closedSkipped > 0) out.push('closed-shadow-skipped');
    return out;
  }

  const body = doc.body;
  const win = doc.defaultView as Window;
  const rootContainer: Container = { id: 'body', heading: null };
  if (body) {
    walkChildren(body, {
      ctx: {}, container: rootContainer, owner: body, ownerLocator: () => 'body', invisible: false, hardHidden: false, win, prefix: '', root: doc,
    });
    flush();
  }

  const snapshot: PageSnapshot = {
    schemaVersion: 1,
    url: doc.location?.href ?? '',
    title: doc.title ?? '',
    lang: doc.documentElement.getAttribute('lang'),
    blocks,
    hiddenCopyCandidates: hidden,
    copyTriggers: triggers,
    coverage: { framesSkipped, truncated: budget !== null || blockTextCapped > 0, closedShadowRootsSkipped: closedSkipped, partial: partialReasons() },
  };
  return {
    snapshot,
    stats: {
      extractorVersion: EXTRACTOR_VERSION,
      elapsedMs: now() - t0,
      nodesVisited: nodes,
      textChars: chars,
      blocks: blocks.length,
      hiddenCopyCandidates: hidden.length,
      copyTriggers: triggers.length,
      framesInspected,
      budgetHit: budget,
    },
  };
}
