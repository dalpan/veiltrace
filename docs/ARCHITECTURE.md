# Architecture

Status: updated at M1. **Implemented (M1):** the pure core (`src/core`, §1), the `PageSnapshot` types (§4) and the toolchain (§5: TypeScript, esbuild, Vitest, ESLint). **Planned, not implemented:** the DOM extractor (§3, M2), and the extension, popup, manifest and highlighting (§2, §6, M3). Cross-browser work (§7) is M5.

## 1. Principles that shape the architecture

- **The core is a pure function:** `analyze(snapshot: PageSnapshot): AnalysisResult`. It has no DOM globals, no `chrome`/`browser`, no I/O and no clock. It runs identically in the popup, in Node (unit tests, evaluation harness) and later in Firefox.
- **One boundary object:** `PageSnapshot` is a JSON-serializable description of the visible page. It is produced by the extractor, which is the only code that touches a live DOM.
- **On-demand by default:** nothing runs on a page until the user clicks the toolbar action (`activeTab`). There is no persistent content script, no background service worker and no storage of page content in the MVP **(pending D-004)**.

## 2. Components

```
┌──────────── Extension (Chromium MV3) ─────────────┐
│ popup.html / popup.ts                             │
│   1. user clicks action → popup opens             │
│   2. scripting.executeScript({files:[extractor]}) │──┐ activeTab grant
│   3. receives PageSnapshot (return value)         │  │
│   4. analyze(snapshot) ── src/core (bundled)      │  ▼
│   5. render findings (textContent only)           │  extractor.js (IIFE, isolated world)
│   6. "Show on page" → executeScript(highlight)    │  - walks DOM incl. open shadow roots
└───────────────────────────────────────────────────┘  - returns PageSnapshot, mutates nothing

src/core     ← pure TS: normalize, lexicons, signals, regions, correlate, verdict
src/extract  ← DOM → PageSnapshot (standard DOM APIs only; no chrome.*)
src/extension← manifest, popup UI, browser adapter (the only place chrome.* appears)
scripts/eval ← Node harness: Playwright renders fixture → extractor → core → metrics
```

Why no background worker: the popup can call `chrome.scripting.executeScript` directly once `activeTab` is granted. That removes service-worker lifecycle bugs, avoids the Firefox-Android service-worker gap (Firefox for Android does not support background service workers, per Extension Workshop) and shrinks the attack surface. A background is introduced only if auto-scan (M6) needs one.

## 3. Extraction (src/extract)

Input: `document`. Output: `PageSnapshot`. Requirements:

1. **Walk** the tree with a `TreeWalker` and recurse into `element.shadowRoot` (open). Closed roots: try `chrome.dom.openOrClosedShadowRoot` through an injected adapter if available. **Verify in M2** whether it works from an `executeScript` isolated-world script.
2. **Visibility:** skip `display:none`, `visibility:hidden`, `opacity:0`, zero-size, `aria-hidden` subtrees, and elements clipped off-screen. Hidden text is *not* instruction text but **is** a candidate for `A.COPY_TRIGGER` targets (hidden input / `data-clipboard-text`). It is collected separately in `hiddenCopyCandidates`.
3. **Blocks:** group text by the nearest block-level ancestor. Record the tag path (≤ 6 ancestors), a context flag set (in `pre`/`code`/`blockquote`/`q`/`article`/`main`/`dialog`/`form`/UGC-like container), a bounding box (viewport-relative), the `position` and `z-index` of the nearest positioned ancestor, and a `locator`.
4. **Locator:** a short CSS path (ids where present, otherwise `:nth-of-type` chain) plus a text fingerprint. It is used for highlight and evidence and must survive JSON transport. It is not guaranteed stable across page mutations, so the UI says so if the highlight fails.
5. **Attributes:** include `alt`, `aria-label`, `title`, `placeholder` and button/link text.
6. **Frames:** top frame. Same-origin frames are reachable via `contentDocument`. Count and report frames that could not be inspected.
7. **Budgets:** ≤ 50k nodes visited, ≤ 5k blocks, ≤ 2k chars per block, ≤ 300 ms wall time (checked between nodes). On a budget hit: stop, set `truncated: true`, and report it.
8. **No mutation:** the extractor never writes to the DOM. Highlighting is a separate script.

## 4. PageSnapshot (schemaVersion 1, implemented as types in `src/core/types.ts`)

```ts
interface PageSnapshot {
  schemaVersion: 1;
  url: string;            // echoed for display by adapters; NEVER read by the core
  title: string;          // not used for decisions (page-global text must not cross regions)
  lang: string | null;    // <html lang>
  blocks: Block[];        // document order
  hiddenCopyCandidates: HiddenCopyCandidate[];
  copyTriggers: CopyTrigger[];
  coverage: { framesSkipped: number; truncated: boolean; closedShadowRootsSkipped: number };
}
interface Block {
  id: string; text: string; containerId: string; locator?: string;
  ctx?: { pre?: boolean; code?: boolean; quote?: boolean; article?: boolean; dialog?: boolean; form?: boolean; ugc?: boolean };
  headingContext?: string | null; // nearest preceding h1–h3 text
  box?: { x: number; y: number; w: number; h: number };            // M2, used by C.OVERLAY in M4
  positioned?: { mode: 'static' | 'fixed' | 'absolute' | 'sticky'; z: number };
}
interface HiddenCopyCandidate { id: string; text: string; containerId: string; afterBlockId?: string; via: 'input' | 'data-attr' | 'hidden-el'; locator?: string }
interface CopyTrigger { id: string; label: string; containerId: string; afterBlockId?: string; locator?: string }
```

`locator` is opaque to the core. It is carried through so a browser adapter can highlight the element later (M3). The core does **not** implement highlighting.

Fixtures for unit tests are written directly as snapshots, so no browser is needed for M1 tests. The geometry fields are optional in M1, and the M2 extractor fills them.

## 5. Technology choices (proposed)

| Concern | Proposal | Rationale | Alternative |
|---|---|---|---|
| Language | TypeScript (strict) | Typed contracts between extractor, core and UI | — |
| Build | **esbuild via a small `scripts/build.mjs`** **(pending D-006)** | Two outputs: popup (ESM) and extractor (**IIFE**: `executeScript` files must be classic scripts). No dev server needed. Fewer config layers | Vite (fine for the popup, but the IIFE extractor needs a second lib build). Revisit if UI complexity grows |
| UI | Plain DOM + CSS, no framework | The popup is one list + detail view. Zero runtime deps | Preact if needed later |
| Unit tests | Vitest | Fast and TS-native | node:test |
| DOM tests | Vitest + happy-dom for extractor logic that needs no layout | Cheap | jsdom |
| Real rendering | Playwright (Chromium) | Visibility and geometry need a real layout engine. Also loads the unpacked extension for e2e | — |
| Lint | ESLint + a rule forbidding `chrome`/`browser`/`window`/`document` in `src/core`, and `innerHTML` with dynamic values in the popup | Enforces the architecture | — |
| Package manager | npm with lockfile | Already installed. No monorepo | pnpm |

Runtime dependencies target: **0**. Everything shipped in the extension is our own code.

## 6. Manifest (MVP, Chromium)

```json
{
  "manifest_version": 3,
  "name": "VEILTRACE",
  "version": "0.1.0",
  "action": { "default_popup": "popup.html" },
  "permissions": ["activeTab", "scripting"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'none'"
  }
}
```

- `activeTab` shows **no install-time warning** and grants temporary access to the active tab after a user gesture. The grant is revoked on cross-origin navigation (Chrome docs).
- `connect-src 'none'` on extension pages is a defense-in-depth assertion that the popup cannot fetch. **Verify in M3** that Chrome accepts it.
- No `host_permissions`, `tabs`, `storage`, `webRequest`, `clipboardRead` or `notifications`.

## 7. Cross-browser plan

- Firefox desktop (MV3): the same approach. `scripting` + `activeTab` are supported. Needs `browser_specific_settings.gecko.id`.
- Firefox for Android: Extension Workshop recommends MV2 for Android and states that background service workers are unsupported. Our MVP has no background, which removes the main blocker. **M5 spike** must verify `activeTab` + `scripting.executeScript` from the popup on Fenix, and whether host-permission UX differs (Android does not visually indicate pending host-permission requests).
- The core and extractor are browser-agnostic by construction. Only `src/extension/adapter.ts` differs.

## 8. Performance considerations

- Extraction cost is dominated by `getComputedStyle` and `getBoundingClientRect`. Call them only for elements that contain text or are copy triggers, and cache per element.
- Core analysis is linear in total text. Lexicon matching uses precompiled regex alternations per signal family.
- Budgets in §3.7. The M4 acceptance criterion includes a measured p95 on the fixture set and on 3 large real pages saved locally.

## 9. Security of the extension (summary; details in PRIVACY_SECURITY.md)

- Isolated world only. The MVP never injects into the MAIN world.
- No message listeners exposed to pages.
- Page-derived strings are rendered with `textContent` only.
- No eval, no remote code, no network.
