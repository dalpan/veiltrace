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
Since v0.4.0 the popup follows the browser UI language. In an Indonesian browser it appears in Indonesian (e.g. "Pindai halaman", "Instruksi manipulatif terdeteksi", "Pemindaian sebagian"). Use the **EN** button to compare against the English strings below, or **ID** to check the Indonesian ones.
| # | Step | Expected |
|---|---|---|
| M1 | On `chrome://extensions`, open VeilTrace → **Details** | Name "VeilTrace" (not "TEST BUILD"), version 0.4.0, no errors. **Permissions** section is empty. **Site access** shows Chrome's generic text ("This extension can read and change your data on sites. You can control which sites…") with the "Automatically allow access on the following sites" toggle, but **no sites are listed** (observed on stable Chrome, 2026-10-21; this is how Chrome presents an activeTab-only extension, not an all-sites grant). |
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

## v0.4.0 compatibility checklist (Chrome stable): not yet executed

Build: `npm run release:candidate && npm run release:verify` from a clean commit (or `npm run release` for a development build), then unzip the ZIP into a folder and **Load unpacked** that folder. Serve the pages with `npm run manual:fixtures` and the two `python3 -m http.server` commands above. A row counts as passed only when the owner confirms it.

| # | Area | Step | Expected |
|---|---|---|---|
| C1 | Permissions | Extension Details | Version 0.4.0; Permissions empty; no sites listed under Site access |
| C2 | Language (Indonesian browser) | Open D01 → toolbar button | Popup in Indonesian: "Pindai halaman", page label "HALAMAN". Nothing scanned yet |
| C3 | On-demand scanning | Click **Pindai halaman** | "Instruksi manipulatif terdeteksi", "Aturan R1", "Pemindaian lengkap"; evidence snippets stay in English as on the page |
| C4 | Language switching | Click **EN**, then **ID** | Whole popup switches; verdict and evidence unchanged; no rescan |
| C5 | Benign example | D16 → scan | "Tidak ada instruksi mencurigakan di konten yang dianalisis." (EN: "No suspicious instructions detected in the analyzed content."); one observed instruction |
| C6 | Indonesian page | Serve `corpus/dev` (`python3 -m http.server 8082 -d corpus/dev`) → `D06-id-recipe-comment-lure/` → scan | Manipulative; Indonesian evidence ("verifikasi manusia", "Win + R") |
| C7 | Partial scan | `large.html` → scan | "Pemindaian sebagian…" with the 5,000-block reason (EN: "Partial scan…") |
| C8 | Partial scan (frames) | `cross-origin.html` → scan | Frames-from-other-sites reason; no finding claimed for the iframe |
| C9 | Evidence highlighting | D01 → **Tunjukkan di halaman** | Amber box on the page; "Ditandai di halaman."; the box disappears after ~5 s |
| C10 | Stale evidence | D01 → console `document.getElementById('gate').remove()` → Tunjukkan di halaman | "Elemen ini sudah tidak ada di halaman…"; no box |
| C11 | Restricted page | `chrome://settings` → toolbar button | "Halaman ini tidak dapat dipindai"; button disabled |
| C12 | Offline | Turn off Wi-Fi/network, then repeat C3 and C9 | Same results; DevTools Network (page and popup) shows no VeilTrace requests |

