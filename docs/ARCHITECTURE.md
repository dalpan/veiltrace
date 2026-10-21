# Architecture

Status: updated at M2. **Implemented:** the pure core (`src/core`, §1, M1), the `PageSnapshot` types (§4), the DOM extractor and change watcher (`src/extract`, §3, M2), the offline evaluation harness (`src/eval`, §10, M2) and the toolchain (§5). **Planned, not implemented:** the extension, popup, manifest and on-page highlighting (§2, §6, M3). Cross-browser work (§7) is M5.

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

## 3. Extraction (src/extract), implemented in M2

`extractSnapshot(document, options) → { snapshot: PageSnapshot, stats }` is bundled as an IIFE (`dist/extractor.js`, global `VeiltraceExtractor`, ~18 KB) so that M3 can inject it with `scripting.executeScript`. It uses standard DOM APIs only. `resolveLocator(document, locator)` maps a locator back to its element (for evidence localization now, and highlighting in M3). `watchForChanges(document, onChange)` reports dynamic changes (§3.8).

### 3.1 Walk
A depth-first walk from `<body>` in document order. It descends into open shadow roots (and closed ones when an adapter is supplied, §3.6) and same-origin iframes. Skipped tags: `script`, `style`, `noscript`, `template`, `head`, `meta`, `link`, `object`, `embed`, `canvas`, `video`, `audio`, `map`, `select`, `option`.

### 3.2 Visibility: what a sighted user can see
- **Per text node**, the text must have at least one client rect ≥ 1×1 px that is not entirely left of the page, right of the document width or above the top (`Range.getClientRects()`). This catches `display:none` ancestors, closed `<details>`, collapsed and off-screen content.
- **Per element**, `visibility` and `font-size: 0` are computed per element, because a child may re-enable visibility. `opacity: 0`, `clip: rect(0…)`, `clip-path: inset(50%|100%)` and `overflow:hidden` boxes ≤ 1 px hide the **whole subtree**.
- **`aria-hidden` does not hide** (D-023). We care about what is rendered for sighted users, and attackers could otherwise set `aria-hidden` on a visible lure.

### 3.3 Blocks, containers, context
- **Blocks:** text is grouped by the nearest *block-level* box (computed `display` not inline/contents). A parent's text before and after a nested block becomes separate blocks, in reading order. Inline fragments are concatenated as rendered (`<span>Ver</span><span>ify</span>` → "Verify"). Visible `alt`, button `value`, `placeholder`, `aria-label` of icon-only buttons and read-only `<textarea>` default text are included. Whitespace is collapsed and blocks are capped at 2,000 chars.
- **Containers** (`containerId = "<kind>:<locator>"`, nearest boundary wins): `dialog` (`<dialog>`, `role=dialog|alertdialog`, `aria-modal`), `overlay` (fixed, or absolute with z-index ≥ 100, covering ≥ 15% of the viewport), `ugc` (comment/reply/review tokens in id/class, `itemprop=comment`), `article`, `section`, `aside`, `nav`, `header`, `footer`, `main`, `form`, landmark roles, `widget` (shadow host), `frame` (iframe document), and `body`. `containerStrategy: 'coarse'` (research only) keeps only dialog/overlay/frame/body.
- **Context flags:** `pre`, `code` (block-level code), `quote` (`blockquote`, `q`), `article` (`article`, `main`, roles), `form`, `dialog`, `overlay`, `ugc`. `overlay` is new in M2, optional, and ignored by the M1 decision model.
- **`headingContext`** is the latest visible h1–h3 in the same container. A nested container inherits its parent's latest heading when it starts.
- **`ariaHidden`** (metadata, D-023) is set when the block's owner or an enclosing block/container has `aria-hidden="true"` (inline-element granularity is not tracked). The text is still extracted, and the decision model ignores the flag.

### 3.4 Clipboard payloads and copy controls
- **Copy triggers** are buttons, links, `summary`, `role=button` or button inputs that carry `data-clipboard-text|target`, `data-copy`, an `onclick` attribute mentioning `clipboard` (the attribute **string** is read, never executed), or a `copy`/`clipboard` id or class token. Label and `afterBlockId` are recorded.
- **Hidden copy candidates:** `data-clipboard-text` values; targets of `data-clipboard-target`/`data-copy` that are not visible; and textareas that are invisible or off-screen (their page-authored `defaultValue`). A `data-clipboard-text` payload is recorded even when the same text is also visible (D-026).
- **Privacy:** password values, `input[type=hidden]`, any non-text input type, and fields whose name, id or autocomplete matches secret or personal patterns (pass, token, csrf, auth, session, otp, pin, card, email, phone, …) are **never read**. Values the user typed (`.value`) are never read, only `defaultValue`/`placeholder`. These rules are tested.

### 3.5 Locators
`locator` is a CSS path (`#id` when unique, otherwise `tag:nth-of-type(n)` chained from `body`). Shadow and frame boundaries are written as `::shadow::` and `::frame::` segments, e.g. `body > x-w:nth-of-type(1)::shadow::p:nth-of-type(1)`. A locator is valid for the DOM as extracted. If the page mutates afterwards, it may no longer resolve, and M3 must handle that.

### 3.6 Shadow DOM and frames
- **Open shadow roots** are extracted, with a `widget:` container for the host.
- **Closed shadow roots** cannot be read from page context. `options.getShadowRoot` accepts an adapter (M3: `chrome.dom.openOrClosedShadowRoot`, Chrome 88+). This was verified with a simulated adapter in tests; the real API in an isolated world is **not yet verified** (M3). Without an adapter, `coverage.closedShadowRootsSkipped` counts *likely* closed hosts: rendered custom elements with no light-DOM children. This is a heuristic.
- **Same-origin iframes** are extracted inline (container `frame:`). **Cross-origin iframes** are skipped and counted in `coverage.framesSkipped`. `stats.framesInspected` counts the inspected ones.

### 3.7 Budgets
The defaults are `maxNodes` 50,000, `maxBlocks` 5,000, `maxBlockChars` 2,000, `maxTotalChars` 1,000,000, `maxAux` 200 and `timeBudgetMs` 1,500 (D-027, provisional). Node, block, total-character and time budgets **stop** the walk (`stats.budgetHit`). The per-block cap only truncates that block, and the aux cap only drops further payloads/triggers; neither stops the walk. Every case is reported (§3.10). The extractor never writes to the DOM, never clicks, focuses or dispatches events, and never executes page content. This is enforced by an ESLint rule on `src/extract`, proven by a lint probe test, and checked at runtime (MutationObserver records 0, `outerHTML` unchanged, handlers not invoked).

### 3.8 Dynamic pages and SPA navigation
Extraction is a snapshot at call time. `watchForChanges` notifies the caller (debounced, 250 ms default, max wait 2 s) after DOM mutations that can change visible text (childList, characterData, style/class/hidden/open/aria attributes), and after `popstate`/`hashchange`. `history.pushState` itself is **not** observable without patching page globals, which we refuse to do; SPA route changes are seen through the DOM mutations they cause. It never re-extracts on its own. Measured: 2,000 mutations produced 1 notification. Tested: a modal revealed by a click is invisible before the click and detected after it.

### 3.9 What the extractor cannot observe (by design or limitation)
- Text drawn in images (only `alt` is read), `<canvas>`, video or audio.
- CSS generated content (`::before`/`::after { content }`).
- Clipboard payloads that exist only inside JavaScript (e.g. `navigator.clipboard.writeText("…")` in a script). Scripts are not read.
- Cross-origin iframes, and closed shadow roots without the adapter.
- Visually hidden text that still has a box: text colored like its background, text covered by another element (z-order occlusion), text clipped by a scroll container. All of these count as **visible**.
- Content that appears after the snapshot (timers, later interactions). `watchForChanges` only signals that a rescan may be needed.
- Pages beyond the budgets: very large pages are truncated at 5,000 blocks (measured on the synthetic shop and table pages).
- SVG `<text>` is walked but untested.

### 3.10 Complete vs partial scans (D-033)
A scan is **complete** when `scanStatus(result.coverage).reasons` is empty. That means complete *as far as VEILTRACE can observe*: the gaps listed in §3.9 (images, canvas, JS-only payloads, occluded text, later content) are never visible to it and are not reported per page. Otherwise the scan is **partial**, and the reasons say why:

| Reason | Meaning | Effect |
|---|---|---|
| `node-budget` / `block-budget` / `char-budget` | Walk stopped at a budget | Content after the stop point was not analyzed |
| `timeout` | Walk stopped at `timeBudgetMs` | Same |
| `block-text-capped` | One or more blocks longer than 2,000 chars were cut | The tail of those blocks was not analyzed; the walk continued |
| `aux-capped` | More than 200 copy triggers or hidden payloads | Extra ones were ignored |
| `frames-skipped` | Cross-origin (or otherwise inaccessible) iframes | Their content was not analyzed |
| `closed-shadow-skipped` | Likely closed shadow roots without an adapter (heuristic) | Their content was not analyzed |
| `core-truncated` | The core's own input bounds dropped blocks or characters | Same |

Findings are computed only on what was extracted, and partial status never changes a finding (tested). **Absence of a finding on a partial scan says nothing about the unscanned part.** The M3 UI must show partial status and reasons next to the verdict (PRODUCT_SPEC.md §5).

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
  ctx?: { pre?: boolean; code?: boolean; quote?: boolean; article?: boolean; dialog?: boolean; form?: boolean; ugc?: boolean; overlay?: boolean };
  headingContext?: string | null; // latest visible h1–h3 in the same container
}
interface HiddenCopyCandidate { id: string; text: string; containerId: string; afterBlockId?: string; via: 'input' | 'data-attr' | 'hidden-el'; locator?: string }
interface CopyTrigger { id: string; label: string; containerId: string; afterBlockId?: string; locator?: string }
```

`locator` is opaque to the core. It is carried through so a browser adapter can highlight the element later (M3). The core does **not** implement highlighting.

Unit-test fixtures are written directly as snapshots. The M2 extractor produces the same shape from real DOM. The geometry fields (`box`, `positioned`) proposed at M0 were **not** added: the extractor classifies overlays itself and sets `ctx.overlay` and the `overlay:` container instead. Raw geometry can be added if M4's `C.OVERLAY` needs it.

## 5. Technology choices

| Concern | Proposal | Rationale | Alternative |
|---|---|---|---|
| Language | TypeScript (strict) | Typed contracts between extractor, core and UI | — |
| Build | **esbuild via a small `scripts/build.mjs`** **(pending D-006)** | Two outputs: popup (ESM) and extractor (**IIFE**: `executeScript` files must be classic scripts). No dev server needed. Fewer config layers | Vite (fine for the popup, but the IIFE extractor needs a second lib build). Revisit if UI complexity grows |
| UI | Plain DOM + CSS, no framework | The popup is one list + detail view. Zero runtime deps | Preact if needed later |
| Unit tests | Vitest | Fast and TS-native | node:test |
| DOM tests | Not used: every extractor test runs in real Chromium (layout-dependent visibility) | — | happy-dom/jsdom (no layout) |
| Real rendering | **Playwright 1.64.1 (Chromium headless shell 156)**, used through its library API from Vitest | Visibility and geometry need a real layout engine. M3 will also load the unpacked extension for e2e | `@playwright/test` runner (not needed so far) |
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

- Measured at M2 (`npm run eval -- perf`, `eval/results/perf.json`, development MacBook, Chromium headless shell 156):
  - On dev fixtures, total scan p50/p95 ≈ 1.3/2 ms.
  - On large synthetic pages (1.8k–15k elements), extraction is 5–118 ms and analysis 29–139 ms, for a total p50 of 34–224 ms.
  - Snapshots are up to 1.2 MB of JSON. The shop and table pages hit the 5,000-block budget.
- **Analysis dominates on large pages:** 115 lexicon regexes run on every block. The optimization candidate is a cheap prefilter (keyword set) before the regex pass (M4).
- `getComputedStyle` is called once per element. `Range.getClientRects()` runs once per non-empty text node.
- Budgets are in §3.7. The M4 acceptance criterion still requires a p95 on fixtures and on ≥ 3 large real pages saved locally (not done in M2: no third-party page content is stored in the repo).

## 9. Security of the extension (summary; details in PRIVACY_SECURITY.md)

- Isolated world only. The MVP never injects into the MAIN world.
- No message listeners exposed to pages.
- Page-derived strings are rendered with `textContent` only.
- No eval, no remote code, no network.

## 10. Evaluation harness (src/eval, Node-only, never shipped)

- `npm run eval -- validate|manifest|run|research|perf` (see `src/eval/cli.ts` header). It is bundled on the fly by `scripts/eval.mjs` with esbuild.
- **Offline serving:** each scenario's pages are served at fictional `https://*.example|*.test` URLs through Playwright request interception. Every other request is aborted and counted, and scans must produce 0 requests.
- **Pipeline per scenario:** load → scripted clicks (`steps`) → in-page extraction → one `PageSnapshot` → every system (`veiltrace`, `B0`, ablations A1/A2, dev-only research variants) analyzes **the same snapshot**. For true positives, evidence locators are resolved in the live page and checked against `evidenceWithin` (crossing shadow and frame boundaries).
- **Outputs:** `eval/results/<split>.json` (deterministic, byte-identical across runs), `<split>.perf.json` (timings), `<split>.md` (summary), `dev.research.*` and `perf.json`.
- `tsconfig.json` (core: no DOM, no Node types), `tsconfig.extract.json` (DOM, no Node) and `tests/tsconfig.json` (everything) keep the type boundaries honest.

