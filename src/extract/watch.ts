// Change notification for dynamic pages and SPA navigation. It never re-extracts by itself: the caller
// (M3 adapter, or a test) decides whether to rescan. Observing does not modify the page.

export type ChangeReason = 'mutation' | 'navigation';

export interface WatchOptions {
  /** Quiet period before notifying. */
  debounceMs?: number;
  /** Upper bound on delay while mutations keep arriving. */
  maxWaitMs?: number;
}

/**
 * Calls `onChange` (debounced) after DOM mutations that can change visible text, or after history
 * navigation (popstate / hashchange). pushState itself is not observable without patching page globals,
 * which we refuse to do. SPA route changes are caught through the DOM mutations they cause.
 */
export function watchForChanges(doc: Document, onChange: (reason: ChangeReason) => void, options: WatchOptions = {}): () => void {
  const debounceMs = options.debounceMs ?? 250;
  const maxWaitMs = options.maxWaitMs ?? 2000;
  const win = doc.defaultView;
  if (!win) return () => undefined;
  let timer: number | undefined;
  let firstAt: number | undefined;
  let pending: ChangeReason = 'mutation';

  const fire = (): void => {
    timer = undefined;
    firstAt = undefined;
    onChange(pending);
    pending = 'mutation';
  };
  const schedule = (reason: ChangeReason): void => {
    if (reason === 'navigation') pending = 'navigation';
    const t = win.performance.now();
    firstAt ??= t;
    if (timer !== undefined) win.clearTimeout(timer);
    const wait = Math.max(0, Math.min(debounceMs, maxWaitMs - (t - firstAt)));
    timer = win.setTimeout(fire, wait);
  };

  const observer = new win.MutationObserver(() => schedule('mutation'));
  observer.observe(doc.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['style', 'class', 'hidden', 'open', 'aria-hidden', 'aria-modal'],
  });
  const onNav = (): void => schedule('navigation');
  win.addEventListener('popstate', onNav);
  win.addEventListener('hashchange', onNav);

  return () => {
    observer.disconnect();
    win.removeEventListener('popstate', onNav);
    win.removeEventListener('hashchange', onNav);
    if (timer !== undefined) win.clearTimeout(timer);
  };
}
