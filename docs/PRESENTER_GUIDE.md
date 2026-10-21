# Presenter Guide: VeilTrace Hackathon Demo (M4.4)

For the person presenting VeilTrace v0.5.0 (engine 0.2.0, ruleset `m4.1`). Everything runs offline on the presenter's laptop. The demo uses the **frozen, evaluated engine** with no demo-specific code, and the numbers quoted are the recorded held-out results.

**Ground rules for what you say**
- Say "detects", "flags" or "shows evidence". Never say "safe", "protected", "blocks", "real-time" or "guaranteed".
- Quote the held-out numbers exactly (§7), including that three targets were missed.
- The demo site is fictional and its lure uses common public lure wording that the engine is known to catch. It shows **how** VeilTrace works, not how accurate it is.
- Do not describe VeilTrace as certified, military-grade or endorsed by any organization (D-048).

## 1. Setup (once, before the session)

1. Build and verify the release (from a clean commit), then unzip it to a fixed folder:
   ```
   npm ci
   npm run release:candidate && npm run release:verify
   rm -rf ~/veiltrace-demo && mkdir ~/veiltrace-demo && unzip -q release/veiltrace-chromium-0.5.0.zip -d ~/veiltrace-demo
   ```
2. Write the demo and fixture pages: `npm run manual:fixtures` (to `dist/manual`, including `dist/manual/demo`).
3. Start two local servers in two terminals and keep them running (stop them later with **Ctrl+C**, not Ctrl+Z):
   ```
   python3 -m http.server 8080 -d dist/manual
   python3 -m http.server 8081 -d dist/manual
   ```
4. Chrome → `chrome://extensions` → Developer mode → remove older VeilTrace copies → **Load unpacked** → `~/veiltrace-demo` → pin VeilTrace.
5. Open these tabs in order. Turn Wi-Fi off once everything is loaded:

| Tab | URL | Purpose |
|---|---|---|
| 1 | `http://localhost:8080/demo/` | Main demo: help-center page with the community lure |
| 2 | `http://localhost:8080/demo/benign.html` | Same page, ordinary community answer |
| 3 | `http://localhost:8080/demo/cli.html` | Benign procedural instruction (developer docs) |
| 4 | `http://127.0.0.1:8080/demo/` | Same file as tab 1 under a different hostname (domain invariance) |
| 5 | `http://localhost:8080/D45-en-concealed-payload-edu-cue/` | Contextual override (dev fixture) |
| 6 | `http://localhost:8080/cross-origin.html` | Partial scan (cross-origin frame) |

**Build note:** the strings quoted in this guide are from the v0.5.0 popup. A development build from M5.4 or later shows the unified dashboard instead (headline "Manipulative content detected", category tiles, F-/E- ids; DEMO.md D1–D8); the flow and the numbers in §7 are unchanged.

**Pre-flight (2 minutes before):** scan tab 1 once to confirm "Manipulative instruction detected" and "Engine 0.2.0" in the footer, then close the popup. Set the zoom so the community widget is visible without scrolling.

## 2. What the demo page is

"Nusaverta" is a fictional invoicing company. Its help center (`demo/nusaverta/index.html`) is an ordinary article ("Export invoices to CSV") with a **third-party "Community answers" widget** in the right column, labelled "posted by other customers · not reviewed by Nusaverta". One community post, from an account that *looks like* support, says an attachment is locked and asks the reader to "Verify you are human" by pressing **Windows + R, Ctrl + V, Enter**. This is the ClickFix pattern on a legitimate-looking site (threat class T7).

The page has no JavaScript. Nothing is copied, downloaded or run. The hidden command text points to a `.invalid` host. The trust boundaries and safety controls are in THREAT_MODEL.md §8.

## 3. Three-minute version

| Time | Do | Say (key points) |
|---|---|---|
| 0:00–0:25 | Tab 1. Point at the header, then the community widget | "A normal SaaS help center. The right column is third-party content: other customers write it, and the company doesn't review it. One post asks you to *verify you are human*: Windows+R, Ctrl+V, Enter. That is ClickFix: it makes you run an attacker's command yourself." |
| 0:25–0:50 | Click the VeilTrace button, then **Scan page** | "VeilTrace only runs when I click. It reads the visible page here on the laptop. Wi-Fi is off; nothing is sent anywhere." |
| 0:50–1:30 | Show the verdict, Rule R1, confidence, action risk and evidence. Click **Show on page** on "Windows + R" | "Manipulative instruction, rule R1: open Run, paste, execute, wrapped in a fake human check. Every claim has evidence. Show on page puts a box exactly on the post inside the community widget, not on the company's article." |
| 1:30–1:50 | Click **ID**, then **EN** | "The interface is Indonesian and English. The verdict and evidence stay the same; it does not rescan. Page text is never translated." |
| 1:50–2:15 | Tab 3 → scan | "Real docs also tell you to open a terminal and run a command. VeilTrace lists that as an *observed* instruction, not an alert, because nothing around it is manipulative." |
| 2:15–3:00 | Show the evaluation slide (§7) | "On our frozen 26-scenario synthetic test: 9 of 12 lures found, 2 false alarms on 14 hard benign pages, every true detection localized, zero network requests. We missed our recall, precision and false-positive targets, and we publish that. Known blind spots: lures disguised as quotes, and frames from other sites." |

## 4. Seven-minute version

1. **Problem (0:00–0:45).** ClickFix and fake CAPTCHAs get people to run commands themselves; they appear on legitimate sites through comments, widgets and ads, so URL reputation does not help.
2. **Main demo (0:45–2:30).** As in §3, steps 1–4, plus: open the finding and read the rule explanation; point out confidence vs. action risk ("how sure" vs. "how bad if followed").
3. **Benign contrast (2:30–3:05).** Tab 2 → scan → "No suspicious instructions detected in the analyzed content." "Same site, same widget, an ordinary answer: no alert. We never say a page is *safe*, only what we found in what we could see."
4. **Procedural docs (3:05–3:35).** Tab 3 → scan → expand "Observed instructions without manipulation signs (2)". "Two install commands, rule R5, observed only."
5. **Domain invariance (3:35–4:10).** Tab 4 (`127.0.0.1`) → scan. "Same file, different hostname, identical result. The engine never reads the URL; a trusted domain does not buy a pass, and an odd one does not cause an alert." (§5)
6. **Contextual override (4:10–5:00).** Tab 5 (D45) → scan. "This lure plants a 'Security awareness' heading to look educational, which would normally lower the result. But the same part of the page also hides a command for the clipboard, which a real tutorial never does, so VeilTrace keeps it manipulative and explains which context it set aside." Show the override block and the hidden-clipboard evidence.
7. **Partial scan (5:00–5:30).** Tab 6 → scan. "The lure here is in a frame from another site, which the browser does not let us read. VeilTrace says so (Partial scan) instead of implying the page is clean. In our held-out test, exactly this case was a miss."
8. **Privacy and permissions (5:30–5:50).** `chrome://extensions` → Details: "Two permissions: activeTab and scripting. No site access list, no storage, no network code."
9. **Evaluation and limitations (5:50–7:00).** The slide in §7, then §8.

## 5. Domain-invariance demonstration

**Claim:** the same page content produces the same result whatever the URL or hostname, because the core never reads it (ARCHITECTURE.md §1, D1).

| Comparison | Method | Expected | Observed |
|---|---|---|---|
| Unit level | `tests/analyze.test.ts` "url and title never change the result": every fixture under three different URLs/titles | Identical results | Identical (automated; passes) |
| Real extraction, 4 hosts | `tests/browser/demo.test.ts`: the same bytes of `index.html`, `benign.html` and `cli.html` served under `https://help.nusaverta.test/`, `https://portal.trusted-bank.example/help/`, `http://192.0.2.10/` and `http://localhost:8080/demo/` | Snapshots equal except `url`; analysis results deep-equal | Equal for all three pages (automated; passes): lure manipulative R1, benign none, docs observed R5 × 2 |
| Real extension, 2 hosts | `tests/e2e/demo.test.ts`: the lure page under `help.nusaverta.test` and `portal.trusted-bank.example` | Same verdict, rules and evidence; only the host label differs | Same (automated; passes) |
| Manual, Chrome stable | Tab 1 (`localhost`) vs. tab 4 (`127.0.0.1`), same server, same file | Same verdict, rule and evidence snippets | **Confirmed by the owner** (v0.5.0 checklist, DEMO.md row N8) |

Nothing differs between the compared runs except the URL: same file bytes, same engine and options, same viewport and extractor settings.

## 6. Fallbacks

- **Popup shows "This page cannot be scanned":** you are on a browser page; switch to a demo tab.
- **"VeilTrace could not access this page":** reload the tab and click the toolbar button again (activeTab is granted per click).
- **Server not responding:** `lsof -nP -iTCP:8080 -sTCP:LISTEN`; stop stale servers, restart them.
- **No laptop or extension:** use the E2E screenshots (`VT_SCREENSHOTS=dir npm run test:e2e` writes `20-demo-lure-en.png`, `21-demo-lure-id-to-en.png` and others). Say that they come from the automated test build.

## 7. Evaluation summary (one slide for the judges)

**Held-out evaluation v1: 26 synthetic scenarios, frozen before testing, run once**

| | Result | Pre-registered target | |
|---|---|---|---|
| Lures found (recall) | **9 / 12 = 75.0%** (95% CI 46.8–91.1%) | ≥ 85% | **missed** |
| Alerts that were real (precision) | **9 / 11 = 81.8%** (52.3–94.9%) | ≥ 90% | **missed** |
| False alarms on hard benign pages | **2 / 14 = 14.3%** (4.0–39.9%) | ≤ 10% | **missed** |
| True detections localized to the right element | **9 / 9** (70.1–100%) | ≥ 95% | met |
| Network requests during scanning | **0** in all 26 scenarios | 0 | met |

Confusion matrix: TP 9, FP 2, TN 12, FN 3. One scan was partial (a cross-origin frame).

Speaker notes (say these):
- Synthetic pages written by the same AI-assisted author as the rules; n = 26, so the intervals are wide. **Not real-world effectiveness; not independently validated.**
- Misses: two lures disguised as a quotation or as reported speech, and one inside a frame from another site. False alarms: an internal IT notice and a news report about fake CAPTCHAs.
- Engine 0.2.0 and the earlier M1 engine gave identical results on all 26 held-out pages; our development-set improvements did not show up there.
- Provenance: the run log carries a "dirty" marker caused by the harness writing its own output files before checking git status; the owner accepted the run as a documented post-run deviation (EVALUATION_RESULTS.md §1.1). No rerun.
- Next: a new, independently authored dataset (EVALUATION_RESULTS.md §7).

## 8. Limitations to state (do not skip)
- On-demand only: it checks a page when you click, not continuously.
- Cannot read frames from other sites, images, canvas, video, or scripts. A page in a language other than English or Indonesian simply gets no findings; there is no "unsupported language" notice yet.
- Lures disguised as quotations or reported speech can be downgraded to "observed" and missed.
- Some legitimate IT notices and news reports are flagged (false positives).
- No result means "nothing found in what was examined", never "safe".
- Checksums prove the ZIP was not altered after it was built; they do not prove who built it. Release signing is future work.

## 9. Likely questions
- **"Why not just block bad domains?"** The lure sits on a legitimate site in third-party content; domain invariance is the point (§5).
- **"Did you tune it to the demo?"** No. No code mentions the demo (a test checks this). The demo lure uses common public wording, which is exactly why we report the held-out numbers separately.
- **"Is this AI?"** No. Deterministic, explainable rules running offline.
- **"Can attackers evade it?"** Yes, in documented ways (THREAT_MODEL.md §5): quotation framing, cross-origin frames, images, unusual wording.
- **"Browsers?"** Chromium (Chrome, Edge) desktop. Firefox is planned and untested (§10).

## 10. Browser compatibility (known limits)
| Browser | Status |
|---|---|
| Google Chrome stable (macOS) | Manually validated by the owner on v0.4.0 (V1–V12) and v0.5.0 (N1–N14, DEMO.md) |
| Chromium (Playwright build 156) | Automated E2E with the test build |
| Microsoft Edge 155 | Automated smoke test at M4.2 (D-053); not re-run for v0.5.0 |
| Brave, Opera, Vivaldi; Chrome on Windows/Linux; ChromeOS | Untested |
| Firefox desktop / Android | Not supported yet (M5) |
| Branded Chrome automation | Not possible: branded Chrome ignores `--load-extension` (D-053) |
| Minimum version | Chrome 110 (`minimum_chrome_version`); older versions untested |
