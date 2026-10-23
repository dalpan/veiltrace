# Progress Log

Newest entry first. Each entry: date, milestone, what was done, verification, what is next, blockers.

---

## 2026-10-23 · OCR: second, adaptive-threshold pass (D-105)
Preparing the video showed that text on a coloured panel in a white page was not read (global Otsu threshold). Extension and app now run two passes and merge only new lines; the 14 field screenshots keep the same 10 alerts and the poster case is read. New e2e test for the panel case and a unit test for the merge. **Next:** video and submission refresh.

---

## 2026-10-23 · Version 0.8.0 and documentation refresh
Extension version 0.8.0 (OCR, new detector classes since 0.7.0). PRODUCT_SPEC status table, README badge and release notes brought up to date; submission materials (local) refreshed to match. **Next:** owner tries "Read text in images" from the toolbar and a screenshot in the app on a phone; publishes the 0.8.0 draft release when ready.

---

## 2026-10-23 · Text in images in the extension (D-105)
Popup button "Read text in images" after a scan: visible-tab capture (activeTab, no new permission), OCR in the extension's own worker (engine and models bundled, network paths stubbed, no forbidden identifiers), page text dropped in the tab, rest analyzed; evidence not highlightable. CSP adds only `'wasm-unsafe-eval'`. Release verified (SBOM lists exactly the OCR engine and two models; new negative test). E2E: image lure read and flagged manipulative, page text not re-analyzed, no highlight offered; plain page says nothing found. **Next:** owner tries it from the toolbar (the real capture path needs a toolbar click).

---

## 2026-10-23 · On-device OCR for screenshots in the app (D-104)
"Cek Pesan" can check a screenshot: a pick or an Android share is read on the device with Tesseract.js (pinned; Indonesian and English models; files served from the app's origin, loaded only on first use, cached offline). On the owner's 14 field screenshots the OCR path alerts on the same 10 images as the hand-transcribed records, in 2–6 s each on a laptop. New e2e tests for a picked and a shared screenshot; `npm test` 800 passed, with the two load-sensitive timing tests (extractor budget, 5,000-block analyze) failing under full-suite load and passing alone. **Next:** owner tries a screenshot on a phone.

---

## 2026-10-23 · Illegal online loans and deposit-based task jobs (D-103)
pay 0.8.0: `PR.LOAN` (approved or "pasti cair" loans, no BI checking) with a fee condition is PR1; ad-watching and review jobs with a deposit or balance top-up are PR1; licensed loan pages and instalment reminders stay below alert. 4 new fixtures (pay-dev 57, FP 0); synthetic, SMS and field-sample results unchanged. Demo gallery caption reworded (it quoted the lure verbatim). Tests: 799 passed in isolation runs; the extractor budget test still fails on this machine with or without the change. **Next:** on-device OCR for screenshots needs an owner decision (runtime dependency).

---

## 2026-10-23 · App-file lures, turning off protection, fixed-return investment (D-102)
Gaps chosen from public reports (OJK IASC categories; APK invitations and parcel photos). sup 0.8.0: SR10 APP_FILE_LURE (.apk presented as an invitation, parcel photo, receipt, ticket or bill; requests to turn off Play Protect or allow unknown sources), turning off protection also counts in SR1/SR2. pay 0.7.0: fixed or guaranteed investment returns are pay-to-receive (PR1); down payments and paying in capital are requests. 10 new dev fixtures; pay-dev and sup-dev FP 0; synthetic dev 2,908 → 3,104 of 6,480 scam, benign 0; SMS dev and field sample unchanged. `npm test`: 791 passed; the extractor budget test fails on this machine with and without the change (time budget hit first; extractor untouched). **Next:** release and site rebuild with the new detectors.

---

## 2026-10-23 · English-first website and app, bilingual landing page (D-101)
Landing page in English and Indonesian with an EN/ID switch; landing page and app open in English on the first visit, and the visitor's choice carries between them (localStorage, language code only). New product description on the landing page and README. Verified in Chromium against the built site: English on an `id-ID` phone, switch and reload keep Indonesian, the app follows, no horizontal scroll at 390 px, zero external requests; PWA e2e and i18n tests pass. **Next:** owner decides on the single locked runs (v3, SMS test half, synthetic test split).

---

## 2026-10-23 · Synthetic Indonesian scam corpus and message-scam phrasing (D-100)
The owner's 12,150-message synthetic corpus became a second external set (`corpus/external/synthetic-id/`, git-ignored; test split hash-locked, template leakage noted). Dev baseline: 397 of 6,480 scam alerted, 10 of 4,455 benign. After cred 0.3.0, pay 0.6.0 and sup 0.7.0: 2,908 of 6,480 scam alerted, 0 of 4,455 benign (development numbers, synthetic). SMS dataset dev half and field sample unchanged; 10 new dev fixtures; cred-dev, pay-dev and sup-dev FP 0; typecheck and lint clean; `npm test` 774 passed. **Next:** owner decides on the single locked runs (v3, SMS test half, synthetic test split); rebuild the release and site so the live app carries the new detector versions.

---

## 2026-10-23 · External SMS dataset and SMS-era patterns (D-099)
Indonesian SMS spam dataset as an external set (hash split, locked test half). Dev half: *penipuan* alerted 11 → 94 of 178, *normal* 1 of 318, *promo* 1 of 120. pay 0.5.0 (phone credit, bare accounts, redirected payments, claimed family on a new number), sup 0.6.0 (SMS prize notices, SR9 third-party redirect). 8 new dev fixtures; pay-dev and sup-dev FP 0; `npm test` green apart from known load-sensitive tests that pass alone. **Next:** owner decides when to run the external test half and held-out v3 (once each).

---

## 2026-10-22 · Brand, website and repository scope (D-098)
Logo and matching icons; README without competition context (submission/ kept local); website at https://veiltrace.click with landing page, the PWA at /app/ and downloads (D-098). Verified in Chromium: landing renders without horizontal scroll at phone width, app at /app/ with service-worker scope /app/, download link works, zero external requests; the root service-worker retirement unregisters the old worker once an update check runs. **Next:** owner labels the field sample; v3 and field-sample test runs on request.

---

## 2026-10-22 · Submission package rebuilt for the judging criteria
README rewritten for reviewers (surfaces, privacy, every result as it is, repo map) with screenshots from the fictional demo scenes (`tests/e2e/screenshots.test.ts`); `docs/README.md` index (technical documentation is a judged deliverable); proposal rewritten around the official weights (9 pages, images); video script and jury Q&A updated; `submission/README.md` with the registration form text; a 15-slide deck with speaker notes (Indonesian). PWA headline now speaks of a message. **Next:** owner registers the idea, records the video, labels the field sample; the single v3 and field-sample runs on owner request; numbers into proposal §8 and the deck.

---

## 2026-10-22 · Real-data tooling and held-out v3 locked (D-096)
Screenshot import with local OCR, label sheet and label import for the field sample. Held-out v3: 80 scenarios by a separate blind agent (research into current public scam reports; 47 message contexts), hash-locked without being read; preregistered with "any detector alerts" as the primary metric (docs/EVAL_PREREGISTRATION_V3.md). **Next:** owner labels and consent, new field records (unseen), then the single v3 and field-sample test runs on owner request, then the proposal.

---

## 2026-10-22 · AI evaluation → experiment only (D-095)
Owner ran the AI eval page: AI alone TP 81 · FP 73 · TN 30 · FN 1 on 185 dev scenarios (benign false-alarm rate 71%); VeilTrace TP 80 · FP 0 · TN 103 · FN 2 (docs/AI_EVAL.md). Owner chose to hide it: compiled out of released builds, kept in `build:ext:ai` and `build:ai-eval`. **Next:** back to rule accuracy on real data, labels/consent, v3, then submission.

---

## 2026-10-22 · AI opinion after the first device test (D-094)
Gemini Nano runs in the owner's Chrome, but called a legitimate checkout "manipulative". Prompt guidance + four worked examples; a disagreement note in the panel; `npm run build:ai-eval` page to measure the model on 200 development items in the owner's Chrome. `npm test` 734 passed. **Next:** owner runs the eval page and saves the JSON; numbers go into docs/AI_EVAL.md.

---

## 2026-10-22 · Optional on-device AI second opinion (D-093)
Popup panel "AI second opinion · optional, on this device": payload preview first, then Chrome's built-in model; fixed-value JSON answer validated strictly; VeilTrace result unchanged. Unit tests (masking, validation, injection-shaped answers rejected) and e2e (unavailable state; full flow with a stand-in model: masked text, second-click only, labels, unchanged verdict, 0 requests). `npm test` 734 passed. **Not yet:** a run on a machine with Gemini Nano, and any accuracy measurement of the AI opinion. **Next:** owner tries it on Chrome desktop (chrome://on-device-internals shows model status).

---

## 2026-10-22 · Device findings: prize quizzes, illegal access services (D-092)
Owner tested Firefox for Android (works) and the PWA on a phone. Missed: a fake "PLN anniversary" prize quiz reached from WhatsApp, and a "jasa sadap WA" page; the PWA gave no explanation when only a link was pasted. `sup-0.5.0-exp` adds SR7/SR8; the PWA explains link-only input; the popup footer shows all detector versions. sup-dev TP 20 · FP 0 · TN 24 · FN 0; others unchanged; `npm test` 726 passed. **Next:** optional AI check (design decision pending owner), labels and consent for field records.

---

## 2026-10-22 · Accuracy round 2 from the owner's field sample (D-091)
15 redacted field records (RW-0001 … RW-0015, all `seen`, dev half). Before: 2 of 14 scams alerted. After `sup-0.4.0-exp` (SR6 impersonated-notice lure) and `pay-0.4.0-exp` (job-offer fees): 11 of 14, genuine bank SMS observed only (dev numbers, same author). sup-dev TP 18 · FP 0 · TN 21 · FN 0; pay-dev TP 17 · FP 0 · TN 23 · FN 0; cred-dev and ClickFix dev unchanged. `npm test`: 716 passed, 1 skipped. Owner's demo report (pay-lure, cred-lure not flagged) traced to a stale extension build: current build flags both in the real popup; extension version bumped to 0.7.0. **Next:** owner labels the records (annotator A) and finds annotator B; more field records go in unseen (test half). **Blockers:** labels; real-device tests.

---

## 2026-10-22 · Held-out v2 run (owner request) · **Done: targets missed**
One preregistered run at `29dda8e`: overall TP 11 · FP 5 · TN 23 · FN 21; recall 34.4%, precision 68.8%, hard-negative FPR 17.9% (docs/EVALUATION_RESULTS_V2.md). The rules overfit the author's wording; v2 is now spent. **Next:** class-level fixes measured on real-world data and a new blind set v3.

PWA published at https://dalpan.github.io/veiltrace/ via `npm run deploy:pwa` (gh-pages branch, D-090); checked live in Chromium at phone width: service worker active, 0 external requests. **Blocker:** a real-phone install and share-from-WhatsApp test by the owner.

---

## 2026-10-22 · P2b web chat (WhatsApp Web prototype) and P2c managed build · **Implemented (D-088, D-089)**
Extractor 0.3.0 treats chat conversations as user content (dev results unchanged); managed build with automatic scanning from install, no reporting; policy templates in `deploy/`. **Next (owner):** try a real WhatsApp Web chat with VeilTrace (manual scan) and report whether incoming messages are recognized; decide on held-out v2 run timing and PWA hosting.

---

## 2026-10-22 · P2a recruitment scams and rank impersonation · **Implemented (D-087)**
Pay 0.3.0 and sup 0.3.0; six dev scenarios written before the change; pay-dev FN 0, sup-dev FN 0, no FP. **Next:** P2b WhatsApp Web prototype, P2c managed organizational build.

---

## 2026-10-22 · Held-out v2 locked; realistic demo gallery; mobile (PWA + Firefox) · **Implemented**

**Done:** held-out v2 (60 scenarios, blind author) validated blind and hash-locked, preregistered, harness `npm run eval:v2 -- --final` (not run) (D-085). Realistic demo gallery `demo/scenes` (8 pages + gallery). "Cek Pesan" PWA with Android share target, offline, phone layout (D-084). Firefox build for desktop and Android (D-086).

**Next (owner):** decide when to run held-out v2 (once, `--final`); choose hosting for the PWA (HTTPS static host) to install it on a phone; try the Firefox build on an Android phone (Firefox ≥ 128). **Then:** P2 (WhatsApp Web prototype, recruitment and rank-impersonation patterns, managed organizational build).

---

## 2026-10-22 · Accuracy round 1 · **Dev improvements done (D-083); held-out v2 being authored blind**

**Done:** 20 realistic dev scenarios (labels first, baseline recorded); engine 0.3.0 (ruleset m5) and cred/pay/sup 0.2.0. Dev before → after: ClickFix FP 2→0, FN 5→1; credential FN 2→1; payment FN 2→0; support FN 1→0 (DETECTION_MODEL.md §15). A separate author, blind to the rules, is writing `corpus/test-v2` (60 scenarios across the four categories).

**Next:** lock test-v2 (hash manifest, preregistration) without opening it; continue accuracy work on dev; run test-v2 once, on owner request.

---

## 2026-10-22 · P1 real-world field sample kit · **Tooling ready; no records yet (collection by others)**

**Done:** `corpus/realworld` (D-082): record format, redaction tool, privacy guard in CI, deterministic dev/test split, two-annotator labels with Cohen's kappa and adjudication, hash lock for the test half, evaluation running all four detectors; `npm run realworld -- redact|add|label|agree|lock|eval`; English README and Indonesian contributor guide (`PANDUAN_KONTRIBUTOR.md`). **Tests:** `tests/realworld.test.ts` (10).

**Next (owner):** recruit at least two annotators and contributors, collect redacted samples (aim: ≥ 100 malicious and ≥ 100 benign, Indonesian first), label independently, lock the test half before any evaluation. **Blockers:** needs people other than the rule author.

---

## 2026-10-22 · Opt-in automatic scanning · **Implemented (D-081); manual Chrome validation pending**

**Done:** popup "Scan mode" (MANUAL/AUTO) with consent text; optional host permission requested through Chrome's dialog; dynamic content script (`content.js` + `auto.js`) scanning on load and change with debounce, maximum wait, interval and scan caps; badge-only service worker (red "!" for manipulative pages); popup scans on open in automatic mode; turning it off unregisters and removes the permission. D-035 narrowed to one validated one-way channel; ESLint scope, bundle checks and `verify-release` policy updated. **Tests:** `tests/auto.test.ts` (4), `tests/e2e/auto.test.ts` (5), updated manifest/release/security tests.

**Next:** owner tries it in Chrome (turn on, open a demo lure, see the badge). Then P1: real-world Indonesian dataset kit.

---

## 2026-10-21 · P0 hackathon submission package · **Done (owner to fill team details and record the narrated video)**

**Done:** pending CA03/popup fix committed; README introduction rewritten for judges; private GitHub repository `dalpan/veiltrace` created after a history audit (no secrets, keys, screenshots or release files), `main` and `eval-freeze-v1` pushed; `submission/PROPOSAL.md` (Indonesian, 5 pages as PDF) and `submission/VIDEO_SCRIPT.md`; slide deck (11 slides, Indonesian) as a private Slides artifact; automated silent demo video (`npm run submission:video`, 13 cards, about 90 s) (D-080).

**Next:** owner fills team names and repository link in the proposal and slides, records the narrated video, and decides when to make the repository public. Then auto-scan mode (opt-in).

---

## 2026-10-21 · M5.4 follow-up after the owner's manual Chrome test · **Fixed and committed (owner approved)**

**Owner finding:** CA03 (informal Indonesian OTP request) showed no finding. **Also found in the screenshots:** the popup opened about 430 px wide instead of 560 px.

**Done:** five new informal cred-dev scenarios written and labelled before the change (CA06–CA08, CN21–CN22); credential lexicon extended to `cred-0.1.1-exp` (DETECTION_MODEL.md §12.9; D-079): cred-dev 41 scenarios TP 14 → 18, FP 0 → 0, FN 5 → 1. Popup width fixed (D-079). New unit tests (informal positives and slang hard negatives), an E2E regression for CA03 in the popup, and an E2E width regression.

**Next:** owner re-checks CA03 and the popup width in Chrome. Verification: unit 360/360, browser 183/183, E2E 66/66, verify:extension 31/31.

---

## 2026-10-21 · M5.4 Unified threat dashboard · **Implemented (UI only); manual Chrome validation pending**

**Done**
- `src/extension/popup/aggregate.ts`: pure aggregation of the four detector sections (highest classification, actionable count, affected categories, completeness), ranking (classification → action risk → confidence → detector), grouping of findings that cite the same element with provenance kept (D-077).
- Popup rewritten as one dashboard: header with scan status and version, page threat summary with four stats, category overview tiles, coverage panel, contextual advice, unified findings list with F-/E- ids, groups, collapsed observed list. Dark console styling at 560 px with narrow fallback (D-078). EN/ID strings in parity; per-section headlines replaced by dashboard strings.
- Detection engines, `ScanReport` v4, permissions and privacy rules unchanged.
- **Tests:** `tests/aggregate.test.ts` (8), `tests/browser/dashboard.test.ts` (2), `tests/e2e/dashboard.test.ts` (7: aggregation, sorting, grouping, highlighting from a group, keyboard, language switching, empty and partial scans, layout at 560/420/360 px). Existing E2E assertions updated to the dashboard.

**Verification:** typecheck and lint clean; unit 357/357, browser 178/178, E2E 64/64, verify:extension 31/31. One first full run had load-related timeouts (an extractor budget test and three E2E tests near 515 s); each passed on an isolated rerun. No change under `src/core`, `src/extract`, `src/extension/content`, the manifest, corpora or evaluation data; `eval-freeze-v1` unchanged.

**Next:** owner review; manual Chrome check (DEMO.md D1–D8). **Blockers:** none.

---

## 2026-10-21 · M5.3 Fake support and authority impersonation · **Implemented as experimental (development data only); manual Chrome validation pending**

**Done**
- **Detector** `sup-0.1.0-exp` (`src/core/support/`): directions (contact, remote access, install) × channel × claimed identity × device alert / threat / urgency × placement; rules SR1–SR5, strongest applicable rule wins; claims and observable indicators reported separately; EN + ID including informal Indonesian (DETECTION_MODEL.md §14; D-074). Phone numbers never reported (D-075).
- **Extension:** fourth detector in the content script; `ScanReport` v4 with a validated `support` section; popup section "Support & Authority Impersonation · Experimental" with the shared layout (D-076).
- **Corpus and eval:** `corpus/sup-dev` (27 scenarios: 10 positive, 2 adversarial, 15 hard negatives), `npm run eval:support` → `eval/results/sup-dev.{json,md}`.
- **Tests:** `tests/support.test.ts` (21), `tests/browser/support.test.ts` (28), `tests/e2e/support.test.ts` (6), report/validation tests in `tests/extension.test.ts`.
- **Fixed during testing:** awareness-list FP (negation over "or", attributed alerts); first-match rule order hiding a stronger rule (now strongest wins).

**Verification:** typecheck and lint clean; unit 349/349, browser 176/176, E2E 57/57, verify:extension 31/31. sup-dev TP 11 · FP 0 · TN 15 · FN 1 (SA02, unusual alarm wording). cred-dev (14/0/20/2) and pay-dev (10/0/16/1) result files unchanged. ClickFix core, `corpus/test`, `eval/runs.md`, preregistration and `eval-freeze-v1` untouched. Permissions unchanged.

**Next:** owner review; manual Chrome check of the four-section popup. **Blockers:** none. Release version still open (D-070).

---

## 2026-10-21 · M5.2 Payment-manipulation detection, stage 1 · **Implemented as experimental (development data only); manual Chrome validation pending**

**Done**
- **Detector** `pay-0.1.0-exp` (`src/core/payment/`): payment request × fee/amount/destination × pay-to-receive promise × pressure × placement; rules PR1–PR4, modifiers; EN + ID lexicon (DETECTION_MODEL.md §13; D-071). Block text only; amount values never reported (D-072).
- **Extension:** content script runs the third detector; `ScanReport` v3 with a validated `payment` section; popup shows Command Execution, Credential Disclosure and Payment Manipulation sections with the same layout, a per-finding category and a severity chip mapped from the classification, no combined score (D-073). EN/ID strings in parity.
- **Corpus and eval:** `corpus/pay-dev` (27 scenarios: 10 positive, 1 adversarial, 16 hard negatives incl. checkouts, invoices, bills, donations, news, awareness pages), `npm run eval:pay` → `eval/results/pay-dev.{json,md}`.
- **Tests:** `tests/payment.test.ts` (21), `tests/browser/payment.test.ts` (28), `tests/e2e/payment.test.ts` (6), plus report/validation tests in `tests/extension.test.ts`; existing tests updated for the renamed section labels and the severity chip.

**Verification:** typecheck and lint clean; unit 326/326, browser 148/148, E2E 51/51, verify:extension 29/29. pay-dev TP 10 · FP 0 · TN 16 · FN 1 (PA01 informal Indonesian; known miss), 0 sentinel leaks, 0 requests. cred-dev unchanged (TP 14, FP 0, TN 20, FN 2). ClickFix core, `corpus/test`, `eval/runs.md`, preregistration and `eval-freeze-v1` untouched. Manifest permissions unchanged (`activeTab`, `scripting`).

**Next:** owner review; manual Chrome check of the three-section popup. **Blockers:** none. Version for a release still open (D-070).

---

## 2026-10-21 · M5.1 Credential-disclosure detection, stage 1 · **Conditionally accepted as experimental; manual Chrome validation pending**

**Commit separation:** M4.4 was committed first as its own commit (`feat(demo): prepare hackathon showcase and extension v0.5.0`), reconstructed from the shared working tree by reverting every M5.1 edit and verified separately (identical development-release hashes to the M4.4 review). M5.1 is committed on top. A full backup of the shared working tree was kept outside the repository.

**Done**
- **Detector** `cred-0.1.0-exp` (`src/core/credential/`): secrets × disclosure action × pretext × trust context × form structure; rules CR1–CR5, modifiers, `O.LIVE_SECRET_FIELD`; EN + ID lexicon (DETECTION_MODEL.md §12; D-062, D-065).
- **Extractor 0.2.0-m5:** structural form fields and forms (kind, hints, label, destination category, enclosing container); no values read (D-063). Blocks unchanged.
- **Extension:** ScanReport v2 with a strictly validated `credential` section; popup section "Passwords and codes · Experimental" with requested action, indicators, form destination (information only), confidence, action risk, evidence with Show on page, limitations; EN/ID (D-066). No permission, storage or network change (D-064).
- **Development corpus** `corpus/cred-dev` (36: 11 positive, 5 adversarial, 20 hard negatives; 26 EN, 10 ID) and `npm run eval:cred` with a typed-sentinel privacy check (D-067).

**Development results (tuned on this data; not held-out):** v0 TP 12 / FP 1 / TN 19 / FN 4 → v1 TP 14 / FP 0 / TN 20 / FN 2. Precision 14/14, recall 14/16, hard-negative FPR 0/20, localization 14/14, 0 requests, 0 sentinel leaks (26 fields); deterministic across two runs. Remaining FN: CA02 (blockquote), CA03 (informal Indonesian).

**ClickFix regression:** regenerated dev, research and refine artifacts differ from the committed ones only in the extractor version string (2 lines); the committed files were restored. Unit fixtures: `analyze()` identical with and without form fields.

**Verification (final, at commit):** see the M5.1 commit report; production manifest `activeTab` + `scripting`, CSP unchanged; no network/storage APIs in the bundles; no new `.value`/`.defaultValue` reads.

**Finalization hardening (D-069):** positional field/form locators and fixed hint tokens; bounded enclosing-container chains for forms; per-request scoring with quoted/code pretexts limited to their block; live-field override limited to the same secret kind and to educational framing. Targeted regressions added (awareness exercise with fields, MFA with urgency text, attacker label, secrets in id/name/autocomplete/value, nested forms and the comment boundary, quoted request next to an unrelated field, recovery flow, popup output). cred-dev unchanged: TP 14, FP 0, TN 20, FN 2 (36/36 scenarios identical).

**Version:** manifest 0.6.0 proposed for credential-enabled builds (D-070); nothing built or published.

**Not done:** held-out credential evaluation (M5.2); manual Chrome check of the credential section; no release built.

**Next:** manual Chrome validation of the credential section; owner decision on the version; M5.2 only after approval.

## 2026-10-21 · M4.4 Hackathon demo and release candidate · **Accepted; manual checklist N1–N14 confirmed by the owner**

**Done**
- **Demo site** `demo/nusaverta` (fictional): help-center article plus a third-party "Community answers" widget with a defanged ClickFix lure; benign state; developer-docs page. Static HTML/CSS, no JS, no external resources. Copied to `dist/manual/demo` by `npm run manual:fixtures`. Engine results (real extraction): lure manipulative (R1), benign none, docs observed (R5 × 2). No demo-specific code (tested; D-061).
- **Presenter guide** (docs/PRESENTER_GUIDE.md): setup, 3- and 7-minute scripts, domain-invariance demonstration, evaluation slide with the held-out numbers and missed targets, limitations, Q&A, browser compatibility.
- **Domain invariance:** identical extraction and analysis for the 3 demo pages under 4 hosts (browser test), and identical popup results under 2 hosts (E2E).
- **M4 criteria:** hard-negative assessment (EVALUATION_PLAN.md §12): 5 of the brief's 7 named types pass on all available evidence; S-N5 has one dev FP (D39); S-N4 has one held-out FP (T18); the extra S-N8 row has one held-out FP (T17). Evasion table with measured status (THREAT_MODEL.md §5), plus demo trust boundaries (§8). Corrected an inaccurate claim: there is no "language not supported" notice.
- **Release candidate v0.5.0** (D-060): development release verified and reproducible; candidate path verified in a throwaway clone (identical in-ZIP files); final candidate hashes after the commit (RELEASE.md §6).
- **Tests:** `tests/browser/demo.test.ts` (7), `tests/e2e/demo.test.ts` (4); the E2E helper serves CSS with the right content type.

**Verification:** typecheck, ESLint clean; unit 277/277; browser 78/78; E2E 39/39; `verify:extension` 25/25; supply-chain 0 vulnerabilities; `release` + `release:verify` OK; `release:repro` identical.

**Unchanged:** `src/core`, `src/extract`, `src/eval`, lexicons, `corpus/`, `eval/`, EVAL_PREREGISTRATION.md, EVALUATION_RESULTS.md. Held-out not run.

**Manual validation:** the owner confirmed the v0.5.0 checklist N1–N14 (DEMO.md), including the manual domain-invariance row N8.

**Not done:** candidate hashes from the M4.4 commit (recorded after committing); signing and distribution.

**Next:** candidate build from the M4.4 commit.

## 2026-10-21 · M4.3B Final held-out evaluation · **Executed once; accepted with a post-run protocol deviation (D-059)**

- Owner-authorized. Frozen state verified (tag `eval-freeze-v1` → `03fa212`, clean tree, preregistration and manifest unchanged), then `npm ci`, `validate --split test`, and **one** `npm run eval -- run --split test --final` (exit 0).
- **Results (synthetic, n = 26):** TP 9, FP 2, TN 12, FN 3. Recall 75.0% (46.8–91.1), precision 81.8% (52.3–94.9), hard-negative FPR 14.3% (4.0–39.9): targets **missed**. Localization 9/9 and 0 requests: met. Engine 0.2.0 = M1 on every held-out scenario. Details: docs/EVALUATION_RESULTS.md.
- **Errors:** FN T09, T10 (context-modifier evasion), T12 (cross-origin frame, partial scan); FP T17 (R4), T18 (R3).
- **Protocol deviation (D-059):** `eval/runs.md` says "(dirty)" because the harness writes its untracked outputs before the status check; tracked files were identical to the tag. The owner accepted the run as the single final run; the marker is preserved, with no rerun (EVALUATION_RESULTS.md §1.1).
- No rule, lexicon, extractor, harness or corpus change. Manual Chrome checklist V1–V12 confirmed by the owner.

**Committed** as results and docs only (`docs(eval): record frozen held-out evaluation results`); the freeze tag was not moved.

**Next:** M4.4 (hackathon demo preparation), only after owner approval.

## 2026-10-21 · M4.3A Engine adoption and pre-evaluation freeze · **Implemented (awaiting owner review)**

**Done**
- **Engine 0.2.0 is the default** (ruleset `m4.1` = P1b + P2-A + R4-β, unchanged from the M4.1 candidate; `m4.1-rc1` is an alias). M1 stays available as `{ ruleset: 'm1' }` (engine `0.1.0-m1`). No rule, lexicon, modifier, window or threshold changed (D-055).
- **Popup:** overrides with explanation, context set aside and supporting evidence; `C.PROCEDURAL`; hidden-evidence/finding counts; strict validator that rejects unknown keys, modifiers and overrides instead of dropping them (D-056). No new permission, network access or storage.
- **`release:repro`** now builds `candidate` artifacts on a clean tree, so they match `release:candidate` (D-057).
- **Preregistration:** docs/EVAL_PREREGISTRATION.md, written before any held-out run (D-058). Corrections made before results: `veiltrace` = 0.2.0; B0/A1/A2 pinned to M1; Markdown percentages computed from k/n (double-rounding fix).
- **Tests:** E2E `engine.test.ts` (D17 procedural observed, D45 override with hidden evidence, Indonesian strings); unit tests for adoption, report/validator, `fmtRate`. Fixed a pre-existing E2E race (parallel test files rebuilt the same `dist/e2e` folder; now one folder per worker).
- **Manual fixtures** add D06, D17, D27, D45. DEMO.md v0.4.0 checklist in four categories (confirmed in M3 / bilingual UI / engine change / not yet done).

**Dev results (synthetic, development split, regenerated twice, byte-identical):** `veiltrace` 0.2.0: TP 16, FP 1 (D39), TN 28, FN 5 (D10, D12, D43, D44, D50). `veiltrace-m1`: TP 16, FP 6, TN 23, FN 5, identical per scenario to the M4.2 `veiltrace` results; B0/A1/A2 identical. `dev.m41.json` byte-identical.

**Verification:** typecheck, ESLint clean; unit 277/277; browser 71/71; E2E 35/35 (×4 after the race fix); `verify:extension` 25/25; supply-chain 0 vulnerabilities; `eval -- validate --split test` valid (structural only, no detection); `corpus/test` 0 changes vs `407beb0`, MANIFEST.json SHA-256 `c89904bf…d447`; `corpus/dev` and lexicons unchanged; development release verified and `release:repro` identical. No `eval/runs.md`.

**Not done:** held-out evaluation, `--final`, `eval-freeze-v1` tag; manual Chrome v0.4.0 checklist (owner). Extension version stays 0.4.0; bump before any distribution.

**Next:** owner review of M4.3A; then (if approved) the `eval-freeze-v1` tag and the single preregistered held-out run (M4.3B).

## 2026-10-21 · M4.2 finalization (owner review: conditionally accepted)

- Artifact SBOM (CycloneDX, 0 components, hash-bound to the ZIP) added to every release. Release types `development` / `candidate`; `candidate` refuses dirty trees (tested). No "official" label before signing (D-054).
- Third-party-code markers (MPL-2.0 `lightningcss`, `node_modules`) are rejected by `verify-release`.
- RELEASE.md: distributed vs development-only licenses separated; the toolchain SBOM is scoped to the installed macOS/arm64 tree; the reproducibility claim is scoped to macOS/arm64 with Node 26.8.1 and esbuild 0.28.2; signing is a documented future requirement.
- The M4.2 working-tree artifact (`dirty: true`) is a development build, **not a release**.
- **Manual Chrome stable v0.4.0 checklist (docs/DEMO.md C1–C12): not yet executed.**

## 2026-10-21 · M4.2 Release engineering, security hardening, high-assurance readiness · **Implemented (accepted)**

**Done**
- **Supply chain:** `npm run supply-chain` → CycloneDX SBOMs, license review, lockfile check, audit (0 vulnerabilities; MPL-2.0 dev-only flagged and accepted, D-051).
- **Release:** `npm run release` / `release:verify` / `release:repro` (deterministic ZIP, manifest, SHA256SUMS; D-050). Two clean builds identical.
- **Indonesian popup UI** with deterministic selection and a session switch (D-049). Extension 0.4.0 (D-052).
- **Docs:** DEPLOYMENT.md (feasibility), RELEASE.md, OPERATOR_GUIDE.md, THREAT_MODEL §7, PRIVACY_SECURITY §8, DECISIONS D-049 … D-053.
- **Compatibility:** Edge 155 automated smoke OK; branded Chrome cannot be automated (D-053).

**Not changed:** detection rules, lexicons, modifiers, both engine variants, `corpus/dev`, `corpus/test`. No held-out evaluation.

**Next:** manual v0.4.0 checklist (owner); M4.3 (evaluation freeze) only after approval.

## 2026-10-21 · M4.1 finalization (owner review: rc1 approved as experimental)

- **Decisions:** P1b, P2-A and R4-β approved as the experimental ruleset `m4.1-rc1` (engine `0.2.0-rc.1`). P2-C is rejected for rc1, not permanently. The default stays `0.1.0-m1` and the extension is unchanged (D-041 … D-044).
- **Safeguards** (D-047):
  - Concealed payloads now count only inside the instruction's correlation window (previously anywhere in the region).
  - Overrides list the supporting observation ids.
  - 7 new safeguard tests: window association, docs with hidden copy targets, R4-β evidence and explanation, attacker articles with code blocks, P1b vs R1/R2/R3, explainability/traceability, determinism.
- **Dev results unchanged** by the tightening (artifacts byte-identical): rc1 TP 16, FP 1, TN 28, FN 5.
- Strategic context recorded as planning only (D-048; PRODUCT_SPEC §9; IMPLEMENTATION_PLAN "Potential High-Assurance Deployment"). No deployment features were implemented.

## 2026-10-21 · M4.1 Controlled detection refinement · **Implemented (accepted as experimental)**

**Done**
- Baseline: M3 reproduced on dev36 (byte-identical). Dev split extended to 50 scenarios (D37–D50), written before the candidates (D-046). M3 on dev50: TP 16, FP 6, TN 23, FN 5.
- Candidates implemented as research options: P1, P1b, P2-A/B/C/D, R4-β (`C.PROCEDURAL`). Explicit `Finding.overrides`. New command `npm run eval -- refine --split dev` → `eval/results/dev.m41.{json,md}`.
- Recommended rule set `m4.1-rc1` = P1b + P2-A + R4-β (engine `0.2.0-rc.1`). Dev: TP 16, FP 1, TN 28, FN 5. **Not adopted, not frozen** (D-041 … D-046).
- 22 regression tests (`tests/m41.test.ts`).

**Verification**
- The default engine still equals M1 (`d856fbd`) on 30 unit fixtures and 50 extracted dev snapshots.
- Eval artifacts are byte-identical across runs. The held-out split was not evaluated, `corpus/test` is unchanged and its manifest is verified.

**Remaining errors (rc1, dev):** FP D39 (docs dialog); FN D10, D12, D50 (planted context in a verification dialog), D43 (quoted UGC lure), D44 (informal Indonesian paraphrase).

**Next:** M4.2 only after explicit owner approval.

## 2026-10-21 · M3 finalization: manual production validation (stable Google Chrome, owner-run)

Checklist: docs/DEMO.md. Production build `dist/extension` loaded unpacked; pages served offline from `dist/manual` on two local origins.

| Row | Result | Basis |
|---|---|---|
| M1 Details: name, version, permissions | Passed | Owner screenshot: "VeilTrace", 0.3.0, Permissions empty, no sites listed under Site access. **Doc correction:** Chrome shows generic "can read and change your data on sites" text for this activeTab-only extension; the M1 expectation was updated |
| M2 Popup before scan | Passed | Owner confirmation (no screenshot) |
| M3 Fake CAPTCHA (D01) | Passed | Owner screenshot: "Manipulative instruction detected", "Complete scan", 10 blocks |
| M4 No persistent host access after scanning | Passed | Owner screenshot taken after all scans: Permissions empty, no sites listed |
| M5 Technical docs (D16) | Passed | Owner screenshot: "No suspicious instructions detected in the analyzed content." with the observed-instruction note |
| M6 Show on page | Passed | Owner confirmation (no screenshot) |
| M7 Highlight cleanup with popup closed | Passed | Owner confirmation (no screenshot) |
| M8 Stale locator, no false success | Passed | Owner confirmation (no screenshot) |
| M9 Partial scan, large page | Passed | Owner screenshot: "Partial scan", 5,000-block reason; 536 ms total in stable Chrome |
| M10 Cross-origin iframe | Passed | Owner screenshot: "Partial scan: Embedded frames from other sites could not be examined" |
| M11 chrome://settings | Passed | Owner confirmation (no screenshot) |
| M12 No network requests | Passed | Owner confirmation (no screenshot) |

Screenshots are kept outside git (`screenshoot-demo/`, ignored: they show personal browser UI).

## 2026-10-21 · M3 Chromium extension and evidence UI · **Implemented and accepted (committed)**

**Done**
- MV3 extension (`src/extension`, built to `dist/extension`):
  - Popup UI: Scan page, progress, verdict headline (never "safe"), classification/confidence/action-risk chips, rule explanations, evidence snippets, Show on page, complete/partial status with reasons, limitations, error states.
  - Browser adapter (`executeScript`, ISOLATED world), strict report validation, isolated-world content bundle (extractor + core), overlay highlighter.
- **Permissions:** production `activeTab` + `scripting` only. CSP `connect-src 'none'`. No background, no messaging, no storage. A separate test build carries the test-only permissions (D-038).
- Real `chrome.dom.openOrClosedShadowRoot` verified from the isolated world (the open M2 item).
- Tests:
  - 9 unit tests (report minimization, validation, locator grammar, URL classification)
  - 27 E2E tests with the real extension (functional, security/permissions/CSP/XSS/offline, performance)
- Decisions D-035 … D-040. D-005, D-008 and D-013 accepted.

**Verification**
- typecheck (4 configs) ✔, lint ✔, **316/316 tests** (280 pre-existing + 36 new).
- `src/core` unchanged vs `70c5697`. Dev evaluation artifacts byte-identical to M2. `corpus/test` untouched.
- Extension performance (first scan incl. injection): 31–57 ms on fixtures, 64–211 ms on large synthetic pages. Peak extraction 141 ms vs the 1,500 ms budget.

**Not done / limitations**
- The toolbar click → activeTab path is not automatable. It was validated manually by the owner on stable Chrome (see the M3 finalization entry).
- No E2E for the timeout partial reason (it cannot be forced in production; covered by the extractor tests). "Copy report" and the Indonesian UI are not implemented.

**Next:** M4 only after explicit owner approval.

## 2026-10-21 · M2 finalization (owner review: conditionally accepted)

- **Decisions:**
  - P1 accepted for the next controlled rule revision but **not implemented** (D-031).
  - P2 rejected in its current form, with redesign requirements (D-032).
  - `aria-hidden` kept as metadata (`ctx.ariaHidden`, D-023).
  - 1,500 ms budget accepted provisionally (D-027).
  - Extractor coverage instrumentation deferred (D-030).
- **Partial-scan reporting** (D-033): `coverage.partial` reasons from the extractor and `scanStatus()` in the core. **Defect fixed:** an over-long block no longer stops the scan.
- **Detection unchanged:** results are identical to commit `d856fbd` on all 30 M1 unit fixtures and on all 36 extracted dev snapshots. Dev metrics are identical to the pre-finalization run.
- **Artifacts:** only deterministic `eval/results/dev*.{json,md}` are committed; timings are git-ignored (D-034). Byte-identical across two runs.
- **Held-out:** untouched; manifest verified.

## 2026-10-21 · M2 DOM extraction, evaluation corpus, baseline research · **Implemented**

**Done**
- **Held-out split frozen first** (`407beb0`, D-022). 26 scenarios, hash-checked; no detection run on it.
- **Extractor** (`src/extract`, IIFE `dist/extractor.js` ~18 KB):
  - rendering-based visibility, block segmentation, semantic containers, context flags, heading context
  - locators across shadow DOM and frames, plus `resolveLocator`
  - copy triggers and hidden clipboard payloads
  - privacy filters, budgets, read-only guarantees
  - `watchForChanges` for dynamic and SPA pages
  - Limitations are in ARCHITECTURE.md §3.9.
- **Dev corpus:** 36 HTML scenarios (14 malicious, 22 hard negatives; 11 EN + 11 ID hard negatives). Covers fake CAPTCHA, benign CAPTCHA, docs, tech support, internal IT, news, Indonesian, UGC/widget/shadow/iframe injection, modal after click, cross-region, and modifier-evasion cases.
- **Harness** (`src/eval`, `npm run eval`): offline routing, scenario metrics, Wilson CIs, confusion and class matrices, localization in the live DOM, JSON/Markdown outputs, held-out guards, `research` and `perf`.
- **B0 and ablations** (`src/eval/systems.ts`) on identical snapshots.
- **Core:** `AnalyzeOptions` (research-only; defaults = M1, tested). Optional `BlockContext.overlay`. **No change to the M1 decision model.**

**Verification**
- `npm run check`: typecheck (3 configs) ✔, lint ✔. See the final test count in the M2 report.
- Dev results (EVALUATION_PLAN.md §9):
  - veiltrace: TP 12, FP 4, TN 18, FN 2, localization 12/12
  - B0: TP 14, FP 8, TN 14, FN 0
  - 0 network requests during scans
- Research (DETECTION_MODEL.md §10): P1 and P2 proposed (D-029). K = 8 kept. Semantic containers kept.
- Perf (`eval/results/perf.json`): dev total p50 ≈ 1.3 ms; large synthetic pages 34–224 ms; 2,000 DOM mutations → 1 notification.

**Not done / deviations**
- No rule changes applied (owner instruction). P1/P2 await approval.
- Extractor line coverage is not instrumented (D-030).
- No real third-party pages were saved for perf (no third-party content in the repo). Synthetic large pages were used instead.
- The real `chrome.dom.openOrClosedShadowRoot` and isolated-world behavior are deferred to M3.

**Next:** M3 only after explicit owner approval.

## 2026-10-21 · M2 step 1 · Held-out test split frozen (D-022)

- Playwright 1.64.1 added (dev) with Chromium headless shell 156. This was the only network access, at tooling install time.
- `corpus/test`: 26 scenarios written before the extractor existed. Structural validation (`npm run eval -- validate --split test`) passed: labels, hashes, offline loading (0 external requests), interaction steps and evidence selectors. **No detection was run on the test split.**
- Manifest aggregate `954070c4…de85e`.

## 2026-10-21 · M1 Detection core · **Provisionally accepted by owner; initial M1 commit**

**Done**
- Docs reconciled with the owner's M1 corrections before coding: the three-class result model with separate confidence and action risk (D-017), strong vs weak pretexts (D-018), regions and the window (D-019), negation and demotion (D-020), approved M4 targets (D-011), highlighting marked as planned M3, no real-time claims (D-004).
- `git init` (branch `main`), Apache-2.0 `LICENSE` (SHA-256 `cfc7749b…d30`, the official text), `NOTICE`, `.gitignore`.
- Scaffold: TypeScript 6 strict (core config has no DOM/Node types), esbuild 0.28 build (`dist/core.mjs`, 48 KB), Vitest 5, ESLint 10 with the core-purity rule. Zero runtime dependencies. Dev dependencies pinned exactly. esbuild's postinstall script was **not** approved and is not needed.
- `src/core`: types, normalize (offset map, zero-width, NFKC, confusables), lexicons (115 entries: 45 EN, 47 ID, 23 language-neutral), observe (matching, negation/reported binding), regions, correlate (windows, R1–R5, two-pass), modifiers, analyze, public index.
- Dev scenarios in snapshot form: 27 scenarios (9 positive, 12 hard negative, 6 ambiguous/adversarial; 17 EN, 10 ID) + 3 documented known limitations.

**Verification** (`npm run check`, 2026-10-21)
- typecheck ✔, lint ✔, **202/202 tests passed**.
- Coverage of `src/core`: 98.14% statements, 90.94% branches, 98.93% functions, 98.52% lines.
- 5,000-block synthetic snapshot: ~211 ms in Node (CI bound 1 s).
- Lint purity probe: 9 forbidden patterns are rejected in `src/core`. The esbuild bundle contains no network/dynamic-code identifiers.

**Deviations from the plan**
- Selection ranks candidates by final classification before rule precedence, and each window is evaluated in two passes. Added after a dev-scenario walkthrough showed that a reported decoy could absorb a real lure.
- The negation scope also ends at conjunctions (adversarial "do not refresh and press Win+R").
- `C.OVERLAY`/`C.UGC` deferred to M4 as planned. Lexicon counts meet AC4 (≥ 5 per language-dependent signal per language).

**Known limitations (documented, test-pinned):** FP S-N8 (internal IT notice → R4), FP S-L2 (troubleshooting doc → R4), FN S-L3 (paraphrase), modifier evasion via planted reported speech / educational cues / quotation markup (THREAT_MODEL.md §5, DETECTION_MODEL.md §8).

**Next:** M2 requires explicit owner authorization. The M2 research tasks R-1…R-8 are recorded in IMPLEMENTATION_PLAN.md (M2 section) and are not started.

## 2026-10-21 · M0 Research & specification · **Complete, pending owner review**

**Done**
- The working directory was empty. The project starts from scratch, and no prior architecture was reused.
- Inspected the source of Nehboro (`f67efb7205`), ClipShield (`1b55b4ecbd`) and ClickFixMitigator (`ae0e514493`), plus the Malwarebytes Browser Guard product page and the Opera Paste Protect announcement. Findings are in COMPETITIVE_ANALYSIS.md.
- Reviewed Chrome docs (activeTab, content scripts/isolated worlds, `chrome.dom`), MDN `host_permissions`, Extension Workshop (Firefox for Android) and the Microsoft ClickFix write-up, plus persuasion-detection literature.
- Wrote README.md, CLAUDE.md and docs/{PRODUCT_SPEC, RESEARCH, COMPETITIVE_ANALYSIS, ARCHITECTURE, THREAT_MODEL, DETECTION_MODEL, PRIVACY_SECURITY, EVALUATION_PLAN, IMPLEMENTATION_PLAN, DECISIONS, PROGRESS}.md.

**Not done (by design)**
- No code, dependencies, git repository or commit.

**Verification**
- Documents cross-checked for consistent IDs (T*, A.*/P.*/C.*, R1–R5, S-P*/S-N*, D-0xx, M1–M7).

**Blockers / owner decisions needed before M1**
- D-010 license, D-004 on-demand scanning trade-off, D-006 build tool, D-009 documentation language.
- D-011 acceptance targets (needed before M2 freezes the test split).
- Permission to `git init` (and later to commit).

**Next:** M1, the core engine on hand-written snapshots (see IMPLEMENTATION_PLAN.md).
