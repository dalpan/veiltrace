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

## v0.4.0 checklist (engine 0.2.0, bilingual UI): confirmed by the owner

The owner confirmed on 2026-10-21 that the guided walkthrough V1–V12, which covers categories A–D below except D3 (optional V13, not reported), passed on Chrome stable with the candidate ZIP of `03fa212`.

Build: `npm run release:candidate && npm run release:verify` from a clean commit (or `npm run release` for a development build), unzip the ZIP into an empty folder and **Load unpacked** that folder. Serve the pages with `npm run manual:fixtures` and the two `python3 -m http.server` commands above (D06, D17, D27 and D45 are included in `dist/manual`). A row counts as passed **only when the owner confirms it**.

Engine 0.2.0 (D-055) changes three things a person can see: procedural troubleshooting pages are now *observed* instead of *suspicious*, a hidden clipboard payload next to an educational cue is now *manipulative* with an explanation of why the context was set aside, and the footer reads "Engine 0.2.0".

### Category A: confirmed in M3 (v0.3.0), owner-confirmed 2026-10-21
M1–M12 above passed on v0.3.0 (engine 0.1.0, English UI). They are not automatically valid for v0.4.0; rows A1–A3 are the subset whose behavior did not change and that should still be spot-checked once.

| # | Step | Expected |
|---|---|---|
| A1 | Extension Details (as M1/M4) | Version 0.4.0; Permissions empty; no sites listed under Site access, before and after a scan |
| A2 | M7 (highlight cleanup) | `1` then `0` after ~6 s; overlay has no text |
| A3 | M12 (network) | No requests caused by VeilTrace in the page or popup Network panel |

### Category B: repeat because of the bilingual UI
| # | Step | Expected |
|---|---|---|
| B1 | Indonesian Chrome UI: D01 → toolbar button | Popup in Indonesian: "Pindai halaman", label "HALAMAN"; nothing scanned yet |
| B2 | Click **Pindai halaman** | "Instruksi manipulatif terdeteksi", "Aturan R1", "Pemindaian lengkap"; evidence stays in English, as on the page |
| B3 | Click **EN**, then **ID** | Whole popup switches; verdict, evidence and highlight statuses unchanged; no rescan |
| B4 | D06 (Indonesian page) → scan | Manipulative; Indonesian evidence ("verifikasi manusia", "Win + R") shown untranslated |
| B5 | `large.html` → scan | "Pemindaian sebagian…" with the 5,000-block reason |
| B6 | `cross-origin.html` → scan | Frames-from-other-sites reason; no finding claimed for the iframe |
| B7 | D01 → **Tunjukkan di halaman** | Amber box; "Ditandai di halaman."; box disappears after ~5 s |
| B8 | D01 → console `document.getElementById('gate').remove()` → **Tunjukkan di halaman** | "Elemen ini sudah tidak ada di halaman…"; no box |
| B9 | `chrome://settings` → toolbar button | "Halaman ini tidak dapat dipindai"; button disabled |

### Category C: repeat because the engine changed (0.1.0 → 0.2.0)
| # | Step | Expected |
|---|---|---|
| C1 | Any scan → popup footer | "Engine 0.2.0 · extractor 0.1.0-m2 · … · on this device only" |
| C2 | D16 → scan (as M5) | "No suspicious instructions detected in the analyzed content."; one observed instruction; the words "safe"/"aman" do not appear |
| C3 | D17 → scan (EN) | Headline "No suspicious instructions detected…"; under the collapsed observed section: "Observed", "Confidence: low", "Action risk: high…", "Lowered from suspicious because of context: the instruction is a step in a procedural document." (with v0.3.0 this page was *suspicious*) |
| C4 | D27 → scan (ID) | Same as C3 in Indonesian: "Teramati", "Keyakinan: rendah", "Diturunkan dari mencurigakan karena konteks: instruksi adalah langkah dalam dokumen prosedural." |
| C5 | D45 → scan (EN) | "Manipulative instruction detected"; an override block "Not lowered: this part of the page also places hidden text on your clipboard…", "Context set aside: …", and supporting evidence labelled as hidden clipboard text (with v0.3.0 this page was *suspicious*) |
| C6 | D45 → **ID** | Override text "Tidak diturunkan: bagian halaman ini juga menaruh teks tersembunyi di clipboard Anda…", "Konteks yang dikesampingkan: …"; the hidden payload text itself is not translated |
| C7 | D45 → **Show on page** on the hidden-clipboard evidence | Either a box or "This evidence is not visible on the page (for example, hidden clipboard text)."; never "Highlighted on the page." without a visible box |
| C8 | D01 → scan (as M3) | Unchanged from v0.3.0: manipulative, R1, confidence high |

### Category D: not yet performed on any version
| # | Step | Expected |
|---|---|---|
| D1 | Install from the **candidate ZIP** (not `dist/extension`) | Loads without errors; name "VeilTrace", version 0.4.0, no "TEST BUILD" |
| D2 | Network off (Wi-Fi off), repeat B2, B7 and C5 | Same results; DevTools Network (page and popup) shows no VeilTrace requests |
| D3 | English Chrome UI (or `--lang=en-US`) → open popup before switching | Popup starts in English |

## v0.5.0 checklist (demo site and release candidate, M4.4): confirmed by the owner

The owner confirmed on 2026-10-21 that rows N1–N14 passed on Chrome stable.

Build and serve as in docs/PRESENTER_GUIDE.md §1 (candidate ZIP `veiltrace-chromium-0.5.0.zip`; demo at `http://localhost:8080/demo/`). Version 0.5.0 changes only the version number relative to the confirmed v0.4.0 build; the engine (0.2.0) and the popup code are unchanged. **No row is passed until the owner confirms it.** For each row, record: pass/fail, date, Chrome version (`chrome://version`), screenshot file name, notes.

| # | Step | Expected | Evidence to record |
|---|---|---|---|
| N1 | `cd release && shasum -a 256 -c SHA256SUMS`; install the unzipped candidate | All `OK`; ZIP hash equals the reported candidate hash; name "VeilTrace", **version 0.5.0**, no errors, no "TEST BUILD" | Terminal output; extension card screenshot |
| N2 | Details before and after a scan | Permissions empty; no sites listed under Site access | Two screenshots |
| N3 | Open `http://localhost:8080/demo/` | Looks like an ordinary help center; the "Community answers" widget is visibly marked as third-party content; the page itself does nothing when "I'm not a robot" is clicked | Page screenshot |
| N4 | Toolbar button → **Scan page** | "Manipulative instruction detected", Rule R1, confidence high, action risk high, evidence "Verify you are human", "Windows + R", "Ctrl + V", "Press Enter", "I'm not a robot"; "Complete scan"; footer "Engine 0.2.0" | Popup screenshot with footer |
| N5 | **Show on page** on "Windows + R" | Amber box on the step inside the community widget, not on the article; disappears after ~5 s | Page screenshot while the box is visible |
| N6 | **ID**, then **EN** | Whole UI switches; verdict, evidence and the duration number in the footer stay the same (no rescan) | Two screenshots |
| N7 | `http://localhost:8080/demo/benign.html` → scan | "No suspicious instructions detected in the analyzed content."; no finding; no "safe"/"aman" | Screenshot |
| N8 | `http://127.0.0.1:8080/demo/` → scan, compare with N4 | Same verdict, rule, confidence and evidence snippets as N4; only the host label differs (domain invariance) | Two screenshots side by side |
| N9 | `http://localhost:8080/demo/cli.html` → scan → expand the observed section | Headline "No suspicious instructions detected…"; "Observed instructions without manipulation signs (2)", rule R5 | Screenshot |
| N10 | D45 → scan | As v0.4.0 C5 (override block, context set aside, hidden-clipboard evidence) | Screenshot |
| N11 | `cross-origin.html` → scan | Partial scan, frames-from-other-sites reason, no finding claimed | Screenshot |
| N12 | `chrome://settings` → toolbar button | "This page cannot be scanned"; button disabled | Screenshot |
| N13 | Wi-Fi off; DevTools Network open for the page and the popup; repeat N4, N5, N8 | Same results; no requests caused by VeilTrace; the demo page loads only `style.css` from localhost | Network panel screenshots |
| N14 | Rehearse the 3-minute script (PRESENTER_GUIDE.md §3) end to end | Finishes within 3 minutes with no failed step | Timing note |

## v0.6.0 credential section (M5.1, experimental): not yet executed

Build a development release from the M5.1 commit (`npm run release`, version 0.6.0 is a proposal, D-070) and load it unpacked. Serve `corpus/cred-dev` with `python3 -m http.server 8082 -d corpus/cred-dev` and open `http://localhost:8082/<scenario>/`. **No row is passed until the owner confirms it.**

| # | Step | Expected | Evidence to record |
|---|---|---|---|
| K1 | Extension Details | Version 0.6.0; Permissions empty; no sites listed | Screenshot |
| K2 | `CD01-en-community-otp-reply/` → scan | "Passwords and codes · Experimental" card first: "Manipulative request for a password or code detected"; Rule CR1; "Asks you to send: one-time code"; limitation "cannot verify who wrote this"; command section "No suspicious instructions…" | Popup screenshot |
| K3 | K2 → **Show on page** on "6-digit code" | Box inside the second forum reply | Page screenshot |
| K4 | `CD04-en-overlay-suspension-password-otp/` → type anything into both fields → scan | Suspicious (CR4); "The form submits to another site."; what you typed appears nowhere in the popup | Popup screenshot |
| K5 | `CN02-en-mfa-code/` → scan | "Sign-in or code requests found, without signs of manipulation." collapsed; no alert | Screenshot |
| K6 | `CD06-id-komentar-admin-kirim-otp/` in an Indonesian browser, then **EN** | Indonesian credential card, evidence untranslated; switching languages does not rescan | Two screenshots |
| K7 | `http://localhost:8080/demo/` (M4.4 demo) → scan | ClickFix result as in N4; credential card "No requests for passwords, codes or recovery phrases found…" | Screenshot |
| K8 | Wi-Fi off, DevTools Network for page and popup, repeat K2 and K4 | Same results; no requests caused by VeilTrace | Network screenshots |
