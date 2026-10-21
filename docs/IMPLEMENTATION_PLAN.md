# Implementation Plan

Status: M1 accepted (`d856fbd`). Held-out split frozen (`407beb0`). M2 accepted (`70c5697`). M3 accepted (`64e632a`, manual production validation recorded in PROGRESS.md). M4.1 accepted (`7088de0`, experimental rule set `m4.1-rc1`, not default). M4.2 accepted (release engineering, bilingual UI). M4.3A accepted (engine 0.2.0, preregistration, tag `eval-freeze-v1`). M4.3B done: held-out evaluation v1 executed once, with targets missed for recall, precision and FPR (docs/EVALUATION_RESULTS.md, D-059). M4.4 accepted (demo site, presenter guide, hard-negative and evasion tables, release candidate v0.5.0; manual checklist N1–N14 confirmed by the owner). Every milestone is independently testable and ends with a PROGRESS.md entry. No milestone is started before the previous one's acceptance criteria are met or explicitly waived in DECISIONS.md.

## Milestone overview

| M | Name | Output | Browser needed? |
|---|---|---|---|
| M0 | Research & specification | `docs/*`, README, CLAUDE.md | No |
| M1 | Core engine on hand-written snapshots | `src/core`, unit tests | No |
| M2 | DOM extractor + dev corpus + evaluation harness + baseline B0 | `src/extract`, `corpus/dev`, `scripts/eval` | Headless Chromium (Playwright) |
| M3 | Chromium extension MVP | `src/extension`, loadable `dist/` | Chrome |
| M4 | Hardening, held-out evaluation, demo | `docs/EVALUATION_RESULTS.md`, demo script | Chrome |
| M5 | Firefox desktop + Android spike | Compatibility report, adapter | Firefox, Fenix |
| M6 | Coverage expansion (T5/T6), optional auto-scan, settings | New rules + fixtures | Chrome |
| M7 | Optional AI design (doc + flag-gated prototype) | Design doc | — |

The hackathon demo needs **M1–M4**. M5+ are stretch goals.

---

## M1: Core engine on hand-written snapshots

**Scope:** repository scaffold (package.json, tsconfig strict, esbuild build for the core, Vitest, ESLint with the core-purity rule). Typed `PageSnapshot`, `Region`, `Signal`, `Observation`, `Finding` and `AnalysisResult`. Normalization with an offset map. EN + ID lexicons for all signals in DETECTION_MODEL.md §4. Region grouping and windowed correlation. Rules R1–R5 with documented precedence. Context modifiers `C.NEGATION`, `C.QUOTED`, `C.REPORTED`, `C.EDUCATIONAL` and `C.CODE_EXAMPLE`. The three-class result model with separate confidence and action risk (D-017).

**Out of scope:** any DOM code, the extension UI, browser permissions, highlighting, clipboard interception, AI, telemetry, `C.OVERLAY`/`C.UGC` (M4).

**Acceptance criteria**
1. `npm test` passes from a clean clone with `npm ci`. Zero runtime dependencies in package.json.
2. ESLint fails if `src/core/**` references `window`, `document`, `chrome`, `browser`, `fetch`, `XMLHttpRequest`, timers, `Date.now` or `Math.random`. A test lints a deliberate violation and proves the rule fires.
3. Normalization tests: zero-width removal, NFKC (full-width), a Cyrillic homoglyph fold, and whitespace collapse. "Windows + R" / "Win+R" / "⊞ + R" / "tombol Windows dan R" all produce an `A.OPEN_RUN` observation. Every observation satisfies `text === sourceText.slice(start, end)` (checked over all fixtures).
4. Every lexicon entry has ≥ 1 example that the test suite asserts it matches. For each language-dependent signal (`A.OPEN_RUN`, `A.PASTE`, `A.EXECUTE`, `P.HUMAN_VERIFY`, `P.FAKE_FIX`), EN and ID each have ≥ 5 entries (language-neutral key combos counted separately). `A.COMMAND` has ≥ 8 language-neutral strong patterns.
5. Snapshot fixtures cover positive, negative, ambiguous and cross-region cases, in EN and ID: at least S-P1, S-P2, S-P3, S-P7, S-N1, S-N2, S-N3, S-N4, S-N5, S-N6, S-N7 and S-N8 in snapshot form, each asserting the verdict and rule ID.
6. **Locality tests:** (a) a strong pretext in region A + an execution chain in region B gives no R1–R4 finding, and at most R5 in B; (b) the same content in one region gives R1; (c) blocks further apart than K inside one region do not correlate.
7. A test asserts that changing `snapshot.url` and `snapshot.title` does not change the result (domain independence).
8. Determinism: `analyze` on the same snapshot gives deep-equal results. A 5,000-block synthetic snapshot is analyzed under 1 s in Node (generous CI bound; the actual time is logged).
9. The esbuild bundle of the core builds and contains no network API identifiers (test).

## M2: Extractor, dev corpus, evaluation harness, baseline

**Scope:** `src/extract` (TreeWalker, visibility, blocks, locators, open shadow roots, same-origin frames, budgets, hidden copy candidates, copy triggers), the IIFE build of the extractor, `corpus/dev` HTML fixtures, `scripts/eval` (Playwright serves the corpus locally with network egress blocked, injects the extractor, runs the core and B0, writes `eval/out/dev.json` + a markdown table), and **test-split authoring + freeze** (requires commit approval).

**Acceptance criteria**
1. Extractor unit/integration tests in Playwright Chromium: (a) `display:none`, `visibility:hidden`, zero-size and `aria-hidden` text is excluded from blocks; (b) hidden `<textarea>` / `data-clipboard-text` content appears in `hiddenCopyCandidates`; (c) text in an open shadow root is extracted; (d) a 200k-node page sets `truncated: true` and returns within 500 ms; (e) the extractor performs zero DOM mutations (MutationObserver records 0 during the run).
2. Closed-shadow-root behavior documented with an observed result (works / doesn't from `executeScript`) in DECISIONS.md.
3. `corpus/dev` ≥ 12 scenarios covering at least S-P1, S-P3, S-P4, S-N1, S-N3, S-N4, S-N5 and S-N6. ≥ 40% Indonesian.
4. `npm run eval -- --split dev` runs offline (network blocked; the test fails if any non-localhost request occurs) and outputs precision, recall, FPR on hard negatives, the classification confusion matrix, localization accuracy and p50/p95 timing, for **both** VEILTRACE and B0.
5. `corpus/test` contains ≥ 16 scenarios written from the §6 descriptions. Frozen in one commit (after user approval). The SHA-256 of the directory listing and contents is recorded in PROGRESS.md. The harness refuses `--split test` without `--final`.

### M2 research tasks (required by the owner at M1 review; not yet implemented)

Each task produces a written result in `docs/RESEARCH.md` §6 (or a new `docs/EVALUATION_RESULTS.md` section) and, where it leads to a rule change, a DECISIONS.md entry. **All tuning uses the dev split only.**

| ID | Task | Method / evidence required |
|---|---|---|
| R-1 | Evaluate R4 false positives against legitimate technical documentation and internal IT instructions | Add ≥ 10 dev hard negatives (EN + ID): vendor install docs, troubleshooting pages, internal IT notices. Report R4 rate. Evaluate candidate fixes (e.g. ≥ 2 weak families, or excluding `P.AUTHORITY` alone) with before/after counts. Known cases: S-N8, S-L2 |
| R-2 | Investigate context-modifier evasion, especially misuse of reported-speech markers | Adversarial dev fixtures that plant reported speech, educational cues and blockquote markup around real lures. Measure demotion rate. Assess mitigations (e.g. ignore reported cues inside dialogs/overlays, require third-person subject agreement) |
| R-3 | Evaluate whether the 8-block correlation window remains appropriate with real DOM extraction | Distribution of lure spans (in blocks) on extracted HTML fixtures. Sensitivity sweep K ∈ {4, 6, 8, 12, 16} on dev: recall/FP per K |
| R-4 | Compare region-local correlation with the page-level B0 baseline | Implement B0 as specified (EVALUATION_PLAN.md §5). Report both on identical dev fixtures with raw counts |
| R-5 | Test evidence localization against actual HTML elements | Resolve observation sources → elements via `locator` in Playwright. Check containment in `regionContainsSelector`. Report localization accuracy |
| R-6 | Measure performance on realistic page structures | Extraction + analysis p50/p95 on fixtures and ≥ 3 large saved real pages. Profile the lexicon pass (115 regexes per block, ~211 ms per 5,000 synthetic blocks at M1) |
| R-7 | Expand Indonesian and English hard-negative scenarios | Target ≥ 8 hard negatives per language in dev, including informal Indonesian and code-mixed ID/EN text |
| R-8 | Preserve the frozen held-out test set and prevent evaluation leakage | Author `corpus/test` from scenario descriptions before any R-1/R-2 tuning. Freeze it in a single commit (owner approval) with a recorded hash. Harness refuses `--split test` without `--final`. CI check for verbatim lexicon/test overlap |

### M2 outcome (2026-10-21)

| Acceptance criterion | Result |
|---|---|
| 1. Extractor visibility, hidden payloads, shadow DOM, budgets, no mutation | Met. 18 Playwright tests (`tests/browser/extract.test.ts`); budgets hit as designed. A 200k-node page was not used; the node budget was tested at 30k elements with `maxNodes` 20k |
| 2. Closed-shadow behavior documented with an observed result | Met. Not readable without an adapter (counted heuristically); readable through a simulated adapter. The real `chrome.dom` call from an isolated world is deferred to M3 |
| 3. `corpus/dev` ≥ 12 scenarios incl. listed IDs, ≥ 40% ID | Met. 36 scenarios, 16 ID (44%) |
| 4. Offline `npm run eval -- run --split dev` with all metrics for veiltrace and B0 | Met. 0 requests during scans; `dev.json` byte-identical across runs |
| 5. `corpus/test` frozen with a recorded hash; harness refuses test without `--final` | Met (D-022, `407beb0`, tested) |

| Research task | Outcome (details: DETECTION_MODEL.md §10, EVALUATION_PLAN.md §9) |
|---|---|
| R-1 R4 false positives | 4/22 dev FPs, all R4. P1 (no authority-only R4) proposed: −2 FP, no recall loss. `minFamilies=2` rejected (loses 2 real lures). Troubleshooting-doc FPs remain open |
| R-2 Modifier evasion | Confirmed: planted reported speech and blockquote cause 2 FNs, and a planted educational cue causes a one-tier demotion. P2 (no demotion inside dialogs/overlays) proposed: recovers all 3 with no new FP on dev |
| R-3 Window K | K = 6…∞ identical on dev, K ≤ 4 loses lures. Keep 8; dev pages are small, so revisit on larger pages |
| R-4 Region-local vs B0 | Hard-negative FPR: veiltrace 4/22 vs B0 8/22. Recall: 12/14 vs 14/14. Ablations attribute −1 FP to locality and −3 FP to context modifiers |
| R-5 Evidence localization | 12/12 TPs fully inside `evidenceWithin` (resolved in the live DOM, across shadow/frame). Dev lures are compact, so this is a weak test |
| R-6 Performance | Dev fixtures: total p50 ≈ 1.3 ms. Large synthetic pages: 34–224 ms. Analysis dominates on big pages. The block budget truncates 2 of 5 perf pages |
| R-7 Hard negatives | 11 EN + 11 ID dev hard negatives (target ≥ 8 each) |
| R-8 Held-out protection | Frozen before any M2 work, hash-checked in CI, CLI guards, leakage check (≥ 6-word sentences) |

### Carried forward from the M2 review
- **Next controlled detection-rule revision** (its own milestone step, before any held-out run): implement P1 (D-031), and design and evaluate P2-v2 (D-032) with benign modal/tutorial dev counterexamples. Ship as a new engine version with a dev report, and keep M1 results for comparison.
- **Testing milestone:** browser-side coverage instrumentation for `src/extract` if practical (D-030); behavioral tests stay the priority.
- **Budget review:** re-measure the 1,500 ms extraction budget on real hardware in M3 (D-027 provisional).

## M3: Chromium extension MVP

**Scope:** `manifest.json` (`activeTab`, `scripting` only), popup (scan button, auto-scan on open, verdict header, finding list, detail view with observed/inferred/modifiers/coverage), "Show on page" highlight, "Rescan", a test-only build variant with `host_permissions: ["http://localhost/*"]` for e2e (never shipped; D-013).

**Acceptance criteria**
1. `npm run build` produces `dist/` loadable via chrome://extensions → Load unpacked on current Chrome stable without warnings. The install prompt shows no host-permission warning.
2. CI assertion: the shipped manifest's permissions equal exactly `["activeTab","scripting"]`, with no `host_permissions` and no `content_scripts`.
3. CI grep on `dist/` (shipped build): no `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, `innerHTML =`, `eval(` or `new Function`.
4. Playwright e2e (test build): opening S-P1 and the popup shows verdict **Manipulative instruction**, rule `R1`, ≥ 2 observed snippets, and "Show on page" outlines an element matching the label's `regionContainsSelector`. On S-N1 it shows no suspicious or manipulative finding. The network log shows zero requests initiated by the extension.
5. XSS test: a fixture whose instruction text contains `<img src=x onerror=…>` renders literally in the popup, and no script executes (a console/dialog listener asserts nothing fired).
6. Manual demo checklist in `docs/DEMO.md`, executed once with screenshots attached to PROGRESS.md.

### M3 outcome (2026-10-21)

| Owner acceptance criterion | Result |
|---|---|
| Production extension installs in Chromium | Met: loaded unpacked in Chromium (Playwright `channel: 'chromium'`, new headless). The popup loads and permissions are verified at runtime |
| On-demand scan of an eligible page | Met: scanning starts only on "Scan page" (no injection before the click, tested). The real toolbar gesture was validated manually on stable Chrome (docs/DEMO.md, PROGRESS.md) |
| Popup shows actual core results | Met: the report is built from `analyze()` in the tab and is unit-tested to match the core's decision |
| Evidence highlighting when resolvable | Met: highlight, cleanup, shadow DOM, same-origin frame and strict-CSP pages tested. Stale and hidden evidence are reported, never claimed |
| Partial scans and failures clearly reported | Met: block-budget and frames-skipped shown in the UI. Protected page, `file://`, closed-tab and malformed-report states exist (malformed: unit-tested). The timeout reason is covered by the M2 extractor tests, but not E2E, because production has no option to force it |
| Existing M1/M2 tests green | Met: 280/280 kept (316 total with M3) |
| Extension E2E tests pass | Met: 27 E2E tests (17 functional, 8 security/permission, 2 performance) |
| Detection unchanged | Met: `src/core` diff vs M2 = 0 lines; dev evaluation artifacts byte-identical to M2 |
| No external requests during scanning | Met: request log unchanged across scan + highlight; popup `fetch` blocked by CSP |
| Minimal production permissions | Met: `activeTab`, `scripting` only. Runtime check passed, and injection without a gesture was refused |
| Held-out corpus untouched | Met: no diff in `corpus/test`; manifest verified |

The M3 plan items above that the owner brief superseded: the UI was built as a full evidence UI (§4 of the brief) instead of the minimal M0 list. "Copy report" is not implemented (planned).

## M4.1: Controlled detection refinement (2026-10-21, accepted as experimental)

| Owner requirement | Result |
|---|---|
| Baseline reproduced | M3 on dev36 reproduced byte-identically (TP 12, FP 4, TN 18, FN 2). The M3 baseline on the extended dev50 set: TP 16, FP 6, TN 23, FN 5 |
| P1 evaluated | P1: −2 FP, +1 FN (D42). Refined to P1b: −2 FP, 0 FN; the authority observation is preserved |
| P2 redesigned | P2-A (concealed payload) included. Gate variants P2-B/C/D rejected with counterexamples (D37, D38) |
| Remaining R4 FPs | R4-β `C.PROCEDURAL`: −5 FP, 0 FN. Remaining: a docs dialog (D39) |
| `C.OVERLAY` / `C.UGC` | Measured; not added as modifiers (D-045) |
| Regression tests | `tests/m41.test.ts` (22 tests) + 14 new dev scenarios in the browser corpus test |
| Performance and compatibility | No measurable change (≈ 153 ms per 5k blocks); permissions, architecture and network unchanged |
| Held-out | Not evaluated; `corpus/test` unchanged |
| Recommended engine | `0.2.0-rc.1` (`ruleset: 'm4.1-rc1'`), approved as **experimental**; the default stays `0.1.0-m1` (D-041) |
| Owner safeguards | Window-level payload association, override evidence, documentation with hidden copy targets, R4-β evidence preservation, attacker articles, P1b vs stronger rules, determinism: 7 safeguard tests (D-047) |

## Potential High-Assurance Deployment (roadmap; planning only, D-048)

None of the items below is implemented. They are candidates for M4.2+ and require owner approval. Separation of implemented vs planned vs hypotheses vs potential applications: PRODUCT_SPEC.md §9.

| # | Consideration | Proposed milestone | Notes |
|---|---|---|---|
| 1 | Offline and restricted-network deployment | **M4.2: done** | Runtime offline; offline build via `npm ci --offline` verified; DEPLOYMENT.md §2 |
| 2 | Supply-chain security: SBOM, dependency audit | **M4.2: done** | CycloneDX SBOMs, license review (2 MPL-2.0 dev-only, accepted), lockfile check, `npm audit` 0 findings; RELEASE.md §4 |
| 3 | Reproducible builds and artifact integrity | **M4.2: done** | Deterministic ZIP + manifest + SHA256SUMS + verifier; two clean builds identical; RELEASE.md §3 |
| 4 | Secure distribution and updates | M4.3 (assessed in DEPLOYMENT.md §5) | Signed CRX via an internal update URL, or Chrome Web Store unlisted; version pinning; rollback |
| 5 | Managed-browser deployment feasibility | M4.2 assessment done (DEPLOYMENT.md §3); end-to-end test M4.3 | Chrome enterprise policies (`ExtensionInstallForcelist`, `ExtensionSettings`), as a documentation and feasibility test only |
| 6 | Indonesian detection and UI | **M4.2: UI done** | Indonesian popup (D-049). The informal-Indonesian lexicon gap (D44) remains for a future controlled rule revision |
| 7 | Privacy-preserving incident reporting (strictly opt-in) | M4.4+ | User-initiated local export of a redacted finding (no URL query, no page text beyond evidence snippets). Any transmission needs a separate design and review |
| 8 | Organizational threat model and security review | **M4.2: threat model done** | THREAT_MODEL.md §7 (O1–O9). An independent security review remains future work |
| 9 | Coverage limitations and failure modes | **M4.2: done** | docs/OPERATOR_GUIDE.md |
| 10 | Compatibility with organizational security policies | M4.2 assessment (DEPLOYMENT.md §7); testing M4.3 | Behavior under strict CSP, disabled developer mode, restricted extension permissions, proxy-only networks |

Out of scope unless separately required and reviewed: centralized monitoring, employee surveillance, privileged endpoint access, military-specific operational features.

## M4.2: Release engineering, security hardening, high-assurance readiness (2026-10-21, accepted)

| Owner requirement | Result |
|---|---|
| Supply chain | CycloneDX SBOMs (toolchain 150 components, runtime 0); `npm audit` 0 findings; license review (MPL-2.0 ×2 dev-only, flagged and accepted); lockfile 199/199 with integrity, registry-only, dev-only; runtime deps 0 (D-051) |
| Reproducible release | Deterministic ZIP, release manifest, SHA256SUMS, verifier. Two independent clean builds byte-identical; `unzip -t` clean (D-050) |
| Indonesian UI | Full EN/ID popup, deterministic selection, session switch, evidence untranslated; tests in both languages (D-049) |
| Deployment feasibility | docs/DEPLOYMENT.md: implemented vs feasibility vs future |
| Threat model | THREAT_MODEL.md §7 (O1–O9) with evidence |
| Operator guide | docs/OPERATOR_GUIDE.md |
| Performance / compatibility | Re-measured (no regression); Edge 155 automated smoke OK; branded Chrome automation impossible (D-053) |
| Detection / held-out | Unchanged; not evaluated |

## M4.3A: Engine adoption and pre-evaluation freeze (2026-10-21, awaiting review)

| Owner requirement | Result |
|---|---|
| Adopt `m4.1-rc1` as default | Engine `0.2.0`, ruleset `m4.1` (alias `m4.1-rc1`); P1b, P2-A, R4-β unchanged; no new rule, lexicon, modifier or threshold change; M1 via `{ ruleset: 'm1' }` (D-055) |
| Extension integration | Popup shows `C.PROCEDURAL`, overrides with explanation and evidence, classification, confidence, action risk and partial status; strict validator rejects unknown metadata (D-056). No new permission, network or storage |
| Reproducibility | `release:repro` builds candidates on a clean tree (D-057) |
| Preregistration | docs/EVAL_PREREGISTRATION.md, written before any held-out run (D-058) |
| Manual validation | DEMO.md v0.4.0 checklist in four categories; not executed |
| Held-out | Not evaluated; freeze tag not created |

## M4.4: Hackathon demo and release candidate (2026-10-21, accepted)

| Owner requirement | Result |
|---|---|
| Frozen engine | Engine 0.2.0 / `m4.1`, extractor, harness, held-out corpus and evaluation records unchanged |
| Demo site | `demo/nusaverta`: fictional help center with a third-party community widget containing a defanged ClickFix lure; benign state; developer-docs page; no JS, no external resources, no demo-specific code (D-061) |
| Presenter workflow | docs/PRESENTER_GUIDE.md: setup, 3- and 7-minute scripts, fallbacks, evaluation slide, limitations, Q&A |
| Domain invariance | Automated: 4 hosts with real extraction (`tests/browser/demo.test.ts`) and 2 hosts in the extension (`tests/e2e/demo.test.ts`); manual row N8 confirmed by the owner |
| M4 criterion 3 (hard negatives) | EVALUATION_PLAN.md §12 |
| M4 criterion 6 (evasion table) | THREAT_MODEL.md §5 with measured status; demo trust boundaries in §8 |
| Release candidate | Version 0.5.0 (D-060); development build verified and reproducible; candidate path verified in a throwaway clone; final candidate hashes after the commit (RELEASE.md §6) |
| Manual validation | DEMO.md v0.5.0 checklist N1–N14; confirmed by the owner |

### Remaining M4 acceptance criteria
- Criterion 1 (held-out run, results document) and criterion 2 (targets met or shortfall explained): done in M4.3B; targets missed and explained.
- Criterion 3: EVALUATION_PLAN.md §12 (the brief's seven types, from the existing unit, dev and recorded held-out evidence).
- Criterion 4 (trusted-looking local domain, no domain reputation): demo site plus domain-invariance tests.
- Criterion 5 (p95 timing): held-out total p95 2.4 ms (EVALUATION_RESULTS.md §2), machine-specific.
- Criterion 6: THREAT_MODEL.md §5.

## Research roadmap after M4: evaluation v2 (not started)
1. Fix the harness provenance ordering (check `git status` before writing outputs) and test it **before** preregistering v2 (D-059).
2. Commission a new held-out split from at least one independent author with no access to rules, lexicons or the v1 splits; native-speaker Indonesian; longer, realistic pages; strata for canonical lures, deliberate weakness probes and hard negatives; size chosen so the intervals can test D-011.
3. Freeze and hash it, then develop any engine revision (e.g. the EVALUATION_RESULTS.md §6 hypotheses) on dev data only, as a new engine version.
4. Preregister v2 (system, metrics, rerun policy), tag, run once, and publish next to v1.
5. Separately, a governed real-world sample (EVALUATION_PLAN.md §7) before any real-world claim.

## M4: Hardening, held-out evaluation, demo

**Scope:** modifiers `C.OVERLAY` and `C.UGC`. Tuning of M1 modifiers on the dev split. Lexicon expansion (dev split only). Perf pass. The final test-split run. `docs/EVALUATION_RESULTS.md`. A demo site on localhost styled as a legitimate organization page (fictional brand, no real-organization impersonation) with an injected malicious comment/widget.

**Acceptance criteria**
1. `npm run eval -- --split test --final` executed once on a tagged commit. Results are recorded in `docs/EVALUATION_RESULTS.md` with raw counts, Wilson intervals, the scenario table and the B0 comparison, **separately from dev results**.
2. Targets in EVALUATION_PLAN.md §8 are either met or the shortfall is explained (missed scenarios analysed, with no post-hoc changes to the test split).
3. All 7 named hard-negative types from the project brief have a scenario in the test split and a pass/fail row.
4. The demo shows detection on a local "trusted-looking" domain, explicitly demonstrating that domain reputation was not used (the core has no hostname input; a unit test asserts identical results when only `url` changes).
5. p95 timing meets the §8 targets or is reported with the bottleneck identified.
6. THREAT_MODEL.md evasion table updated with the measured results for the obfuscation and pseudo-element fixtures.

## M5–M7 (outline only; detailed criteria written when started)
- **M5:** Firefox desktop MV3 build via the adapter. A Fenix spike checks whether popup → `scripting.executeScript` works with `activeTab` on Android. The results decide MV2 vs MV3 for Android (D-015).
- **M6:** T5/T6 rules with fixtures. Optional per-site auto-scan via `optional_host_permissions` + debounced MutationObserver. `storage` for settings only.
- **M7:** Opt-in AI design satisfying PRIVACY_SECURITY.md §3. Prototype behind a build flag.

## Risk register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Legit troubleshooting docs with "fix" wording + a delivered command reach `suspicious_correlation` (R4) | False positives on hard negatives | Medium | Weak/strong pretext split (D-018), code-example demotion, measure on dev, report honestly |
| Small corpus, so metrics are noisy | Overclaiming | High | Raw counts, intervals, separate splits, no real-world claims |
| Lexicon overfitting to our own phrasing | Inflated results | Medium | Held-out split, verbatim-overlap CI check, a second author for test if possible |
| Playwright cannot trigger `activeTab` via a real toolbar click | e2e gap | High | Test build with localhost host permission (D-013). Manual checklist covers the real gesture |
| Closed shadow DOM / cross-origin iframe lures | Misses | Medium | Coverage notes in the UI. Measured in M2 |
| Firefox Android API gaps | M5 slip | Medium | Not on the hackathon critical path |
| Hackathon time pressure tempts scope creep (more rules) | Unfinished evaluation | Medium | The evaluation (M4) is prioritized over rule count |
