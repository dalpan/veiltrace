# Progress Log

Newest entry first. Each entry: date, milestone, what was done, verification, what is next, blockers.

---

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
