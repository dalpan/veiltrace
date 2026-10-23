# Decision Log

Format: ID · status · date · decision · rationale · consequences.
Statuses: **Accepted** (approved by the project owner or fixed by the brief) · **Proposed** (awaiting approval) · **Open** (needs input) · **Superseded**.

Never silently change an Accepted decision. Add a new entry that supersedes it.

---

### D-001 · Accepted · 2026-10-21 · Offline-first; no backend, database or cloud
Source: project brief §2/§5. The core detection engine runs locally without network. Consequence: no IOC feeds and no reputation lookups in the core.

### D-002 · Accepted · 2026-10-21 · Deterministic rules for the MVP; no LLM dependency
Source: project brief §5/§6. AI may come later only as opt-in (PRIVACY_SECURITY.md §3).

### D-003 · Accepted · 2026-10-21 · Pure core + serializable `PageSnapshot` boundary
The core is `analyze(snapshot) → result` with no browser or DOM APIs. Approved with M1 authorization ("browser-independent detection core"). Rationale: cross-browser reuse, Node-based testing and a reproducible evaluation.

### D-004 · Accepted · 2026-10-21 · On-demand scanning via `activeTab` (no auto-scan in MVP)
Approved by the owner. **No claim of real-time or proactive protection** may be made in docs, UI or the demo. Auto-scan remains an M6 option behind per-site optional permissions.

### D-005 · Accepted · 2026-10-21 · No background service worker in the MVP
The popup calls `scripting.executeScript` directly. Confirmed in M3: no concrete need for a background arose.

### D-006 · Accepted · 2026-10-21 · esbuild instead of Vite
Approved by the owner. Vitest is used for tests.

### D-007 · Accepted · 2026-10-21 · Decision table instead of an additive weighted score
The owner instructed to avoid a generic weighted score that undermines explainability. Superseded in part by D-017 for the result model.

### D-008 · Accepted · 2026-10-21 · Inform, don't block
The MVP never blocks navigation or modifies page content (except a user-requested highlight in M3).

### D-009 · Accepted · 2026-10-21 · English documentation and code; Indonesian conversation with the owner
Detection lexicons are bilingual (ID/EN) by design.

### D-010 · Accepted · 2026-10-21 · License: Apache-2.0
`LICENSE` contains the Apache License 2.0 text. `NOTICE` names the project. GPL-3.0 code (ClipShield) and unlicensed code (Nehboro) must not be incorporated.

### D-011 · Accepted · 2026-10-21 · M4 research targets
Held-out recall ≥ 85%, precision ≥ 90%, hard-negative FPR ≤ 10%, evidence localization ≥ 95%, 0 external network requests during scanning. These are research targets, not guarantees. Report raw counts, uncertainty intervals, corpus composition and limitations. See EVALUATION_PLAN.md §8.

### D-012 · Accepted · 2026-10-21 · Clean-room implementation; no third-party competitor code
Approved with the M1 constraints. Pattern lists, regexes and code are not copied. All lexicon entries in `src/core/lexicon/` were written for this project.

### D-013 · Accepted (refined by D-038) · 2026-10-21 · Test-only build with host permissions for e2e
Playwright cannot perform the real toolbar gesture that grants `activeTab`. CI must assert that the shipped manifest does not contain it. Decide in M3.

### D-014 · Open · Project name
"VEILTRACE" is a working name. No trademark/name-collision check has been done.

### D-015 · Open · Firefox for Android manifest version
Extension Workshop recommends MV2 for Android. Decide after the M5 spike.

### D-016 · Accepted · 2026-10-21 · Corpus samples are reconstructed and defanged; no live malicious URLs in tests
See PRIVACY_SECURITY.md §5.

### D-017 · Accepted · 2026-10-21 · Three-class result model; confidence and action risk are separate fields
Owner correction to M0. Findings are `observed_instruction`, `suspicious_correlation` or `manipulative_instruction`. A risky instruction alone (command, key sequence, clipboard step) is only `observed_instruction` and is not a positive detection. `confidence` (evidence strength) and `actionRisk` (harm if followed) are separate from classification. Supersedes the M0 single-severity model (R2 "exec chain without pretext → medium").

### D-018 · Accepted · 2026-10-21 · Strong vs weak pretexts
Only `P.HUMAN_VERIFY` is a strong pretext, because a page asking the reader to run a command to "prove you are human" has no legitimate counterpart we know of. `P.FAKE_FIX`, `P.URGENCY` and `P.AUTHORITY` are weak, because they occur routinely in legitimate troubleshooting, billing and account pages. Weak pretexts can produce at most `suspicious_correlation`. Rationale: hard-negative FPR target (D-011).

### D-019 · Accepted · 2026-10-21 · Region = consecutive blocks with the same `containerId`; correlation window K = 8 blocks
Signals never correlate across regions. A dedicated test asserts that a pretext in one region cannot raise an instruction in another. K and the container boundaries may be tuned on the dev split only.

### D-020 · Accepted · 2026-10-21 · Negation removes actions before correlation; reported speech and quotation demote
Negated actions ("never press Win+R", "jangan pernah tekan…") are not instructions to the reader and are excluded from rule evaluation. Reported speech, quotation, educational framing and code examples demote the classification (cap 2 tiers, floor `observed_instruction`) and lower confidence one level each. Affirmative idioms ("don't worry", "jangan lupa") do not count as negation.

### D-021 · Accepted · 2026-10-21 · Git repository initialized; no commit without owner review
Owner authorized `git init`. Commits wait for review of the M1 implementation and test results.

### D-022 · Accepted · 2026-10-21 · Held-out test split frozen before any M2 extractor or rule work
`corpus/test` holds 26 HTML scenarios (12 malicious, 14 benign hard negatives, 11 Indonesian) with SHA-256 manifest aggregate `954070c4cab79ba112907810fdc21e02ac5008c2348597b7063f6fed0bdde85e`. Owner-authorized freeze commit. Controls: `tests/corpus.test.ts` fails on any file change, `npm run eval` refuses detection on `--split test` without `--final`, and refreezing needs `--refreeze` plus a new decision entry. The leakage check fails on shared sentences of ≥ 6 words. Six shorter canonical lure phrases overlap with the lexicon by design and are documented in `corpus/test/README.md`. Labels are ground truth of intent assigned without running VEILTRACE. Known bias: same author as the rules.

### D-023 · Accepted · 2026-10-21 · `aria-hidden` does not hide text from extraction
VEILTRACE models what a sighted user sees. `aria-hidden="true"` only affects assistive technology, and an attacker could set it on a visible lure to evade. Visibility is decided by rendering (client rects, computed visibility/opacity/clip), not ARIA. This supersedes the M0 ARCHITECTURE draft, which listed `aria-hidden` as hidden.

### D-024 · Accepted · 2026-10-21 · Extractor semantics (M2)
Text is visible when its text node has a ≥ 1×1 px client rect that is not off-page, its element's computed `visibility` is `visible` and its `font-size` is non-zero, and no ancestor has `opacity: 0` or is clipped. Blocks are per block-level box, in reading order. Containers come from semantic boundaries (dialog, overlay, ugc, article, section, aside, nav, header, footer, main, form, landmark roles, shadow host, frame, body). Details are in ARCHITECTURE.md §3. Owner review requested, because these choices shape region boundaries.

### D-025 · Accepted · 2026-10-21 · Extractor privacy rules
The extractor never reads password/hidden/non-text input values, fields whose name, id or autocomplete suggests secrets or personal data, or anything the user typed (`.value`). Only page-authored `defaultValue`, `placeholder` and `data-clipboard-text` are read. Enforced by tests.

### D-026 · Accepted · 2026-10-21 · `data-clipboard-text` payloads are clipboard-staged content even when also visible
The extractor records them as hidden copy candidates regardless of visibility, because the attribute is what will be copied and may differ from what is shown. Consequence: a docs copy button with a strong command counts as a delivery path. That is still `observed_instruction` without a pretext.

### D-027 · Accepted (provisional) · 2026-10-21 · Extractor time budget 1,500 ms (was 300 ms in the M0 draft)
Measured extraction on 15k-element pages is ~100–120 ms, so 300 ms would truncate too eagerly on slower devices. The block budget (5,000) is the binding limit in practice. Revisit after M3 measurements on real hardware.

### D-028 · Accepted · 2026-10-21 · `AnalyzeOptions` are research-only
*Updated by D-055:* omitted options now mean engine 0.2.0; M1 behavior needs `{ ruleset: 'm1' }`. `analyze(snapshot, options?)` kept M1 behavior when options were omitted (tested). Baselines, ablations and dev research use options. The extension (M3) must call `analyze(snapshot)` with defaults, and changing a default requires a new decision.

### D-029 · Superseded by D-031 and D-032 · 2026-10-21 · Rule changes P1 (R4 ignores authority-only pretext) and P2 (no context demotion inside dialogs/overlays)
Evidence on dev only (DETECTION_MODEL.md §10): P1 removes 2 of 4 R4 FPs with no recall loss, and P2 recovers all 3 modifier-evasion lures with no new FP. **Awaiting owner approval.** If approved, apply as a new engine version and validate on the frozen test split at M4. If not approved, the M1 model stays as is.

### D-030 · Accepted · 2026-10-21 · Extractor line coverage is not instrumented (instrument in a future testing milestone if practical)
The extractor runs inside Chromium, where V8 coverage from Vitest/Node does not reach. It is verified behaviorally instead: 18 targeted Playwright tests, 36 dev scenarios through the real extractor (offsets, offline, evidence resolution), the perf pages, and a lint rule plus bundle checks. Browser-side coverage (Playwright JS coverage) can be added if the owner wants a number.

### D-031 · Accepted (future rule revision; NOT implemented) · 2026-10-21 · P1: R4 does not escalate on an authority-only pretext
Owner-approved at M2 review. In the next controlled detection-rule revision, R4 must not produce `suspicious_correlation` when `P.AUTHORITY` is the only weak pretext family. The finding must still be reported as `observed_instruction`, and the `P.AUTHORITY` observation is preserved in the output. Until then, the engine stays at the M1 model (`0.1.0-m1`), and `experimental.r4ExcludeAuthorityOnly` exists only for research. The revision must ship as a new engine version, with dev evidence, before any held-out run.

### D-032 · Rejected in current form · 2026-10-21 · P2: unconditional "no demotion inside dialogs/overlays"
Owner decision at M2 review. Overlay or dialog presence alone must not disable contextual demotion: benign modals and tutorials (cookie/consent dialogs quoting text, in-app tutorials, help overlays with code examples) would lose their protection. A redesign must (a) require evidence of a **direct behavioral instruction targeting the current user** (e.g. second-person imperative steps, interaction controls such as a copy/verify button, or a staged clipboard payload in the same region) before demotion is skipped, and (b) come with benign modal/tutorial counterexamples in the dev split that keep their demotion. `experimental.noDemotionInDialogs` is kept **only to reproduce the M2 research table** and must not be used as a basis for the redesign's claims.

### D-033 · Accepted · 2026-10-21 · Explicit partial-scan reporting
`SnapshotCoverage.partial?: PartialReason[]` lists why a scan is incomplete: `node-budget`, `block-budget`, `char-budget`, `timeout`, `block-text-capped`, `aux-capped`, `frames-skipped`, `closed-shadow-skipped`. `scanStatus(result.coverage)` in the core returns `{ complete, reasons }` and adds `core-truncated`. These are reporting only and never change findings (tested). As part of this, a defect was fixed: an over-long single block used to stop the whole walk. It now caps only that block (reported as `block-text-capped`) and the scan continues. `ctx.ariaHidden` is recorded as metadata (D-023) at block-owner/container granularity.

### D-034 · Accepted · 2026-10-21 · Evaluation artifacts in git
Only the deterministic, compact artifacts are committed: `eval/results/dev.json`, `dev.md`, `dev.research.json` and `dev.research.md`, which are byte-identical across runs on the same commit. Timing files (`*perf*.json`) are machine-specific and git-ignored. Build output (`dist/`), coverage reports, browser traces and screenshots are never committed.

### D-035 · Accepted · 2026-10-21 · No extension messaging surface
No `runtime.onMessage`/`onMessageExternal`/`onConnect`, no `sendMessage`, no `externally_connectable`. All popup↔tab data flows through `chrome.scripting.executeScript` return values into the ISOLATED world. Rationale: pages cannot forge messages to a channel that does not exist. Enforced by ESLint on `src/extension` and by bundle checks.

### D-036 · Accepted · 2026-10-21 · Detection runs in the tab's isolated world; the popup receives a minimal report
`content.js` bundles the extractor and the core. Only `ScanReport` crosses to the popup: verdict, up to 50 findings, up to 12 evidence items each (≤ 300 chars, extractor locators), coverage, scan status, counts and timings. Rationale: data minimization (the raw page snapshot never enters an extension page), plus a small transfer (< 1 ms measured). Trade-off: `content.js` is 75 KB per injection (14–30 ms).

### D-037 · Accepted · 2026-10-21 · Highlight is a temporary overlay box, not a style change on the element
A single extension-owned `div` (CSSOM-styled, `pointer-events: none`, max z-index) is placed over the element after `scrollIntoView`, and removed after 5 s or at the next scan/highlight. The evidence element is never modified, clicked or focused. Status values are explicit, and the UI never claims a highlight that failed.

### D-038 · Accepted · 2026-10-21 · Separate production and test builds
`npm run build:ext` → `dist/extension` (production). `npm run build:ext:test` → `dist/extension-test`: host permissions for `https://*.test/*` and `https://*.example/*`, `?tab=` targeting and a 1.5 s highlight duration, all compiled in via `__VT_TEST__`. Tests assert that the production manifest and bundle contain none of it. The toolbar-click activeTab path is verified manually (`docs/DEMO.md`).

### D-039 · Accepted · 2026-10-21 · Pages whose URL Chrome withholds are treated as protected
Chrome gives no URL (and never an activeTab grant) for `chrome://` pages, other extensions and the Web Store. The popup treats a missing URL like a restricted scheme: it shows "This page cannot be scanned" and does not attempt injection.

### D-040 · Accepted · 2026-10-21 · Extractor locators are validated against a grammar before any use
`isSafeLocator` accepts only what `cssPath` produces (tag names, simple `#id`, `:nth-of-type(n)`, ` > `, `::shadow::`, `::frame::`). `resolveLocator`, the popup validator and the highlighter all enforce it, so a value round-tripped through the popup can never become an arbitrary selector. Extraction output is unchanged (dev results byte-identical to M2).

### D-041 · Accepted (experimental; not default) · 2026-10-21 · Experimental engine `0.2.0-rc.1` (ruleset `m4.1-rc1` = P1b + P2-A + R4-β)
*Superseded in part by D-055 (M4.3A): the rule set is now the default as engine `0.2.0`.* Owner-approved at the M4.1 review as an **experimental release candidate**, selectable only with `analyze(snapshot, { ruleset: 'm4.1-rc1' })`. The default engine stays `0.1.0-m1`, and the production extension stays on M1 (owner decision). Default equality with `d856fbd` was re-verified. Dev evidence (DETECTION_MODEL.md §11): FP 6 → 1, FN 5 → 5, TP 16 → 16 on 50 dev scenarios. **Not the default and not frozen.**

Known errors of rc1 on dev:
- **5 FN:** D10, D12 and D50 (planted reported speech or blockquote in a verification dialog without a payload), D43 (quoted lure in a forum comment), D44 (very informal Indonesian paraphrase outside the lexicon).
- **1 FP:** D39 (docs quick-start inside a dialog; R4-β deliberately excludes dialogs).

Limitations of the evidence:
- 50 synthetic dev scenarios written by the same author as the rules; R4-β targets failure modes known since M2, so the improvement is optimistic.
- The confidence intervals overlap, and no significance or real-world accuracy is claimed.
- The held-out split was not evaluated.

Making it the default would require a new owner decision, and then:
1. Make it the default with engine `0.2.0`.
2. Let the popup validator and labels accept `C.PROCEDURAL` and `overrides`.
3. Freeze the engine before the single held-out run (M4.x).

### D-042 · Accepted (experimental, part of D-041) · 2026-10-21 · P1b: authority-only R4 does not escalate unless clipboard staging is present
Implements the intent of D-031. Plain P1 created a new FN on a fake-support overlay with only an authority pretext (D42). P1b keeps R4 there because the region stages a concealed payload. The authority observation is always preserved in `observations`, and the finding falls to R5 (`observed_instruction`).

### D-043 · Accepted (experimental, part of D-041) · 2026-10-21 · P2 redesign: only a concealed clipboard payload overrides contextual demotion; dialog "gates" not included
- **P2-A (included):** it requires a hidden-copy payload with a strong command that is not visible anywhere on the page.
- **Gate variants (not included):** P2-B (suppress), P2-C (cap at 1) and P2-D (no reported list intro in dialogs) each recover 2–3 planted-context lures, but each misfires on a benign dialog counterexample (D38 quiz, D37 tutorial).

Overlay or dialog presence is never sufficient on its own (D-032 honored). **P2-C is rejected for rc1, not ruled out permanently:** it remains available as a research option (+3 TP, +1 FP on dev) and may be reconsidered with stronger evidence that separates terse benign dialogs from lures.

### D-044 · Accepted (experimental, part of D-041) · 2026-10-21 · `C.PROCEDURAL` modifier (R4-β)
Demotes one tier for R4 findings with exactly one weak pretext family, when every evidence block is in article context outside dialogs/overlays, the region contains a code/pre block and no concealed payload is staged. R1–R3 are never affected, and action risk stays as computed. It is DOM-evidenced and explained in the finding ("procedural document"). Remaining limitation: legitimate documentation shown in a *dialog* is not covered (D39).

### D-045 · Accepted · 2026-10-21 · `C.OVERLAY` and `C.UGC` are not added as decision modifiers
Measured on dev: overlay/dialog evidence appears in 15 malicious vs 3 benign strongest findings, and UGC in 3 vs 1. They are correlated, but not sufficient and biased by how the lures were written. Overlay/dialog context is used only as a *condition* inside other rules (it excludes R4-β; it gated the rejected P2 variants) and never raises risk. UGC may become a UI label later.

### D-046 · Accepted · 2026-10-21 · Dev split extended to 50 scenarios (D37–D50) before implementing M4.1 candidates
Seven benign counterexamples (tutorial and quiz modals, docs dialog, Indonesian troubleshooting, unrelated regions, "verify your Windows version", news list) and seven malicious cases (mixed pretext, authority-only with payload, quoted UGC lure, informal Indonesian paraphrase, concealed payload with educational cue or blockquote, reported framing in a dialog). The leakage check against the frozen test split passes. The M3 baseline on dev50 (TP 16, FP 6, TN 23, FN 5) is the comparison point; the dev36 baseline remains in `eval/results/dev.json` at commit `64e632a`.

### D-047 · Accepted · 2026-10-21 · Concealed payloads count only inside the instruction's correlation window; overrides carry evidence
Owner safeguard. A concealed clipboard payload (hidden-copy strong command whose text is not visible anywhere on the page) affects a candidate only when it lies in the same K = 8 block window. This applies to P1b, P2-A and the R4-β exclusion alike. A payload elsewhere in the same region has no effect (tested). `ContextOverride.evidence` lists the observation ids of the payload, or the verification pretext for the research-only gate, so every override is traceable. Dev results are unchanged by this tightening (byte-identical artifacts).

### D-048 · Accepted · 2026-10-21 · Potential high-assurance organizational deployment is a planning context only
VEILTRACE is being developed for a cybersecurity innovation hackathon, and winning projects *may* later be evaluated by organizations such as Satsiber TNI AD. This is a possibility, **not** a confirmed adoption, endorsement, requirement or procurement. The context informs planning (PRODUCT_SPEC.md §9, IMPLEMENTATION_PLAN.md "Potential High-Assurance Deployment"): offline/restricted-network operation, supply-chain security (SBOM, dependency audit), reproducible builds, distribution and update integrity, managed-browser deployment, Indonesian UI, strictly opt-in privacy-preserving reporting, and organizational threat modeling. No centralized monitoring, employee surveillance, privileged endpoint access or military-specific features will be built without explicit requirements and a separate review. No document may describe VEILTRACE as military-grade, certified, approved or endorsed.

### D-049 · Accepted · 2026-10-21 · Indonesian popup UI; language follows the browser UI language
All popup strings live in bundled EN/ID dictionaries (`src/extension/popup/i18n.ts`). There are no runtime language files and no translation service. Selection is deterministic: `chrome.i18n.getUILanguage()` starting with `id` (or legacy `in`) selects Indonesian, anything else English. EN/ID buttons switch for the current popup only; the choice is not persisted, because persistence would need the `storage` permission. Page evidence is never translated. Modifier explanations are now localized by modifier id rather than taken from the core's English reasons. The detection lexicon and classification are unchanged. E2E tests pin the browser UI language (`--lang`) so they do not depend on the host OS locale.

### D-050 · Accepted · 2026-10-21 · Deterministic release process with integrity verification
`npm run release` builds the production extension and packages it with a first-party deterministic ZIP writer (sorted entries, `SOURCE_DATE_EPOCH`, fixed permissions), a release manifest and SHA256SUMS. `npm run release:verify` checks integrity and production policy. Two independent clean builds were byte-identical. Checksums provide integrity, **not authenticity**; signed distribution is future work. Release artifacts are git-ignored.

### D-051 · Accepted · 2026-10-21 · Supply-chain reporting; MPL-2.0 dev-only dependency accepted
CycloneDX SBOMs (toolchain and runtime; the runtime SBOM is empty), license review, lockfile integrity check and `npm audit` via `npm run supply-chain`. Findings on 2026-10-21: 0 vulnerabilities; 2 MPL-2.0 packages (`lightningcss`, via `vitest → vite`), used for testing only and not distributed, so they are accepted and recorded, not suppressed. Policy: any new runtime dependency, or any non-permissive license in distributed code, requires a decision.

### D-052 · Accepted · 2026-10-21 · Extension version 0.4.0
The UI changed (Indonesian, language switch). Engine versions are unchanged: default `0.1.0-m1`, experimental `0.2.0-rc.1` (not used by the extension). *Updated by D-055:* the extension now runs engine `0.2.0`; the extension version stays 0.4.0 until the owner decides on a version for distribution (a bump is required before any distribution).

### D-053 · Accepted · 2026-10-21 · Browser compatibility status
- Automated: Chromium (Playwright build), and Microsoft Edge 155 (smoke test: loaded and detected a lure).
- Manual: Google Chrome stable (M3).
- Branded Chrome 155 ignores `--load-extension`, so it cannot be automated with unpacked builds.
- Untested: Brave, Opera, Vivaldi, Chrome on Windows/Linux, ChromeOS.

### D-054 · Accepted · 2026-10-21 · Release types, artifact SBOM, no "official" label before signing
Releases are `development` (default; a dirty tree is allowed and recorded) or `candidate` (`npm run release:candidate`, which refuses a dirty or uncommitted tree). Every release carries a CycloneDX artifact SBOM hash-bound to the ZIP, with no third-party components. `verify-release` enforces the SBOM, the release type and the absence of third-party code markers (e.g. MPL-2.0 tooling). No artifact is called "official" until signed distribution exists (DEPLOYMENT.md §5). The M4.2 working-tree artifact is a development build, not a release.

### D-055 · Accepted · 2026-10-21 · Engine 0.2.0 (ruleset `m4.1`) is the production default
Owner instruction at M4.3A. `analyze(snapshot)` now applies P1b + P2-A + R4-β exactly as approved at M4.1 (D-041 … D-044, D-047), reporting engine `0.2.0`. No rule, lexicon, modifier, window or threshold changed; the rule set is the same as `0.2.0-rc.1`, and only its version label and default status changed. `ruleset: 'm4.1-rc1'` remains as an alias of `'m4.1'`. The M1 model stays available as `analyze(snapshot, { ruleset: 'm1' })`, reporting `0.1.0-m1`; the M1 unit suite runs on that path, and the `veiltrace-m1` dev outcomes are checked against the M4.1 M1 results. `experimental` options are applied on top of the selected rule set. Behavior changes (dev split): D17, D18, D27, D28, D40 suspicious → observed; D45 suspicious → manipulative. Dev totals: TP 16, FP 6 → 1, TN 23 → 28, FN 5. Unit fixtures: S-N8-en and S-L2-en suspicious → observed. This is the new decision that D-028 requires for changing a default; D-028 is updated accordingly.

### D-056 · Accepted · 2026-10-21 · Popup shows overrides and rejects unknown metadata
The scan report carries each finding's overrides (id, effect, suppressed modifiers, supporting evidence) and `evidenceTotal`. The popup explains overrides in EN/ID ("Not lowered…", "Context set aside", supporting evidence with Show on page) and states how many evidence items or findings were not shown. The validator now checks exact key sets for the report, findings, evidence and coverage, and allows only known modifiers (`C.PROCEDURAL` added), overrides and effects. Anything unknown, or an over-limit list, makes the whole report invalid ("Scan failed") instead of being silently dropped or truncated, so new core metadata cannot disappear without a matching UI change. No permission, network access or storage was added.

### D-057 · Accepted · 2026-10-21 · `release:repro` builds candidates on a clean tree
`npm run release:repro` builds both copies with release type `candidate` when the working tree is clean (and `development` otherwise) and checks that the manifest records that type. On a clean commit, its ZIP, artifact SBOM and release manifest must therefore be byte-identical to `npm run release:candidate`. Previously the repro build was always `development`, so its manifest differed from the candidate only in `releaseType`.

### D-058 · Accepted · 2026-10-21 · Held-out evaluation v1 preregistered
`docs/EVAL_PREREGISTRATION.md` fixes the system under test (engine 0.2.0, extractor 0.1.0-m2, harness at the freeze commit), the held-out manifest hashes, metrics, D-011 targets, binary mapping, Wilson intervals, the localization criterion, partial-scan treatment, per-scenario reporting, the rerun policy, biases and the tuning ban. It was written before any held-out detection. Two methodological corrections were made before any result, with reasons: `veiltrace` now denotes the default engine 0.2.0 (M1 reported as `veiltrace-m1`), and B0 and the A1/A2 ablations are pinned to the M1 table so their definitions stay identical to M2. A display-only harness fix (percentages in Markdown computed from k/n instead of rounded JSON values) was made at the same time and is listed as a third correction. The run itself and the `eval-freeze-v1` tag need separate owner approval.

### D-059 · Accepted · 2026-10-21 · Held-out evaluation v1 accepted with a post-run protocol deviation
The single final run at `eval-freeze-v1` (`03fa212`) is logged in `eval/runs.md` as `(dirty)`. The recorded evidence shows that the cause is the harness writing its own untracked result files before checking `git status --porcelain`; the tree was clean before the run, and no tracked source, corpus, harness or preregistration change was detected. Preregistration §8 declared dirty-tree runs invalid. The owner accepted this run as the single reported final held-out run. This is a post-run protocol-deviation decision, not a claim of full compliance. The marker stays in the log, unedited. There was no rerun, and no result was recalculated. Results: TP 9, FP 2, TN 12, FN 3. The recall, precision and hard-negative FPR targets were not achieved (docs/EVALUATION_RESULTS.md). The harness ordering must be fixed and tested before any evaluation v2 is preregistered.

### D-060 · Accepted (pending owner review) · 2026-10-21 · Extension version 0.5.0
The first build to ship engine 0.2.0 by default (D-055) and the override display (D-056) was 0.4.0; the demo release candidate is 0.5.0, so the distributed version reflects the engine change. Only `src/extension/manifest.json` changes; the engine, the extractor and the popup code are identical to the frozen `eval-freeze-v1` source. Permissions stay `activeTab` + `scripting`. No storage or network.

### D-061 · Accepted (pending owner review) · 2026-10-21 · Demo site: fictional, static, outside the product, not special-cased
The hackathon demo lives in `demo/nusaverta` (fictional company, `.test`/`.example` hosts), not in `src/`. It has no JavaScript, no external resources and no executable payload; its hidden command text points to a `.invalid` host. A browser test asserts that no file under `src/` mentions the demo, so the demo cannot depend on special-case detection code. The lure uses canonical public lure wording that the frozen engine is known to detect. The first version of the page gave the intended verdicts, and its content was not changed afterwards. The demo shows behavior, not accuracy; accuracy claims come only from the recorded held-out results (EVALUATION_RESULTS.md).

### D-062 · Accepted (pending owner review) · 2026-10-21 · Credential detection is a separate, versioned, experimental detector
M5.1 adds `analyzeCredentials(snapshot)` (`src/core/credential/`, version `cred-0.1.0-exp`) next to `analyze()`. It has its own lexicon and decision table (CR1–CR5, DETECTION_MODEL.md §12) and reuses shared code read-only. No ClickFix file's behavior changed: engine 0.2.0 / ruleset `m4.1` give identical results on every unit fixture and on all 50 dev pages (only the extractor version string differs in regenerated dev artifacts, which were restored to their committed state). It stays **experimental** until a separately preregistered, frozen evaluation on an independently authored corpus (EVALUATION_PLAN.md §13).

### D-063 · Accepted (pending owner review) · 2026-10-21 · Structural form fields; values never read
Extractor 0.2.0-m5 records visible fields (kind from type/autocomplete/inputmode/maxlength/name/id/label, page-authored label, placement, locator) and forms (method, destination **category**, enclosing container). It never reads values, default values or typed text, and never exports a form's URL. Block extraction is unchanged. Sentinel tests at unit, browser, E2E and evaluation level enforce this.

### D-064 · Accepted (pending owner review) · 2026-10-21 · No permission, storage or network change for M5.1
The credential detector runs in the same on-demand isolated-world scan. Permissions stay `activeTab` + `scripting`; no storage, telemetry, reputation lookup or remote inference.

### D-065 · Accepted (pending owner review) · 2026-10-21 · Credential decision principles
(1) Sending a secret to a person or channel is the strongest signal (CR1), because legitimate services never ask for it; (2) a recovery phrase under any pretext is manipulative (CR2); (3) "verify your account" and claimed support never escalate on their own, since real MFA and help flows use them; (4) only an account threat escalates a plain entry request (CR4), because deadlines and offers are common on legitimate shops (dev CN18); (5) the form destination is reported, not scored (D1, SSO); (6) third-party status comes only from DOM structure and is labelled heuristic; (7) a claimed identity is never treated as verified.

### D-066 · Accepted (pending owner review) · 2026-10-21 · Scan report v2 and popup sections
`ScanReport` v2 adds a strictly validated `credential` section (exact keys, closed enums, evidence = page-authored text or field label only). The popup shows one section per detector, the more severe first, each with a category label, and keeps the ClickFix summary card (`.summary`) unchanged. There is no combined verdict yet; an aggregation layer needs its own design and evaluation.

### D-067 · Accepted (pending owner review) · 2026-10-21 · Credential development corpus and evaluation are separate from v1
`corpus/cred-dev` (36 scenarios, same author as the rules, labels written before the first run) and `npm run eval:cred` (`src/eval/cred.ts`) are new files; the frozen v1 harness, held-out corpus and results are untouched. Dev-driven rule changes and their before/after counts are recorded (DETECTION_MODEL.md §12.7). Development numbers are never reported as held-out or real-world results.

### D-068 · Recorded · 2026-10-21 · v0.5.0 manual checklist confirmed by the owner
The owner stated, in the M5.1 instruction, that the v0.5.0 manual validation checklist passed (DEMO.md N1–N14). The M4.4 changes were not yet committed when M5.1 started; they were separated into their own commit (`feat(demo): …`) before M5.1 was committed.

### D-069 · Accepted (pending owner review) · 2026-10-21 · M5.1 finalization hardening
Positional field/form locators and fixed hint tokens (no element id, name or raw attribute leaves the page); bounded enclosing-container chains for forms, stopping at trust boundaries; per-request scoring with quoted/code pretexts limited to their own block; the live-field override requires the same secret kind and only sets aside educational framing (DETECTION_MODEL.md §12.8). No cred-dev outcome changed.

### D-070 · Proposed (pending owner approval) · 2026-10-21 · Extension version 0.6.0 for credential-enabled builds
The M5.1 commit sets the manifest version to 0.6.0 so that no credential-enabled build can be mistaken for the owner-validated v0.5.0 (M4.4, D-060, D-068). No 0.6.0 artifact has been built, published or validated; manual Chrome validation of the credential section is pending. The owner may choose a different version before any release.

### D-071 · Accepted (pending owner review) · 2026-10-21 · Experimental payment-manipulation detector (M5.2)
A third, independent detector `analyzePayments()` (`pay-0.1.0-exp`, `src/core/payment/`) reads the same `PageSnapshot` and never changes ClickFix or credential results. Rules PR1–PR4 require combinations (pay-to-receive, off-channel destination with pressure, threat with authority or urgency); a payment request, fee, deadline or claimed support alone is only observed (DETECTION_MODEL.md §13). Development corpus `corpus/pay-dev` and `npm run eval:pay` are separate from the frozen v1 harness; no held-out claim is made.

### D-072 · Accepted (pending owner review) · 2026-10-21 · Payment detector privacy boundary
The payment detector reads block text only (no form fields, values, url or title). Amount values are never copied into results or the report (`PA.AMOUNT` text is empty, and `parseScanReport` rejects a report that carries one); digit runs of 5+ characters in other evidence are masked. No new permission, storage or network use.

### D-073 · Accepted (pending owner review) · 2026-10-21 · One popup layout for three detectors; ScanReport v3
The popup shows three sections with uniform names: Command Execution Manipulation, Credential Disclosure Manipulation and Payment Manipulation (the latter two marked Experimental), ordered by verdict with ties in that order. Every finding card shows its category, a **severity** chip derived one-to-one from its classification (manipulative → high, suspicious → medium, observed → informational), confidence, rule, a short explanation, evidence with Show on page, and limitations. There is no combined or weighted score. `ScanReport` v3 adds the `payment` section and `timing.paymentMs`; v2 reports are rejected.

### D-074 · Accepted (pending owner review) · 2026-10-21 · Experimental fake-support and authority-impersonation detector (M5.3)
A fourth independent detector `analyzeSupport()` (`sup-0.1.0-exp`, `src/core/support/`) reads the same `PageSnapshot` and changes no other detector's result. Rules SR1–SR5 require combinations of a direction (contact, remote access, install) with an asserted device alert, a threat, urgency, a personal channel or user-content placement; a claim of being support, a bank or an administrator never alerts alone. All applicable rules are evaluated and the strongest wins. Findings report **claims** (unverified) and **observable indicators** separately and never state that an organization is fake (DETECTION_MODEL.md §14). Development corpus `corpus/sup-dev` and `npm run eval:support` are separate from the frozen v1 harness.

### D-075 · Accepted (pending owner review) · 2026-10-21 · Support detector privacy boundary
Block text only. Phone numbers are never reported, `@handles` and 5+ digit runs are masked, and `parseScanReport` rejects support evidence with a phone text or any 5+ digit run. No new permission, storage or network use.

### D-076 · Accepted (pending owner review) · 2026-10-21 · ScanReport v4 and the four-section popup
`ScanReport` v4 adds the `support` section and `timing.supportMs`; v3 reports are rejected. The popup shows Command Execution, Credential Disclosure, Payment and Support & Authority Impersonation sections with the layout of D-073 (category, severity from classification, explanation, evidence with Show on page, limitations; no combined score), ordered by verdict with ties in that order. Support cards add "Claims to be (not verified)" and "Observed indicators" as separate lines.

### D-077 · Accepted (pending owner review) · 2026-10-21 · Unified threat dashboard (M5.4): presentation-only aggregation
The popup replaces the four per-detector sections with one dashboard built by a pure module (`src/extension/popup/aggregate.ts`) from the validated `ScanReport` v4. No detector, rule, lexicon, threshold or report field changed. The page summary shows the highest classification over the four verdicts, the number of actionable (suspicious or manipulative) findings, the affected categories and scan completeness. All findings form one list ordered by classification, then action risk, then confidence, then detector order; classification, severity (from classification, D-073), confidence and action risk stay separate chips. Findings whose evidence cites the same page element are **grouped, not merged**: every member keeps its own card, rule, evidence and detector, and shared evidence is marked "Also cited by". Contextual advice is shown per affected category (with a remote-access item when a support finding asks for remote access or an install); with no findings, a general note says this is not a guarantee. There is still no combined score.

### D-078 · Accepted (pending owner review) · 2026-10-21 · Popup visual design
Dark console styling (charcoal, muted olive accents, amber for caution, red for high risk, thin borders, faint grid, monospace for technical labels), 560 px wide with fallback to the window width below 576 px, inside Chrome's 800×600 popup limit. No external fonts, images or network resources; no insignia, emblems or wording that implies any military or government affiliation, consistent with D-048. Technical labels: SCAN COMPLETE / PARTIAL SCAN / SCAN FAILED, F-nn finding ids and E-nn evidence ids (per render, for presenters). A separate full-page dashboard was considered for very long results and deferred; the popup scrolls instead.

### D-079 · Accepted (pending owner review) · 2026-10-21 · Credential detector cred-0.1.1-exp and fixed popup width
After the owner's manual test: (1) the credential lexicon gains informal Indonesian forms (DETECTION_MODEL.md §12.9); rules, windows and modifiers are unchanged, and only CA03 changed among the original cred-dev scenarios. (2) The toolbar popup keeps a fixed 560 px body: a viewport media query matched while Chrome was still sizing the popup and left it narrow (about 430 px in the owner's screenshot). The responsive layout now applies only when the popup page is open as a tab (`html.fluid`, detected with `chrome.tabs.getCurrent`, which needs no permission).

### D-080 · Accepted (owner request) · 2026-10-21 · Hackathon submission materials
`submission/` holds the Kartika Cyber Hackathon 2026 materials: `PROPOSAL.md` and `VIDEO_SCRIPT.md` are written in **Indonesian** for the judges, an explicit exception to D-009 (all other docs stay English). `npm run submission:pdf` renders them to PDF and `npm run submission:video` builds a silent demo video from frames captured in the TEST build (`tests/e2e/video.test.ts`, skipped unless `VT_VIDEO_DIR` is set); outputs go to the git-ignored `submission/dist/`. Every page shown is fictional. The materials state that VeilTrace is independent and not affiliated with or endorsed by TNI AD or any organization (D-048), quote the held-out numbers including the missed targets, and disclose AI-assisted development. The repository was created as **private** on GitHub (`dalpan/veiltrace`) at the owner's choice; making it public is the owner's decision.

### D-081 · Accepted (owner request) · 2026-10-22 · Opt-in automatic scanning; narrows D-035
Manual scanning stays the default. The manifest adds `optional_host_permissions` `http://*/*` and `https://*/*` (not granted at install) and a service worker `background.js`. From the popup ("Scan mode"), the user can turn automatic scanning on; Chrome shows its own permission dialog. Then `content.js` + `auto.js` are registered with `chrome.scripting.registerContentScripts` for those origins (top frame, `document_idle`). `auto.js` runs the same isolated-world `scan()` on load and on DOM change (debounce 1.2 s, at most 5 s wait, at most one scan per 4 s, at most 25 scans per page, paused while hidden, ignoring the highlight overlay) and sends only `{type, v, verdict, actionable}` to the service worker, which sets a per-tab badge **only for manipulative pages** and the action title. Opening the popup in automatic mode scans immediately. Turning it off unregisters the script and removes the permission; `permissions.onRemoved` also unregisters it. **D-035 is narrowed**: messaging exists only in `src/extension/auto/channel.ts` (ESLint scope), one way, receiver checks `sender.id`, tab and top frame and validates the exact shape; no `externally_connectable`, no `onConnect`. `verify-release` allows exactly these two manifest additions and these two channel identifiers in `auto.js`/`background.js`. Limits: pages already open are covered after reload; force-enabling for an organization needs a managed build with host permissions (not done); automatic alerts make false positives more visible, which is why suspicious results get no badge.

### D-082 · Accepted (owner request) · 2026-10-22 · Real-world field sample kit (`corpus/realworld`)
Text records of real scam and benign messages, collected and labelled by people other than the rule author, stored **redacted only** (`npm run realworld -- redact`; CI rejects phone numbers, long numbers, emails and links). Each record's dev/test half is fixed by a salted hash of its id at creation. The dev half may guide rule and lexicon changes (with before/after counts); the test half is locked by per-record hashes (`LOCK.json`, checked by tests) and evaluated only with `--final` on owner request. Two independent annotators; Cohen's kappa and adjudication (`final`); only agreed or adjudicated records are evaluated. Records are evaluated as text blocks in a container matching their context (an approximation of a page). Results are reported as a field sample, never merged with synthetic numbers (EVALUATION_PLAN.md §7). The contributor guide is in Indonesian (as D-080). CLAUDE.md's evaluation-integrity rule is updated accordingly. No records were added by the rule author.

### D-083 · Accepted (owner request: "improve accuracy") · 2026-10-22 · Accuracy round 1: engine 0.3.0 (ruleset m5) and detectors 0.2.0
Default ClickFix ruleset becomes `m5` (engine 0.3.0): m4.1 + own-voice verification gate + procedural dialogs, with informal Indonesian key separators in the shared lexicon. `{ ruleset: 'm4.1' }` remains engine 0.2.0 (the engine evaluated on held-out v1, whose recorded results stand). Credential, payment and support detectors move to `0.2.0-exp`. Changes, before/after counts and caveats: DETECTION_MODEL.md §15. None of these versions has been evaluated on any held-out data yet; held-out v2 is authored blind to the rules and locked before its single run.

### D-084 · Accepted (owner request: mobile priority) · 2026-10-22 · "Cek Pesan" PWA
Chrome for Android does not run extensions, and most scams in Indonesia arrive as WhatsApp or SMS messages on a phone. `src/pwa` is an installable web app that checks a pasted or shared message with the same four detectors (`src/pwa/message.ts`: one text block per line, inside a user-content container for chat/SMS/email). On Android, the installed app appears in the share sheet; the shared text arrives as a POST that the service worker stores once in Cache Storage and the page reads and deletes, so it never appears in a URL, the history or a server log. The page CSP is `connect-src 'none'`; the service worker only caches and serves the app's own files. iPhone: paste (no Web Share Target in Safari). `npm run build:pwa` → `dist/pwa`, static files for any HTTPS host. Hosting it (for example GitHub Pages) is an outward-facing step left to the owner. E2E: `tests/e2e/pwa.test.ts` (phone viewport, share POST, offline, language, privacy).

### D-085 · Accepted · 2026-10-22 · Held-out v2 (blind author, hash-locked)
`corpus/test-v2` (60 scenarios, four categories, 67% Indonesian) was written by a separate agent instance told not to read rules, lexicons, dev data, results or decisions; the rule author ran only a blind schema check and wrote `MANIFEST.json`; the authoring script was deleted. Preregistration: `docs/EVAL_PREREGISTRATION_V2.md`. `npm run eval:v2 -- --final` runs only on owner request and logs to `eval/runs-v2.md`; `tests/corpus-v2.test.ts` guards the hashes. Same model family as the rule author: a synthetic held-out, not real-world evidence.

### D-086 · Accepted · 2026-10-22 · Firefox build (desktop and Android ≥ 128)
`npm run build:firefox` → `dist/extension-firefox`: the same code and permissions, with a Firefox manifest (event-page `background.scripts`, gecko id `veiltrace@veiltrace.invalid`, strict minimum 128 for desktop and Android). Content scripts use `Element.openOrClosedShadowRoot()` when `chrome.dom` is absent; automatic-scan registration falls back when `persistAcrossSessions` is unsupported; on touch screens the popup follows the screen width. Not yet tested on a Firefox device (Playwright cannot load Firefox extensions); the toolbar badge may not be visible on Android.

### D-087 · Accepted (owner request, P2) · 2026-10-22 · Recruitment-scam and rank-impersonation patterns
Payment detector `pay-0.3.0-exp` adds the recruitment promise (`PR.RECRUIT`, pay-to-receive on its own) and rank/position claims; support detector `sup-0.3.0-exp` adds the `official` claim kind. Generic, not military-specific: the same patterns cover civil-service and school admissions and any impersonated official, consistent with D-048. Report v4 enums extended (`PR.RECRUIT`, `recruitment`, `SI.OFFICIAL`, `official`). Details and dev counts: DETECTION_MODEL.md §16.

### D-088 · Accepted (owner request, P2) · 2026-10-22 · Web chat clients (WhatsApp Web prototype)
Extractor 0.3.0: a conversation list (`role` grid/log/list/feed) that holds incoming messages (`data-pre-plain-text`, `message-in`/`incoming`-style classes) is one user-content container, so consecutive messages correlate like a comment thread; outside such a list, a single incoming message is user content. Generic markers, not a copy of any client; how well they match WhatsApp Web's current markup is **unverified** (no access to the real service) and must be checked by the owner. Limitation: the reader's own outgoing messages sit in the same container. Privacy is unchanged: text is read only when the user scans (or opted into automatic scanning) and never leaves the device. Dev results on all four corpora are unchanged.

### D-089 · Accepted (owner request, P2) · 2026-10-22 · Managed organizational build
`npm run build:managed` (`managedManifest`): install-time host access for http/https instead of the optional permission, automatic scanning registered on install and startup, popup shows "turned on by your organization" without a switch. No reporting, telemetry or central console (D-048). Policy and update-manifest templates in `deploy/`; deployment steps in DEPLOYMENT.md §7. The release pipeline (`npm run release`) still packages only the standard build.

### D-090 · Accepted (owner request) · 2026-10-22 · Held-out v2 spent; PWA hosted on GitHub Pages
Held-out v2 was run once at `29dda8e` (docs/EVALUATION_RESULTS_V2.md: recall 34.4%, precision 68.8%, hard-negative FPR 17.9%). Its scenarios and failures are now known, so v2 is no longer a held-out measure: later changes are measured on the real-world field sample (D-082) and a new blind set v3. The "Cek Pesan" PWA (D-084) is published at https://dalpan.github.io/veiltrace/ by `npm run deploy:pwa`, which force-pushes only the built static files to the `gh-pages` branch (Pages source: `gh-pages`, `/`). A CI workflow is deferred until the owner's token has the `workflow` scope. Verified live: all files served over HTTPS, service-worker scope `/veiltrace/`, a message check runs with zero requests outside the site.

### D-091 · Accepted (owner request: accuracy from real cases) · 2026-10-22 · Field-sample round: sup 0.4.0, pay 0.4.0; records seen by the rule author stay dev
The owner's first field sample showed the detectors alerted on 2 of 14 real scams, because real first messages are impersonated notices that ask for a reply, a link or a form, and job offers that charge a fee. `sup-0.4.0-exp` adds SR6 (impersonated notice lure, message contexts only) and its signals; `pay-0.4.0-exp` adds job-offer fees as pay-to-receive (DETECTION_MODEL.md §17). A link is used only as "a link is present": never reported, never classified by its domain (D1 unchanged). Field records that the rule author saw before the split carry `seen` and are always dev (`npm run realworld -- add --seen "<reason>"`; validation enforces it), so the test half only ever holds records the rule author has not read. Placeholders from redaction are evaluated as fictional values of the same shape. Extension version 0.7.0 so testers can tell builds apart.

### D-092 · Accepted (owner request: accuracy from device tests) · 2026-10-22 · sup 0.5.0: prize-quiz lures (SR7) and illegal access services (SR8)
Two scam classes the owner met on a phone are added to the support detector rather than a new report section: both end in a contact, reply or quiz direction, and adding a fifth category would change the report schema shortly before submission. The popup footer now lists every detector version so testers can tell builds apart. Details: DETECTION_MODEL.md §18.

### D-093 · Accepted (owner choice: on-device first, popup only) · 2026-10-22 · Optional AI second opinion on the device
Implements PRIVACY_SECURITY.md §3 with the browser's built-in model (Chrome Prompt API, `LanguageModel`; no manifest permission). Off until the user asks after a scan; the masked payload (`src/extension/ai/payload.ts`) is shown before the model runs; `src/extension/ai/opinion.ts` constrains the answer to a JSON schema of fixed values and rejects anything else, which also limits prompt injection from page text to choosing among those values. The opinion is labelled as such, shown below the VeilTrace result and never merged with it (no combined score, D-017). Gemini Nano officially supports en/ja/es/de/fr, not Indonesian; this is stated in the UI. Availability: Chrome desktop with the model; elsewhere the panel reports it unavailable. The content script gains `aiText()` (same block text the detectors read). Not evaluated for accuracy yet: an evaluation on dev data and the field sample is a separate step.

### D-094 · Accepted · 2026-10-22 · AI opinion: few-shot prompt, disagreement note, on-device evaluation page
First device test (owner, Chrome desktop with Gemini Nano): an ordinary checkout page was called "manipulative, high confidence" (the protective "jangan transfer ke rekening pribadi" read as a request, the payment timer as a threat, the masked virtual-account number as a phone number), while VeilTrace correctly reported "observed only". Changes: the system prompt explains protective sentences, checkout deadlines and masked values; four worked examples written for the prompt (not taken from any corpus) precede the page; the panel says plainly when the AI and VeilTrace disagree. Measurement: `npm run build:ai-eval` builds `dist/extension-ai-eval` (never released) whose `ai-eval.html` runs the model on the development scenarios and the field sample's dev half (embedded payloads, no network) and reports AI, VeilTrace and "either" counts. The few-shot examples resemble dev checkout and job-fee scenarios, so these numbers are development numbers.

### D-095 · Accepted (owner choice after docs/AI_EVAL.md) · 2026-10-22 · On-device AI opinion becomes an experiment, off in released builds
Measured in the owner's Chrome on 185 development scenarios, the on-device model flagged 73 of 103 benign pages (71%) while VeilTrace flagged none, and its confidence did not separate right from wrong. Showing it to users would train them to ignore alerts. The panel is compiled out of the standard, Firefox and managed builds (`__VT_AI__=false`, no AI code in `popup.js`); it remains in the TEST build (e2e) and in two never-released builds: `npm run build:ext:ai` (`dist/extension-ai`, for trying it) and `npm run build:ai-eval` (measurement page). Submission materials describe it as evaluated and deliberately not used. Re-enabling it in a released build needs a new evaluation that shows a low false-alarm rate on data the prompt was not written against.

### D-096 · Accepted (owner request: real data without the rule author seeing it) · 2026-10-22 · Screenshot import, label sheet, held-out v3
`npm run realworld -- import <folder>` runs OCR on the collector's Mac (`scripts/ocr.swift`, macOS Vision, no network), drops clock times and status-bar fragments, joins wrapped lines, redacts and adds records with the deterministic split, printing only ids and counts. `show` is for the collector's review; `sheet` writes an offline HTML label sheet (CSP `default-src 'none'`, text via `textContent`) per annotator, and `label-import` applies the saved JSON. Held-out v3 (`corpus/test-v3`) is authored by a separate agent instance, blind to the rules, with research into current public scam reports and at least half message contexts; it is hash-locked before any run and preregistered in `docs/EVAL_PREREGISTRATION_V3.md`.

### D-097 · Accepted (owner request) · 2026-10-22 · Submission materials lead with need, advantage and validation
For the hackathon, the proposal, slides, video and README lead with the need, the advantages over verified alternatives (docs/COMPETITIVE_ANALYSIS.md) and positive, accurate validation (real messages detected, genuine pages not flagged, device and automated tests, rule-based vs AI). Held-out results and limitations stay complete in `docs/` (evaluation results, preregistrations) and in `submission/QNA_JURI.md` for when judges ask; limitations are framed as the roadmap. No accuracy figure is invented or rounded up, development numbers are not presented as held-out results, and the unverified "47% of initial access" figure is replaced by the primary Microsoft statement (thousands of devices daily). Supersedes D-080's requirement to quote the missed held-out targets in the submission materials.

### D-098 · Accepted (owner request) · 2026-10-22 · Website at veiltrace.click: landing page, app at /app/, downloads
The owner pointed the custom domain `veiltrace.click` at GitHub Pages. `npm run deploy:site` (replacing `deploy:pwa`) publishes `scripts/build-site.mjs` output: a static Indonesian landing page at `/` (what VeilTrace is, how it works, the four detectors, privacy, install and download, FAQ; CSP `connect-src 'none'`, no external resources), the "Cek Pesan" PWA at `/app/` (relative paths, service-worker scope `/app/`), `/download/` with the reproducible Chromium release ZIP (requires `npm run release` for the current version), an unsigned Firefox ZIP and `SHA256SUMS`, and `CNAME` so a deploy never drops the domain. A root `sw.js` retires the service worker that served the app from the root (it deletes only caches holding `/app.js` and unregisters itself); the landing page sends standalone launches of a previously installed app to `/app/`.

### D-099 · Accepted (owner provided references) · 2026-10-23 · External datasets; SMS-era scam patterns (pay 0.5.0, sup 0.6.0)
Of the references the owner shared, the Indonesian SMS spam dataset (third-party labels) becomes an external evaluation set with a hash split made before reading and a locked test half (EVALUATION_PLAN.md §14). Phishing domain and suspicious e-mail domain lists are not used: decisions never depend on URLs or domains (D1). The ML projects and the 2026 BITS paper are related work, not code sources (D-012). Baseline on the dev half: 11 of 178 *penipuan* messages alerted, 1 of 318 *normal*. Changes from dev-half error classes: payment requests for phone credit, a bare account handed over, payments routed to an "authorized" person or a changed account, a phone number as payee and a claimed family member on a new number (`PP.FAMILY`, pressure `claimed-family`); SMS prize notices with abbreviations and winner PINs (SR7 widened to links, replies and contacts); SR9 THIRD_PARTY_REDIRECT for fake buyers who send the reader to a relative on a personal number. After: 94 of 178 alerted, 1 of 318 normal, 1 of 120 promo (development numbers). Dev corpora: pay-dev 44 TP 19 FP 0, sup-dev 48 TP 22 FP 0 (8 new fixtures); field sample unchanged.

### D-100 · Accepted (owner provided the dataset) · 2026-10-23 · Synthetic Indonesian scam corpus as a second external set; message-scam phrasing (cred 0.3.0, pay 0.6.0, sup 0.7.0)
The owner added the "VeilTrace Indonesian Synthetic Scam Corpus v1" (12,150 templated messages, scam/benign, 25 categories, its own stratified split). It is kept in `corpus/external/synthetic-id/` (git-ignored), and the harness is `npm run external -- --dataset synthetic`. Train and validation count as dev, and `test.jsonl` is hash-locked (`LOCK.json`) and runs only with `--final`. The corpus README warns that variants share small template families across splits (template leakage). Its numbers, test split included, are therefore never presented as held-out, real-world or generalization evidence; they show which message classes the rules do not cover. Placeholders are filled with defanged values of the same shape (`[TAUTAN]` → an `example.invalid` link, `[KONTAK]` → `081200000000`, `[REKENING_SIMULASI]` → `1234567890`, `[LAMPIRAN_SIMULASI]` → `lampiran.apk`), and dataset channels map to message sources (web page and browser pop-up → web, e-mail → email, SMS → sms, chats → chat).

Baseline on dev (6,480 scam, 4,455 benign): 397 scam alerted (6.1%), 10 benign. Changes from dev error classes, each written as a general phrasing class:
- **Credential:** passing a code on ("teruskan/diteruskan", "dibagikan", "berbagi"); a requester as subject ("kami/admin/petugas memerlukan/membutuhkan/meminta"); one-time and login codes; "data login"; "untuk memasukkan" (but not a narrated "salah memasukkan"); unusual-access alarms; "petugas"/"admin" as claimed support.
- **Payment:** obligation and conditional demands ("selesaikan pembayaran", "jika tidak membayar", "harus dikirim", "saldo … harus diisi"); a bare account after "ke"; held funds and commissions; task-scam vocabulary as a job promise; "terlebih dahulu", "untuk mengambil", "cairkan setelah deposit" as pay-first conditions; "biaya validasi" and "deposit aktivasi" as release fees; extortion and returned-parcel threats; discouraged verification ("tidak perlu konfirmasi ulang", "tanpa perlu verifikasi", "jangan tanya") as pressure; "pimpinan/atasan" as claimed authority. **PR3 widened:** a payment demanded under a threat in a message or post from someone else (untrusted context) is suspicious. "a/n" followed by the reader's address ("masnya") is not a payee.
- **Support:** "akses kendali jarak jauh" as remote access; "perangkat Bapak/Ibu terinfeksi"; "dukungan teknis" and "petugas" as claims.
- **All three:** awareness phrasing is detector-local (`src/core/awareness.ts`, so the ClickFix lexicon is unchanged). "Waspadai pesan …" is educational, and "pesan yang mengatasnamakan … dan meminta transfer" is reported speech.

After, on dev: 2,908 of 6,480 scam alerted (44.9%), 0 of 4,455 benign. Most remaining misses are out of scope for text rules without context: ponzi promises with no requested action, romance loans, charity appeals, document uploads, "disable your browser protection" (no signal type yet), and the dataset's deliberate typos. Other sets: SMS dataset dev half unchanged (94/178, normal 1/318, promo 1/120); field sample verdicts identical; cred-dev 48 (FP 0), pay-dev 49 (FP 0), sup-dev 50 (FP 0), with 10 new fixtures (CD14, CN25–CN26, PD19–PD21, PN26–PN27, SD21, SN27).

### D-101 · Accepted (owner request) · 2026-10-23 · English first on the website and the app; bilingual landing page
On the first visit, both the landing page (https://veiltrace.click) and the "Cek Pesan" app (/app/) open in English, whatever the device language; previously the app followed `navigator.language`. Both carry an EN/ID switch. The choice is kept in `localStorage` under one key (`veiltrace-lang`) on the site's origin, so choosing Indonesian on the landing page carries over to the app. Only the language code is stored, never message text. If storage is blocked, the choice lasts for the page only. The landing page holds both languages in its HTML (`data-l="en"` / `data-l="id"`, the other hidden by CSS), so it reads in English without JavaScript. The browser extension is unchanged: it still follows the browser UI language and does not persist the switch, since that would need the `storage` permission (D-049).

### D-102 · Accepted (owner asked to close gaps, with research) · 2026-10-23 · App-file lures, turning off protection, fixed-return investment, down payments (sup 0.8.0, pay 0.7.0)
Priorities come from public reports, not from a held-out set. In OJK's Indonesia Anti-Scam Centre data (to January 2026), the most reported categories are online shopping, fake calls, investment, job offers and social media. Large losses also come from Android app files (.apk) sent over chat as wedding invitations or courier parcel photos, which install apps that read text messages and take over banking apps.
- **Support:** `SX.APK` (an .apk file named in the text; only its presence counts), `SA.DISABLE` (turn off Play Protect, antivirus or browser protection, allow unknown sources, grant accessibility), `SD.DOCUMENT` (an invitation, parcel photo, receipt, ticket or bill: ordinary words that only count with an app file), and an open/install verb before an .apk as `SA.INSTALL`. **SR10 APP_FILE_LURE:** in a message from someone else (user content or a personal channel), an app file or a request to turn off protection is manipulative when the file is presented as a document or comes with a protection request, a claim, urgency, a threat or an alarm; it is suspicious when the message only says to open or install it. A file name alone (a developer sharing a build) and download pages stay observed. SR1 and SR2 also accept turning off protection as the requested action. New report values: action `disable-protection`, channel `apk-file`, pressure `document-pretext`, indicators `protection-disable-request` and `apk-file-in-message`, rule `SR10` (validator and EN/ID labels updated).
- **Payment:** `PR.INVEST` (a profit that is fixed, certain or guaranteed, a percentage per day or week, capital that doubles, an investment without risk; interest per month or year is not matched) is pay-to-receive by itself, like `PR.RECRUIT`, so paying in for it is PR1. `PY.PAY` adds paying in capital ("setor modal", "modal mulai …") and down payments ("DP 50% dulu", "uang muka"). New promise `investment-return`.
- **Fixtures:** SD22–SD24, SN28–SN30, PD22–PD23, PN28–PN29. Results: sup-dev 56 (FP 0), pay-dev 53 (FP 0), cred-dev and ClickFix dev unchanged. SMS dataset dev half and field sample unchanged. Synthetic dev: 2,908 → 3,104 of 6,480 scam alerted, benign 0 of 4,455 (development numbers). One existing expectation moved: a "kurir" sending a receipt .apk in chat was SR2 suspicious and is now SR10 manipulative.
- **Not covered, by design:** an investment pitch with no request to pay (D-017: a promise alone is not a request), and fake phone calls (voice is outside the text the detectors read).
