# Held-out Evaluation Results (evaluation v1)

Status: **final; executed once on 2026-10-21 under the preregistered procedure** (EVAL_PREREGISTRATION.md), and **accepted by the owner with a post-run protocol deviation** concerning the run log's dirty marker (§1.1, D-059). These are results on **26 synthetic scenarios**. They are not real-world, operational or field effectiveness.

**The preregistered recall, precision and hard-negative FPR targets were not achieved.** The localization and zero-request targets were met.

## 1. Run record
| Item | Value |
|---|---|
| Command | `npm run eval -- run --split test --final` (executed exactly once, exit 0) |
| Source commit | `03fa2123e88dc3e4fc5be39c8969ad67b600e8f7` = annotated tag `eval-freeze-v1` (tag object `5b0ea513…`) |
| Engine / extractor | 0.2.0 (ruleset `m4.1`) / 0.1.0-m2 |
| Held-out corpus | `corpus/test`, 0 changes since `407beb0`; `MANIFEST.json` SHA-256 `c89904bf…6fd447`; aggregate `954070c4…bdde85e`; `validate --split test` valid immediately before the run |
| Environment | macOS arm64 (Darwin), Node 26.8.1, Playwright 1.64.1, Chromium headless shell 156.0.8078.4, viewport 1280 × 800, `npm ci` from the lockfile before the run |
| Pre-run checks | tag → commit verified; HEAD = tag; `git status --porcelain` empty after `npm ci` and after `validate`; tracked files identical to the tag; preregistration blob unchanged (`4c420fd7…`); no prior `eval/runs.md` or `test.*` results |
| Outputs | `eval/runs.md`, `eval/results/test.json` (SHA-256 `347f5bf3…5f1ceb`), `eval/results/test.md` (`cb0fe467…7d295`), `eval/results/test.perf.json` (git-ignored) |

### 1.1 Protocol deviation: the "(dirty)" marker in `eval/runs.md`
The automatically generated run log reads, unchanged:

```
- 2026-10-21T06:16:10.408Z · commit 03fa2123e88dc3e4fc5be39c8969ad67b600e8f7 (dirty) · engine 0.2.0 · test split · results in eval/results/test.json
```

Recorded evidence:
- `git status --porcelain` was empty immediately before the run (after `npm ci` and after `validate --split test`), as recorded in the evaluation session.
- `src/eval/cli.ts` writes `eval/results/test.json`, `test.md` (untracked, not git-ignored) and `test.perf.json` **before** it calls `git status --porcelain` for the log line. All three outputs and `eval/runs.md` carry the same modification time (13:16:10 local, the time of the run).
- After the run, the only differences from the tag were these evaluation-generated files. `git diff eval-freeze-v1` over tracked files was empty, and there were no tracked, untracked or ignored changes under `src/`, `corpus/`, `scripts/` or `tests/`. The preregistration blob was unchanged.
- According to this evidence, the dirty marker was caused by files the evaluation itself generated. No tracked source, corpus, harness or preregistration change was detected.

Preregistration §8 prohibited evaluation on a dirty tree and declared such a run invalid. The owner accepted this run as the single reported final held-out run (D-059). **This is a post-run protocol-deviation decision, not a claim of full protocol compliance.** The marker was not removed or edited, the harness was not changed, and **no rerun was performed**.

## 2. Primary system (`veiltrace`, engine 0.2.0): observed results
Positive = page verdict ∈ {suspicious, manipulative}. Ground truth: 12 malicious, 14 benign (all 14 hard negatives).

| | Predicted positive | Predicted negative |
|---|---|---|
| **Malicious (12)** | TP **9** | FN **3** |
| **Benign (14)** | FP **2** | TN **12** |

| Metric | Observed (k/n; Wilson 95% CI) | Preregistered target (D-011) | Met? |
|---|---|---|---|
| Positive recall | **75.0%** (9/12; 46.8–91.1%) | ≥ 85% | **No** |
| Precision | **81.8%** (9/11; 52.3–94.9%) | ≥ 90% | **No** |
| Hard-negative FPR | **14.3%** (2/14; 4.0–39.9%) | ≤ 10% | **No** |
| Evidence localization | **100%** (9/9; 70.1–100%) | ≥ 95% | Yes (point estimate; the CI lower bound is 70.1%) |
| Requests during scanning | **0** (all 26 scenarios) | 0 | Yes |

Secondary (descriptive):
- Overall FPR = hard-negative FPR = 14.3% (2/14).
- Exact class agreement: 21/26 (80.8%; 62.1–91.5%).
- By language: recall EN 6/8 (40.9–92.8%), ID 3/4 (30.1–95.4%); FPR EN 1/7 (2.6–51.3%), ID 1/7 (2.6–51.3%).
- Observed-instruction (informational) outcomes on benign scenarios: 7.
- Coverage: **25 complete, 1 partial** (T12, `frames-skipped`).
- Latency (machine-specific): extraction p50 1.2 ms / p95 1.5 ms; analysis p50 0.39 ms / p95 0.9 ms; total p50 1.62 ms / p95 2.4 ms; max 131.27 ms (one scenario, analysis 126.77 ms; cause not investigated). Snapshot size p50 1,627 B, max 4,046 B.

Class matrix (expected × predicted):

| expected \ predicted | none | observed | suspicious | manipulative |
|---|---|---|---|---|
| none (5) | 5 | 0 | 0 | 0 |
| observed (9) | 0 | 7 | **2** | 0 |
| suspicious (3) | 0 | 0 | 3 | 0 |
| manipulative (9) | **1** | **2** | 0 | 6 |

## 3. Per-scenario results
Columns: primary system verdict and rules; secondary systems' verdicts. `obs` = observed_instruction, `susp` = suspicious_correlation, `manip` = manipulative_instruction. Localization applies to TPs only.

| Scenario | Lang | Category | Truth | Expected | veiltrace 0.2.0 (rules) | Loc. | Partial | Error | veiltrace-m1 | B0 | A1 | A2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T01-en-recipe-captcha-overlay | en | positive | mal | manip | manip (R1) | ✓ | – | | manip | manip | manip | manip |
| T02-id-news-dialog-captcha | id | positive | mal | manip | manip (R1) | ✓ | – | | manip | manip | manip | manip |
| T03-en-fake-defender-support | en | positive | mal | susp | susp (R4) | ✓ | – | | susp | susp | susp | susp |
| T04-id-font-update-modal | id | positive | mal | susp | susp (R4) | ✓ | – | | susp | susp | susp | susp |
| T05-en-forum-comment-ugc | en | positive | mal | manip | manip (R1) | ✓ | – | | manip | manip | manip | manip |
| T06-id-bank-help-injected-widget | id | positive | mal | manip | manip (R1) | ✓ | – | | manip | manip | manip | manip |
| T07-en-macos-document-gate | en | positive | mal | manip | manip (R1) | ✓ | – | | manip | manip | manip | manip |
| T08-en-obfuscated-split-spans | en | adversarial | mal | manip | manip (R1) | ✓ | – | | manip | manip | manip | manip |
| T09-en-quote-markup-abuse | en | adversarial | mal | manip | **obs (R1 demoted)** | – | – | **FN** | obs | manip | obs | manip |
| T10-id-reported-speech-abuse | id | adversarial | mal | manip | **obs (R1 demoted)** | – | – | **FN** | obs | manip | obs | manip |
| T11-en-session-restore-urgency | en | positive | mal | susp | susp (R4) | ✓ | – | | susp | susp | susp | susp |
| T12-en-cross-origin-ad-iframe | en | positive | mal | manip | **none** | – | frames-skipped | **FN** | none | none | none | none |
| T13-en-real-captcha-interstitial | en | benign | ben | none | none | | – | | none | none | none | none |
| T14-en-cli-install-docs | en | benign | ben | obs | obs (R5) | | – | | obs | obs | obs | obs |
| T15-id-library-install-docs | id | benign | ben | obs | obs (R5) | | – | | obs | obs | obs | obs |
| T16-en-it-map-network-drive | en | benign | ben | obs | obs (R5) | | – | | obs | obs | obs | obs |
| T17-id-it-vpn-fix | id | benign | ben | obs | **susp (R4)** | | – | **FP** | susp | susp | susp | susp |
| T18-en-news-report-fake-captcha | en | benign | ben | obs | **susp (R3)** | | – | **FP** | susp | manip | susp | manip |
| T19-id-news-report-modus | id | benign | ben | obs | obs (R5) | | – | | obs | obs | obs | obs |
| T20-en-awareness-negation | en | benign | ben | none | none | | – | | none | obs | none | obs |
| T21-id-flash-sale | id | benign | ben | none | none | | – | | none | none | none | none |
| T22-id-bank-otp-warning | id | benign | ben | none | none | | – | | none | none | none | none |
| T23-en-qa-execution-policy | en | benign | ben | obs | obs (R5) | | – | | obs | obs | obs | obs |
| T24-id-security-blog-code-example | id | benign | ben | obs | obs (R1 demoted) | | – | | obs | manip | obs | manip |
| T25-en-wiki-banner-and-howto | en | ambiguous | ben | obs | obs (R5) | | – | | obs | susp | susp | obs |
| T26-id-browser-game | id | ambiguous | ben | none | none | | – | | none | none | none | none |

"R1 demoted" means the R1 rule matched and a context modifier lowered the result to `observed_instruction` (rule `R1`, classification observed, in `test.json`).

### 3.1 Failure categories (observed facts)
| Scenario | Error | What the results show | Category |
|---|---|---|---|
| T09 (EN) | FN | R1 matched; context lowered it to observed | Context-modifier evasion: lure wrapped in quote markup |
| T10 (ID) | FN | R1 matched; context lowered it to observed | Context-modifier evasion: lure phrased as reported speech |
| T12 (EN) | FN | No finding; scan partial (`frames-skipped`) | Coverage gap: lure inside a cross-origin iframe (known, by design) |
| T17 (ID) | FP | R4 → suspicious | Internal IT notice escalated by R4 |
| T18 (EN) | FP | R3 → suspicious | News report describing a fake CAPTCHA escalated by R3 |

T09, T10, T12 and T17 are the four scenarios the corpus README names as deliberately probing known weaknesses. Three of them are among the five errors.

## 4. Comparisons (descriptive only; protocol §3)
| System | TP | FP | TN | FN | Precision | Recall | Hard-neg FPR | Localization |
|---|---|---|---|---|---|---|---|---|
| **veiltrace (0.2.0)** | 9 | 2 | 12 | 3 | 81.8% (52.3–94.9) | 75.0% (46.8–91.1) | 14.3% (4.0–39.9) | 9/9 |
| veiltrace-m1 (0.1.0-m1) | 9 | 2 | 12 | 3 | 81.8% (52.3–94.9) | 75.0% (46.8–91.1) | 14.3% (4.0–39.9) | 9/9 |
| B0 (page-level, M1 table) | 11 | 4 | 10 | 1 | 73.3% (48.0–89.1) | 91.7% (64.6–98.5) | 28.6% (11.7–54.6) | 11/11 |
| A1 page+context | 9 | 3 | 11 | 3 | 75.0% (46.8–91.1) | 75.0% (46.8–91.1) | 21.4% (7.6–47.6) | 9/9 |
| A2 region-only | 11 | 3 | 11 | 1 | 78.6% (52.4–92.4) | 91.7% (64.6–98.5) | 21.4% (7.6–47.6) | 11/11 |

- **Engine 0.2.0 vs M1:** identical verdicts and rules on all 26 scenarios. The M4.1 additions (P1b, P2-A, `C.PROCEDURAL`) changed no held-out verdict. The dev improvement (FP 6 → 1 on 50 dev scenarios) is therefore **not** confirmed on held-out data; it was neither reproduced nor contradicted.
- **vs B0:** VEILTRACE had 2 fewer FPs (T24, T25 are FP for B0 only) and 2 more FNs (T09, T10 are TP for B0, which applies no context modifiers). T18 is an FP for both (B0: manipulative).
- **Ablations:** removing negation and context modifiers (A2) recovers T09 and T10 and adds the T24 FP; removing region locality (A1) adds the T25 FP. All intervals overlap widely; no difference is claimed to be significant (n = 26).

## 5. Limitations (preregistered §10, restated)
- Same AI author for the rules, the dev split and the held-out split. Wording may track the lexicon (optimistic) or deliberately probe known weaknesses (pessimistic: T09, T10, T12, T17).
- Six canonical lure phrases overlap with lexicon examples; recall on canonical lures is likely optimistic relative to novel wording.
- Synthetic, short pages; 12:14 class balance; model-written Indonesian; n = 26, so every interval is wide (e.g. recall 46.8–91.1%).
- The M4.1 rules were developed on the dev split after this split was frozen. The held-out split was not consulted before this run.
- Post-run protocol deviation: the run log's dirty marker, accepted by the owner (§1.1).
- Coverage: VEILTRACE cannot read cross-origin frames; a lure inside one is a reported partial scan and an FN (T12). No other scenario reported a partial scan. Text in images or canvas, JS-only payloads and content appearing after the scan are never visible to VEILTRACE and are not reported per page (ARCHITECTURE.md §3.9).
- Precision on a 12:14 split does not estimate precision at real-world prevalence.

## 6. Hypotheses for future research (not tested; not to be evaluated on this split)
- **H1 (T09, T10):** quote markup and reported-speech framing remain an evasion route for context modifiers; demotion may need evidence that the quoted text is *not* addressed to the reader (the same family as dev D10/D12/D43, where P2 variants were rejected for false positives).
- **H2 (T17):** single-family R4 on internal IT notices still escalates in Indonesian; P1b / `C.PROCEDURAL` conditions may not cover this page shape.
- **H3 (T18):** R3 on a news report that describes a lure needs a reporting-context signal the current modifiers did not supply.
- **H4 (T12):** cross-origin frames need a per-frame scan with user permission, a product decision, not a rule change.
- **H5 (dev → held-out transfer):** the M4.1 gains may be specific to dev page shapes; an independently authored split is needed to test any revision.

Any revision becomes a new engine version evaluated on a **new** held-out split (evaluation v2); these results remain published as evaluation v1 (preregistration §8).

## 7. Recommendations for a future independent evaluation (evaluation v2)
1. **New dataset, new author.** Build the next held-out split with at least one independent author who has not seen the rules or lexicons. Include native Indonesian writing, and freeze it (manifest and hashes) before any engine revision is evaluated.
2. **Realistic pages.** Add longer pages with frameworks, ads, lazy loading and multi-topic layouts, so that region locality and localization are actually stressed (B0 localized 11/11 here).
3. **Larger n and stated power.** Size each stratum (malicious, hard negative, language) so the intervals are narrow enough to test the D-011 targets; with n = 12 positives, even 12/12 gives a lower bound of about 76%.
4. **Separate splits for known weaknesses.** Report deliberate weakness probes (quote markup, reported speech, cross-origin frames, internal IT notices) as a separate stratum from canonical lures.
5. **Harness provenance fix before the next freeze.** Check `git status` before writing outputs, or write outputs to an ignored staging path, and record the pre-run status in the run log. This must be done and tested **before** evaluation v2 is preregistered; it does not change these results.
6. **Real-world sample (EVALUATION_PLAN §7).** A separately governed, defanged field sample is needed before any statement about real-world effectiveness.
7. **Preregister revisions first.** Any engine change motivated by §6 is a new version, developed on dev data only and evaluated once on the new split.

