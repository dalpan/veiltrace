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
`analyze(snapshot, options?)` keeps M1 behavior when options are omitted (tested). Baselines, ablations and dev research use options. The extension (M3) must call `analyze(snapshot)` with defaults, and changing a default requires a new decision.

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
Owner-approved at the M4.1 review as an **experimental release candidate**, selectable only with `analyze(snapshot, { ruleset: 'm4.1-rc1' })`. The default engine stays `0.1.0-m1`, and the production extension stays on M1 (owner decision). Default equality with `d856fbd` was re-verified. Dev evidence (DETECTION_MODEL.md §11): FP 6 → 1, FN 5 → 5, TP 16 → 16 on 50 dev scenarios. **Not the default and not frozen.**

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
