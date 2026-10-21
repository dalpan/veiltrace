# Architecture

Status: updated at M3; engine default updated at M4.3A (`analyze(snapshot)` = engine 0.2.0, ruleset `m4.1`; M1 via `{ ruleset: 'm1' }`, D-055). **Implemented:** the pure core (`src/core`, §1, M1), the `PageSnapshot` types (§4), the DOM extractor and change watcher (`src/extract`, §3, M2), the offline evaluation harness (`src/eval`, §10, M2), the Chromium MV3 extension with popup, isolated-world scanning and evidence highlighting (`src/extension`, §2, §6, §9, §11, M3), and the toolchain (§5). **Planned, not implemented:** Firefox desktop/Android (§7, M5), auto-scan, settings and storage (M6), and the "Copy report" action (PRODUCT_SPEC.md §5).

## 1. Principles that shape the architecture

- **The core is a pure function:** `analyze(snapshot: PageSnapshot): AnalysisResult`. It has no DOM globals, no `chrome`/`browser`, no I/O and no clock. It runs identically in the popup, in Node (unit tests, evaluation harness) and later in Firefox.
- **One boundary object:** `PageSnapshot` is a JSON-serializable description of the visible page. It is produced by the extractor, which is the only code that touches a live DOM.
- **On-demand by default:** nothing runs on a page until the user clicks the toolbar action (`activeTab`). There is no persistent content script, no background service worker and no storage of page content in the MVP **(pending D-004)**.

## 2. Components (implemented in M3)

```
 user clicks the toolbar button → popup opens (activeTab granted for this tab)
┌──────────── popup (extension page, CSP: script-src 'self'; connect-src 'none') ─────────────┐
│ popup.ts   ── UI: Scan page, progress, verdict, findings, evidence, complete/partial status  │
│ adapter.ts ── the only chrome.* user: tabs.query, scripting.executeScript (world: ISOLATED)  │
│ validate.ts── strict schema/enum/length validation of everything returned from the tab      │
└──────────────┬──────────────────────────────────────────────────────────────────────────────┘
               │ 1. probe: is VeiltraceContent loaded?   2. files: ['content.js'] if not
               │ 3. func: VeiltraceContent.scan() → ScanReport (minimal)
               │ 4. func: VeiltraceContent.show(locator, ms) → HighlightResult
┌──────────────▼───────────── active tab, ISOLATED world (invisible to page scripts) ─────────┐
│ content.js (IIFE, global VeiltraceContent in the isolated world only)                        │
│   extractSnapshot(document, { getShadowRoot: chrome.dom.openOrClosedShadowRoot })  src/extract│
│   analyze(snapshot)                                                                src/core  │
│   buildReport(): verdict, findings, evidence snippets + locators, coverage, counts          │
│   highlight(): validated locator → resolve → scroll → temporary overlay box                  │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Detection runs in the tab's isolated world.** Only the minimal `ScanReport` crosses to the popup (D-036). It holds no snapshot, and only the evidence text of reported findings, each capped at 300 characters.
- **No background service worker, no content scripts in the manifest, no messaging** (`runtime.onMessage`/`externally_connectable` are absent and lint-banned; D-035). Pages therefore have no channel to impersonate extension messages. Data returns only as `executeScript` results, and the popup validates it (`parseScanReport`).
- `VeiltraceContent` lives in the extension's isolated world. Page-defined globals of the same name are invisible to it; this is tested with a spoofing page.
- `src/core`, `src/extract` and `src/extension/content/report.ts` are shared, unchanged and browser-independent. Only `adapter.ts` and `content/index.ts` touch `chrome.*`.

Why no background worker: the popup calls `chrome.scripting.executeScript` directly once `activeTab` is granted. That removes service-worker lifecycle bugs, avoids the Firefox-Android service-worker gap and shrinks the attack surface (D-005, confirmed in M3).

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
- **Closed shadow roots** cannot be read from page context. `options.getShadowRoot` accepts an adapter (M3: `chrome.dom.openOrClosedShadowRoot`, Chrome 88+). This was verified with a simulated adapter in M2, and with the real API from the extension's isolated world in M3 (E2E test: a lure inside a closed shadow root is detected and the scan is complete). Without an adapter, `coverage.closedShadowRootsSkipped` counts *likely* closed hosts: rendered custom elements with no light-DOM children. This is a heuristic.
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

## 6. Manifest (implemented in M3, `src/extension/manifest.json`)

```json
{
  "manifest_version": 3,
  "name": "VeilTrace",
  "version": "0.4.0",
  "minimum_chrome_version": "110",
  "action": { "default_title": "VeilTrace: scan this page", "default_popup": "popup.html", "default_icon": { "16": "…", "32": "…", "48": "…", "128": "…" } },
  "icons": { … },
  "permissions": ["activeTab", "scripting"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; base-uri 'none'; connect-src 'none'; form-action 'none'"
  }
}
```

- `activeTab` shows **no install-time warning** and grants temporary access to the active tab after the toolbar click. Chrome never grants it on `chrome://` pages, the Web Store or other extensions; the popup detects those (URL withheld or restricted scheme) and does not attempt a scan.
- `connect-src 'none'` is **accepted by Chrome** (verified at M3): the extension loads, and `fetch` from the popup is blocked (E2E test).
- No `host_permissions`, `content_scripts`, `background`, `web_accessible_resources`, `externally_connectable`, `tabs`, `storage`, `webRequest`, `clipboard*` or `notifications`. A test asserts all of these absences against the built production manifest.
- **Test build** (`dist/extension-test`, D-013/D-038): adds `host_permissions: ["https://*.test/*", "https://*.example/*"]` for the fictional fixture hosts, the name "VeilTrace (TEST BUILD)", and `?tab=` targeting compiled in with `__VT_TEST__=true`. The production popup bundle contains no trace of the test path (asserted).

## 7. Cross-browser plan

- Firefox desktop (MV3): the same approach. `scripting` + `activeTab` are supported. Needs `browser_specific_settings.gecko.id`.
- Firefox for Android: Extension Workshop recommends MV2 for Android and states that background service workers are unsupported. Our MVP has no background, which removes the main blocker. **M5 spike** must verify `activeTab` + `scripting.executeScript` from the popup on Fenix, and whether host-permission UX differs (Android does not visually indicate pending host-permission requests).
- The core and extractor are browser-agnostic by construction. Only `src/extension/adapter.ts` differs.

## 8. Performance considerations

- Measured at M2 (`npm run eval -- perf`, `eval/results/perf.json`, development MacBook, Chromium headless shell 156):
  - On dev fixtures, total scan p50/p95 ≈ 1.3/2 ms.
  - On large synthetic pages (1.8k–15k elements), extraction is 5–118 ms and analysis 29–139 ms, for a total p50 of 34–224 ms.
  - Snapshots are up to 1.2 MB of JSON. The shop and table pages hit the 5,000-block budget.
- **Extension end-to-end (M3**, TEST build, headless Chromium, `eval/results/extension-perf.json`, not committed):
  - First scan, including injection of `content.js` (75 KB): **31–57 ms** on dev fixture pages and **64–211 ms** on the large synthetic pages. Injection takes 14–30 ms, transfer to the popup < 1 ms (13 ms once), and render < 10 ms.
  - Extraction under real extension conditions peaks at **141 ms** (3,000-row table), far below the 1,500 ms budget (D-027 remains provisional until measured on slower hardware).
  - The shop and table pages report `block-budget` partial scans in the popup.
- **Re-measured at M4.2** (v0.4.0, Indonesian-capable popup): first scan 33–69 ms on fixtures and 63–221 ms on large synthetic pages; peak extraction 143 ms. The UI change added no measurable cost.
- **Extraction budget (1,500 ms, D-027 provisional):** it is checked every 256 visited nodes, so the walk can overrun the budget by at most that many nodes. It only bounds extraction, not analysis (≈ 100 ms on the largest pages) or injection. The budget has never been reached on the test pages; slower hardware is untested.
- **Analysis dominates on large pages:** 115 lexicon regexes run on every block. The optimization candidate is a cheap prefilter (keyword set) before the regex pass (M4).
- `getComputedStyle` is called once per element. `Range.getClientRects()` runs once per non-empty text node.
- Budgets are in §3.7. The M4 acceptance criterion still requires a p95 on fixtures and on ≥ 3 large real pages saved locally (not done in M2: no third-party page content is stored in the repo).

## 9. Security of the extension (summary; verification in PRIVACY_SECURITY.md §7)

- Isolated world only. The MAIN world is never used.
- No messaging surface: no listeners, no `sendMessage`, no `externally_connectable` (lint-enforced).
- Page-derived strings are rendered only as text nodes. HTML sinks (`innerHTML`, `insertAdjacentHTML`, `document.write`, `DOMParser`) are lint-banned in `src/extension`. An E2E XSS test uses hostile page text.
- Locators returned to the page for highlighting must match the extractor's locator grammar (`isSafeLocator`), so they can never become arbitrary selectors.
- No eval, no remote code, no network (popup CSP `connect-src 'none'`, plus a bundle scan in tests).
- Highlighting adds one extension-owned overlay element styled through CSSOM, which survives page `style-src` CSP. It never modifies the evidence element, never clicks or focuses, and removes itself after 5 s (1.5 s in the test build).

## 10. Evaluation harness (src/eval, Node-only, never shipped)

- `npm run eval -- validate|manifest|run|research|perf` (see `src/eval/cli.ts` header). It is bundled on the fly by `scripts/eval.mjs` with esbuild.
- **Offline serving:** each scenario's pages are served at fictional `https://*.example|*.test` URLs through Playwright request interception. Every other request is aborted and counted, and scans must produce 0 requests.
- **Pipeline per scenario:** load → scripted clicks (`steps`) → in-page extraction → one `PageSnapshot` → every system (`veiltrace`, `B0`, ablations A1/A2, dev-only research variants) analyzes **the same snapshot**. For true positives, evidence locators are resolved in the live page and checked against `evidenceWithin` (crossing shadow and frame boundaries).
- **Outputs:** `eval/results/<split>.json` (deterministic, byte-identical across runs), `<split>.perf.json` (timings), `<split>.md` (summary), `dev.research.*` and `perf.json`.
- `tsconfig.json` (core: no DOM, no Node types), `tsconfig.extract.json` (DOM, no Node) and `tests/tsconfig.json` (everything) keep the type boundaries honest.

## 11. Extension behavior details (M3)

**Scan flow.** On the click: probe → inject `content.js` if absent → `scan()` → validate → render.
- The popup records timings in `data-timing`: injection, call, extraction, analysis, transfer, render and total.
- A rescan after a page change reuses the injected script. After navigation the probe fails and the script is injected again.

**Failure states shown to the user:**
- No tab.
- Protected page: restricted scheme or URL withheld by Chrome.
- `file://` without "Allow access to file URLs".
- Injection or tab failure.
- Malformed report: discarded and never rendered.

**Highlight outcomes** (`HighlightResult.status`; the popup never claims a highlight it did not draw):

| Status | When | Shown to the user |
|---|---|---|
| `highlighted` | Locator resolved and the element is rendered | "Highlighted on the page." |
| `not-found` | Stale locator (element removed or the page re-rendered) | Explains that the page changed and suggests rescanning |
| `not-visible` | Element exists but has no visible box (e.g. off-screen textarea holding a staged clipboard payload) | Says it is hidden clipboard text |
| `frame-inaccessible` | Locator crosses a frame that no longer resolves | Says the frame cannot be highlighted |
| `invalid-locator` | Locator fails the grammar check, or the evidence has no locator | Button disabled with explanation |
| `failed` (popup-side) | `executeScript` failed (tab closed or navigated to a protected page) | Asks the user to scan again |

**Highlight geometry.**
- Elements inside fixed-position containers (typical lure overlays) get a `position: fixed` box; other elements get an absolutely positioned box in document coordinates.
- Same-origin frame elements are offset by the frame's position.
- Limitations: the box does not follow later layout changes or animations; elements inside a frame that is itself inside a fixed container may be misplaced; transformed or clipped ancestors are not accounted for.

**UI language (M4.2, D-049).** The popup renders all text from bundled EN/ID dictionaries. It selects Indonesian when `chrome.i18n.getUILanguage()` is Indonesian; EN/ID buttons switch for the session and re-render from popup state without rescanning. Evidence snippets are page text and stay untranslated (inserted as text nodes with `lang=""`).

**Closed shadow roots.** In the isolated world, `chrome.dom.openOrClosedShadowRoot` is available. Closed-root content is extracted, and a lure inside one is detected (E2E-verified). This resolves the M2 open item.

