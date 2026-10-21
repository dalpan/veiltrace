# Manual production validation (M3)

This checklist uses the **production** build (`dist/extension`) loaded unpacked in **stable Google Chrome**. It covers what Playwright cannot automate, chiefly the real toolbar click that grants `activeTab` (the E2E tests use the separate test build, D-038). Record a result for every row; a row is "passed" only when a person confirms it.

## Setup (offline after `npm ci`)
1. `npm ci && npm run build:ext && npm run manual:fixtures`
2. Start two local origins in separate terminals:
   - `python3 -m http.server 8080 -d dist/manual`
   - `python3 -m http.server 8081 -d dist/manual` (second origin, for the iframe case)
3. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/extension`.
4. Pin VeilTrace via the puzzle-piece menu so its toolbar button is visible.

## Checklist
| # | Step | Expected |
|---|---|---|
| M1 | On `chrome://extensions`, open VeilTrace → **Details** | Name "VeilTrace" (not "TEST BUILD"), version 0.3.0, no errors. **Permissions** section is empty. **Site access** shows Chrome's generic text ("This extension can read and change your data on sites. You can control which sites…") with the "Automatically allow access on the following sites" toggle, but **no sites are listed** (observed on stable Chrome, 2026-10-21; this is how Chrome presents an activeTab-only extension, not an all-sites grant). |
| M2 | Open `http://localhost:8080/D01-en-blog-security-check-overlay/` → click the VeilTrace toolbar button | The popup opens showing page `localhost:8080` and a **Scan page** button. Nothing is analyzed yet. |
| M3 | Click **Scan page** | "Manipulative instruction detected", rule R1, confidence high, ≥ 3 evidence snippets, "Complete scan". |
| M4 | Back on `chrome://extensions` → VeilTrace → Details | Still no site access listed: the scan worked without persistent host permissions. |
| M5 | Open `http://localhost:8080/D16-en-vendor-install-script/` → toolbar button → **Scan page** | "No suspicious instructions detected in the analyzed content."; the collapsed "Observed instructions without manipulation signs (1)". The word "safe" does not appear. |
| M6 | On D01 (re-scan if needed), click **Show on page** on the "Open Run / terminal" evidence | The popup reports "Highlighted on the page." and the page shows an amber box around the step. Clicking the page closes the popup. |
| M7 | Open the page console first (F12), then repeat M6 and immediately run `document.querySelectorAll('[data-veiltrace-highlight]').length`, then run it again after ~6 s | First result `1`, second `0`. Cleanup also happens with the popup closed. The box contains no text (`document.querySelector('[data-veiltrace-highlight]').textContent === ''`). |
| M8 | Re-scan D01 → in the page console run `document.getElementById('gate').remove()` → in the popup click **Show on page** | "This element is no longer on the page…" (no false success, no box). |
| M9 | Open `http://localhost:8080/large.html` → scan | Yellow **"Partial scan: some content was not examined"** with "Only the first 5,000 text blocks were analyzed." |
| M10 | Open `http://localhost:8080/cross-origin.html` → scan | Partial scan: "Embedded frames from other sites could not be examined." No finding is claimed for the iframe lure. |
| M11 | Open `chrome://settings` → toolbar button | "This page cannot be scanned"; Scan button disabled. |
| M12 | On D01: F12 → Network tab (Preserve log) and right-click the popup → **Inspect** → Network; then scan and use Show on page | No requests caused by VeilTrace in either panel. The page itself made its requests before the scan. |

## Notes
- `file://` pages need "Allow access to file URLs" on the extension card; otherwise the popup explains this.
- The popup is 400 px wide and narrows on small viewports (Firefox Android adaptation is M5 and untested).
