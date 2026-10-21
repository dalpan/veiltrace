# Privacy & Security

Status: M0 commitments, partially verified at M1. Each one has a verification method that must hold before any release. **M1 (core only):** zero runtime dependencies, and a test asserts the esbuild core bundle contains no network or dynamic-code identifiers. The extension-level checks (P1 b/c, P4) apply from M3, when an extension exists.

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
