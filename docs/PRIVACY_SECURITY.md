# Privacy & Security

Status: M0 commitments; verified for the core (M1), the extractor/harness (M2) and the Chromium extension (M3, §7). Each one has a verification method that must hold before any release. **M1 (core only):** zero runtime dependencies, and a test asserts the esbuild core bundle contains no network or dynamic-code identifiers. The extension-level checks (P1 b/c, P4) apply from M3, when an extension exists.

## 1. Data handling commitments

| # | Commitment | Verification |
|---|---|---|
| P1 | No page content, URL, credential, cookie, clipboard content or history leaves the device. | (a) The build artifact contains no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon` or `importScripts` (CI grep on `dist/`). (b) A Playwright e2e test records all network requests during scan + render and asserts none originate from the extension. (c) The extension-page CSP sets `connect-src 'none'`. |
| P2 | Page content is processed in memory and discarded when the popup closes. | No `storage` permission in the MVP. Review checklist item. |
| P3 | No analytics, telemetry or crash reporting. | Same as P1. |
| P4 | Analysis runs only after an explicit user gesture (toolbar click). | `activeTab` only. No `content_scripts` and no `host_permissions` in the manifest (CI manifest assertion). |
| P5 | Settings persisted in future milestones contain no page-derived data. | Schema review when `storage` is introduced (M6). |

## 2. Permission strategy (least privilege)

| Permission | Status | Justification |
|---|---|---|
| `activeTab` | **Requested** | Temporary access to the current tab after the user clicks. No install-time warning. |
| `scripting` | **Requested** | Run the extractor/highlighter in the granted tab. |
| `storage` | Not in MVP | Introduced for settings in M6, settings only. |
| `optional_host_permissions` | Not in MVP | An M6 "auto-scan on sites I choose" feature, requested at runtime via `permissions.request` per origin. |
| `<all_urls>`, `tabs`, `webRequest`, `clipboardRead`, `clipboardWrite`, `notifications`, `management`, `downloads` | **Never in MVP** | Not needed. Each would need a DECISIONS.md entry. |

For comparison (verified manifests, see COMPETITIVE_ANALYSIS.md): Nehboro, ClipShield and ClickFixMitigator all request `<all_urls>`.

## 3. Optional AI (future, not in MVP)

Allowed only if all of the following hold. It requires a DECISIONS.md entry and user approval first.
1. Off by default. Enabled per request, not globally ("Ask AI about this finding").
2. Before sending, the user sees the **exact payload** (the region text only, never the full page), with automatic redaction of emails, phone numbers, long digit runs (OTP/card), URLs' query strings and anything in form fields.
3. The provider, data retention and destination are disclosed in the UI.
4. The deterministic verdict is always shown first and never overwritten. AI output is labeled as an opinion.
5. The feature is removable at build time (a separate build flag), so the default distribution contains no network code.

## 4. Extension hardening

- **Rendering:** page-derived strings use `textContent` / `createTextNode` only. Lint rule plus CI grep forbid `innerHTML`, `outerHTML`, `insertAdjacentHTML` and `document.write` in `src/extension`.
- **No dynamic code:** no `eval`, `new Function` or string timers. MV3 CSP already blocks remote code.
- **Isolated world:** the extractor runs in the default `ISOLATED` world. The MAIN world is not used in the MVP. If runtime clipboard observation (M6+) needs MAIN-world hooks, it requires a threat-model update, because MAIN-world code shares the page's CSP and can be tampered with by the page.
- **Message surface:** no `runtime.onMessage` / `onMessageExternal` / `externally_connectable` in the MVP.
- **Input bounds:** the extractor enforces node, char and time budgets (ARCHITECTURE.md §3.7). The core enforces a maximum snapshot size before analysis.
- **Highlighting:** the highlight script adds a single attribute-styled outline and removes it on the next scan. It never injects page-visible text that claims to be from VEILTRACE (it avoids training users to trust in-page "VEILTRACE says safe" banners, which attackers can forge).
- **Repo hygiene:** `.gitignore` covers `*.pem`, `*.crx`, `*.zip` builds and `.env*`. No signing keys in the repo (contrast: a reference project committed `key.pem`).

## 5. Responsible handling of malicious samples

- The corpus contains **reconstructed** lures. Payload commands are defanged: domains → `example.invalid`, IPs → TEST-NET (`192.0.2.0/24`), and encoded blobs replaced with encodings of a harmless string. The *shape* (flags, LOLBin names) is preserved because it is the signal.
- Never load live malicious URLs in automated tests. Playwright serves fixtures from a local static server with network egress blocked (`page.route('**', …)` allow-list of localhost).
- Real-world samples (EVALUATION_PLAN.md §7) are captured manually by the researcher in an isolated VM and stored sanitized. The URL is recorded only as a source reference.

## 6. M2 verification (extractor and evaluation harness)

| Claim | Verification |
|---|---|
| The extractor does not modify the page | ESLint rule on `src/extract` bans DOM-mutating calls/assignments, event dispatch, `click`/`focus`, `eval`/`Function` and network globals (a lint probe test proves it fires). Runtime test: MutationObserver records 0, `outerHTML` unchanged, inline handlers and `javascript:` links not triggered |
| The extractor does not read secrets or user input | Tests assert that password values, `input[type=hidden]` CSRF tokens, OTP-named fields, email inputs and text typed by the user never appear in the snapshot JSON (D-025) |
| No network access during scanning | The bundle check finds no `fetch`/XHR/WebSocket/`sendBeacon`/`EventSource`/`eval` in the extractor IIFE. Harness and tests route every request and count the ones during scanning: 0 across 36 dev scenarios, all browser tests and the perf pages |
| Fixtures make no network requests | `validate` fails a scenario that requests anything outside its own pages. 0 found in dev and test |
| No live malicious content | Fictional `.example`/`.test` hosts, `.invalid` payload hosts, harmless base64 |
| Tooling network use | Only at install time: `npm install` (Playwright 1.64.1) and `npx playwright install chromium` (Chromium headless shell). Tests and evaluation run fully offline |

Residual: the extractor runs in the page's **main world** in tests (`page.evaluate`). In the M3 extension it runs in an **isolated world**, which must be re-verified there (closed shadow adapter, CSP, no page access to extension state).

## 7. M3 verification (Chromium extension; real extension loaded in Playwright)

| Claim | Verification (tests/e2e/security.test.ts unless noted) |
|---|---|
| Production permissions are exactly `activeTab` + `scripting` | Built manifest assertion. Also `chrome.permissions.getAll()` in the installed production extension returns `{ permissions: ['activeTab','scripting'], origins: [] }` |
| Test-only permissions never ship | The production manifest has no `host_permissions`. The production `popup.js` contains no `?tab=` targeting code (`URLSearchParams` absent). Only `dist/extension-test` carries host permissions for `*.test`/`*.example` |
| No access without a user gesture | From the installed production extension, `chrome.scripting.executeScript` on an ordinary page is **refused** without the activeTab grant |
| No network during scanning or highlighting | Request log unchanged across scan + highlight. Popup CSP `connect-src 'none'` blocks `fetch` (tested). The bundles contain no `fetch`/XHR/WebSocket/`sendBeacon`/`eval`/`new Function`/`innerHTML`/messaging identifiers |
| Hostile page text cannot execute in the popup | Lure text containing `<img onerror>`, `<script>` and `<svg onload>` renders literally. No elements are created from it, no dialogs, title unchanged |
| Pages cannot impersonate the extension | No messaging surface (lint + bundle check). A page that defines `window.VeiltraceContent`/`VeiltraceExtractor` and floods `postMessage` does not affect the isolated-world scan. The page has no `chrome.runtime.sendMessage` channel |
| Raw snapshots never leave the tab | `buildReport` sends only findings' evidence (≤ 300 chars each), coverage and counts. A unit test asserts that unrelated page text is absent from the report (tests/extension.test.ts) |
| Data crossing the API boundary is validated | `parseScanReport` rejects wrong versions, unknown enums, oversize strings and arrays, negative counts, and drops locators that fail the grammar (tests/extension.test.ts) |
| Highlight does not alter the page's own content | The evidence element's attributes and `outerHTML`, input values and click handlers are unchanged. The overlay is removed after its timeout (tests/e2e/extension.test.ts) |
| Pages with strict CSP | Scan and highlight work under `default-src 'none'; style-src 'none'; script-src 'none'` (CSSOM styling) |
| No persistence | The manifest has no `storage` permission and no extension storage API is used |

**Residual/untested:**
- The real toolbar click that grants `activeTab` cannot be automated in Playwright; it is covered by the manual checklist in `docs/DEMO.md`.
- Chrome on other OSes and the non-headless UI were not tested.
- The overlay element is visible to page scripts (they could detect or remove it). It contains no text and no extension data.

