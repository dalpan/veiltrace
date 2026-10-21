# Evaluation Plan

Status: harness implemented (M2). M4 targets approved (D-011). **Held-out evaluation v1 executed once at `eval-freeze-v1` and reported in [EVALUATION_RESULTS.md](EVALUATION_RESULTS.md)**: TP 9, FP 2, TN 12, FN 3, so the recall, precision and hard-negative FPR targets were not achieved. It was accepted with a post-run protocol deviation (D-059). The procedure is in [EVAL_PREREGISTRATION.md](EVAL_PREREGISTRATION.md). The current held-out split is consumed: no further tuning or evaluation against it. Dev results are in §9–§11. The M1 snapshot scenarios in `tests/fixtures/scenarios.ts` remain unit fixtures, not part of the evaluation corpus.

## 1. Questions the evaluation must answer

- **Q1:** On reconstructed manipulative pages, does VEILTRACE produce a correct finding *and* point at the right element?
- **Q2:** On hard benign counterexamples, does it avoid suspicious/manipulative classifications?
- **Q3:** Does element-local correlation plus context modifiers measurably reduce false positives compared to page-level co-occurrence (baseline B0)?
- **Q4:** Does it work for Indonesian as well as English?
- **Q5:** Is it fast enough to feel instant?

Synthetic results answer Q1–Q5 *on our corpus*. They do **not** establish real-world effectiveness (§7).

## 2. Corpus layout (implemented in M2)

```
corpus/
  dev/<id>/index.html (+ extra pages)   # development split: free to read, extend and tune on
  dev/<id>/label.json
  test/<id>/...                         # HELD-OUT, frozen (D-022, commit 407beb0)
  test/MANIFEST.json                    # SHA-256 per file + aggregate
  test/README.md                        # construction method and known biases
```

`label.json` (validated by `src/eval/corpus.ts → validateLabel`):
```json
{
  "id": "D02-id-download-modal-after-click", "split": "dev", "lang": "id",
  "category": "positive | benign | ambiguous | adversarial", "threatClass": "T1",
  "truth": "malicious | benign",
  "expectedClass": "manipulative_instruction | suspicious_correlation | observed_instruction | none",
  "hardNegative": false,
  "pages": [{ "url": "https://filebagi.example/", "file": "index.html" }],
  "steps": [{ "click": "#dl" }],
  "evidenceWithin": "#m",
  "description": "…", "rationale": "…", "author": "…", "created": "2026-10-21"
}
```
- `truth` is the ground truth of intent. `expectedClass` is what a correct system should output. Malicious scenarios must expect a positive class, and benign ones `none` or `observed_instruction`.
- `observed_instruction` on a benign scenario is **not** a false positive. It is reported separately ("observed-instruction results on benign scenarios").
- Pages use fictional `.example`/`.test` hosts and are served offline (ARCHITECTURE.md §10). Payloads are defanged.

## 3. Leakage controls (implemented in M2)

1. **Split before design.** `corpus/test` (26 scenarios) was written and frozen **before** the extractor, dev corpus, harness or any M2 rule research existed (D-022). No detection was run on it. The freeze commit is `407beb0`, with manifest aggregate `954070c4…de85e`.
2. **Integrity.** `tests/corpus.test.ts` recomputes all hashes, and the build fails if any test file changes. Refreezing requires `manifest --split test --refreeze` and a new DECISIONS.md entry.
3. **No tuning on test.** `npm run eval -- run --split test` refuses without `--final`. `research` and `perf` refuse the test split entirely (tested). Each `--final` run appends the commit SHA and dirty flag to `eval/runs.md`. If rules change after a final run, the next run is reported as a new run, and both are kept.
4. **Lexicon and fixture independence.** No normalized sentence of ≥ 6 words may be shared between the test split and the M1 unit fixtures, the lexicon examples or the dev corpus (`tests/corpus.test.ts`). Six shorter canonical lure phrases recur by design. They are documented in `corpus/test/README.md`, which also explains why they were not rewritten.
5. **Report dev and test separately, always.** M2 reports **dev only**.
6. **Known residual bias:** the same AI author wrote the rules, the dev split and the test split. An independent author for a future test split is recommended.

## 4. Metrics

Unit of analysis: the **scenario** (one page). The positive class is "verdict ∈ {suspicious_correlation, manipulative_instruction}".

### 4.1 Page-level
- **Precision** = TP / (TP + FP)
- **Recall** = TP / (TP + FN)
- **False-positive rate** = FP / (FP + TN), reported **separately on the hard-negative subset**
- Because n is small (tens of pages), report **raw counts** alongside percentages, plus Wilson 95% intervals. Never report a percentage without its denominator.

### 4.2 Classification agreement
The confusion matrix of expected vs produced verdict (none / observed_instruction / suspicious_correlation / manipulative_instruction). Confidence calibration (whether high-confidence findings are correct more often than low-confidence ones) is reported descriptively.

### 4.3 Evidence localization
For each TP, do the finding's evidence sources (the blocks, hidden candidates or triggers referenced by its observations, resolved to DOM elements through their `locator` by the M2 harness) all fall inside `regionContainsSelector`? The **localization accuracy** = correct / TP. This metric directly tests the explainability claim.

### 4.4 Scenario table
Each named scenario gets a pass/fail row in the report. Judges and readers can inspect individual cases.

### 4.5 Performance
Extraction + analysis wall time per fixture (p50/p95) in Playwright Chromium on the developer machine, plus 3 large saved real pages (e.g. a long news article, a docs page and a forum thread, saved locally). The hardware is recorded.

## 5. Baseline B0 and ablations (implemented in M2, `src/eval/systems.ts`)

All systems consume the **same extracted `PageSnapshot`**, the same lexicons and the same normalization. B0, A1 and A2 use the **M1** R1–R5 table (`ruleset: 'm1'`), so their definitions are unchanged since M2 (D-058). They differ only in correlation scope and context handling:

| System | Correlation scope | Negation | Context modifiers |
|---|---|---|---|
| `veiltrace` (engine 0.2.0, default since M4.3A) | region-local, window K = 8 | yes | yes, plus P1b, P2-A, `C.PROCEDURAL` |
| `veiltrace-m1` (M1 model; called `veiltrace` in §9) | region-local, window K = 8 | yes | yes |
| `B0` baseline | whole page (one region, K = ∞) | no | no |
| `A1-page+context` | whole page | yes | yes |
| `A2-region-only` | region-local, K = 8 | no | no |

B0 is our own reimplementation of page-level co-occurrence, not third-party code. Comparing veiltrace-m1 with A1 isolates the effect of region locality, and comparing it with A2 isolates the effect of negation and context modifiers.

**Limitations of B0:**
- It shares VEILTRACE's lexicon, normalization, extractor and R1–R5 table, so it measures *our own* design choices, not any competitor. It must never be presented as "competitor X".
- Its recall is an upper bound for phrase-level co-occurrence with this lexicon. A real page-level product with different phrases could do better or worse.
- On compact synthetic pages, page-level and region-level evidence often coincide (B0 localization was 14/14). B0's localization weakness would only show on long, multi-topic pages.

## 6. Required scenarios (minimum set, each in EN and ID unless noted)

Positives:
| ID | Scenario |
|---|---|
| S-P1 | Fake CAPTCHA modal requesting Win+R → Ctrl+V → Enter, clipboard via a hidden textarea + "Verify" button |
| S-P2 | Malicious instruction presented as account verification ("verify your account by running…") |
| S-P3 | Fake "browser update / fix error" page with a PowerShell one-liner and a copy button |
| S-P4 | Benign blog post (legit-looking template on localhost) with a **comment** containing a ClickFix instruction (T7, UGC) |
| S-P5 | Benign docs page with an **injected widget/iframe-like card** containing a fake verification chain (T7, compromised component) |
| S-P6 | macOS variant: "Open Terminal, paste, press Return" |
| S-P7 | Obfuscated text: zero-width characters + Cyrillic homoglyphs inside the instruction |

Hard negatives:
| ID | Scenario |
|---|---|
| S-N1 | Security tutorial showing a dangerous command in `<pre>` as an example, with explanatory prose |
| S-N2 | Legitimate account-security warning ("we detected a new sign-in; review your activity") with no execution request |
| S-N3 | Normal e-commerce checkout countdown timer + "only 2 left" |
| S-N4 | News article describing a ClickFix campaign and quoting the lure text in a blockquote |
| S-N5 | Developer docs: "Open Terminal and run `npm install`" (legit execution instruction, no pretext). Expected: `observed_instruction` or `none`. This tests the observed-vs-suspected separation (R5) and is the main honest stress case |
| S-N6 | Awareness article: "Never press Win+R and paste code a website gives you" / "Jangan pernah…" (negation) |
| S-N7 | Indonesian bank-scam awareness page listing scam phrases |
| S-N8 | IT helpdesk internal-style page telling employees to open PowerShell to run an approved script (no pretext/urgency) |

Note on S-N5/S-N8: legitimate pages *do* ask users to run commands. The engine's position is that an instruction **without** a manipulation pretext is `observed_instruction` (informational, not a detection). If legitimate troubleshooting wording ("to fix this issue…") produces `suspicious_correlation`, that counts as a false positive and is reported.

Target corpus size by M4: dev ≥ 16 scenarios (≥ 8 neg), test ≥ 16 scenarios (≥ 8 neg), ≥ 40% Indonesian in each split.

## 7. Real-world effectiveness (separate, post-M4)

- Source: public ClickFix reports with screenshots or HTML (vendor blogs, URLhaus tags), reconstructed and sanitized in an isolated VM per PRIVACY_SECURITY.md §5.
- Negatives: a fixed list of ≥ 50 popular pages across categories (EN + ID news, docs, banking help, e-commerce), saved locally on a fixed date.
- Report as **"field sample, n = X, collected on DATE"**. It is never merged with synthetic numbers.

## 8. M4 research targets (approved, D-011)

Measured on the **frozen held-out test split** only:

| Metric | Target |
|---|---|
| Positive recall | ≥ 85% |
| Precision | ≥ 90% |
| Hard-negative false-positive rate | ≤ 10% |
| Evidence localization accuracy | ≥ 95% of true positives |
| External network requests during scanning | 0 |

Secondary (not approved targets, reported descriptively): VEILTRACE vs B0 FP counts, and p95 latency.

These are research targets, not guaranteed outcomes. The report must include raw counts, Wilson 95% intervals, corpus composition (per class, per language, per split) and limitations, whether or not the targets are met. Rules are never tuned against the frozen test split.

## 9. M2 results: dev split only (synthetic; not real-world effectiveness)

Source: `eval/results/dev.json` (byte-identical across repeated runs), `dev.md`, `dev.research.*` and `perf.json`. Engine `0.1.0-m1`, extractor `0.1.0-m2`.

**Corpus:** 36 scenarios. 14 malicious (11 positive, 3 adversarial) and 22 benign hard negatives (1 of them ambiguous). 20 EN and 16 ID, with 11 hard negatives per language. **The dev split was written with knowledge of the M1 risks (R-1, R-2), so it over-represents known failure modes by design.**

| System | TP | FP | TN | FN | Precision | Recall | Hard-neg FPR | Localization |
|---|---|---|---|---|---|---|---|---|
| veiltrace | 12 | 4 | 18 | 2 | 75.0% (12/16; CI 50.5–89.8) | 85.7% (12/14; CI 60.1–96.0) | 18.2% (4/22; CI 7.3–38.5) | 12/12 |
| B0 | 14 | 8 | 14 | 0 | 63.6% (14/22; CI 43.0–80.3) | 100% (14/14; CI 78.5–100) | 36.4% (8/22; CI 19.7–57.0) | 14/14 |
| A1 page+context | 12 | 5 | 17 | 2 | 70.6% | 85.7% | 22.7% (5/22) | 12/12 |
| A2 region-only | 14 | 7 | 15 | 0 | 66.7% | 100% | 31.8% (7/22) | 14/14 |

- **Region locality** alone (veiltrace vs A1) removed 1 FP: the cross-region banner + how-to (D24).
- **Negation and context modifiers** (veiltrace vs A2) removed 3 FPs (news quote D20, educational code blocks D21/D34) and 2 negation-only "observed" outcomes, at the cost of **2 FNs: modifier evasion D10 (planted reported speech) and D12 (planted blockquote)**.
- **All 4 remaining veiltrace FPs are R4:** troubleshooting docs (D17, D27, "fix this error" + chain) and internal IT notices (D18, D28, authority + chain).
- **Localization:** all 12 veiltrace TPs had every evidence element inside `evidenceWithin` (95% CI 75.8–100%). The dev lures are compact, so this does not stress localization. B0 also localized 14/14 here.
- **Network:** 0 requests during any scan.
- The width of the intervals (n = 36) means none of these differences is statistically established. **No claim of statistical significance is made.**

**Limitations of the 36-scenario dev corpus:**
- It is synthetic and short, written by one AI author who also wrote the rules. It was deliberately seeded with the M1 risks (R4 docs/IT pages, modifier evasion), so its FP and FN rates are not estimates of any real-world rate.
- Its class balance (14 malicious : 22 benign) is arbitrary.
- There are no benign modal/tutorial dialogs (needed for the P2 redesign, D-032), no long multi-topic pages, no real site frameworks, and few informal or code-mixed Indonesian variants.
- All precision, recall and FPR figures in this section are **development-split, synthetic results**. The frozen held-out split is untouched, and real-world effectiveness is unmeasured (§7).
- Committed artifacts: `eval/results/dev.json`, `dev.md`, `dev.research.json` and `dev.research.md` (deterministic, D-034). Timings are not committed.

## 10. M4.1 dev results (development split only; synthetic)

- **Corpus:** 50 dev scenarios: 21 malicious (14 positive, 7 adversarial) and 29 benign hard negatives (1 ambiguous); 29 EN, 21 ID. D37–D50 were added before the M4.1 candidates were implemented (D-046).
- **Baseline:** M3 (M1 model) on dev50: TP 16, FP 6, TN 23, FN 5. Precision 72.7% (16/22, CI 51.8–86.8), recall 76.2% (16/21, CI 54.9–89.4), hard-negative FPR 20.7% (6/29, CI 9.8–38.4).
- **Candidate `m4.1-rc1`:** TP 16, FP 1, TN 28, FN 5. Precision 94.1% (16/17, CI 73.0–99.0), recall 76.2% (16/21, CI 54.9–89.4), hard-negative FPR 3.4% (1/29, CI 0.6–17.2). Localization 16/16.
- **All candidates, raw counts and per-scenario changes:** DETECTION_MODEL.md §11 and `eval/results/dev.m41.md`.
- **Limitations:**
  - The candidates were designed by the same author who wrote the dev fixtures.
  - R4-β targets failure modes known since M2, so the improvement is optimistic.
  - Intervals overlap; no significance is claimed.
  - Nothing here estimates real-world or held-out performance.
- **The held-out split was not evaluated.** The single final run waits until the engine is adopted and frozen (D-041).

## 11. M4.3A: engine 0.2.0 adopted (dev split only; synthetic)

The `m4.1` rule set became the default engine `0.2.0` without changes (D-055). Regenerated dev artifacts (`eval/results/dev.*`) list `veiltrace` = 0.2.0 and `veiltrace-m1` = M1; both reproduce the §10 numbers exactly (0.2.0: TP 16, FP 1, TN 28, FN 5; M1: TP 16, FP 6, TN 23, FN 5). Research tables (`dev.research.*`, `dev.m41.*`) still compare variants against the M1 model. Markdown percentages are now computed from k/n (no double rounding), so a few dev Markdown figures moved by 0.1 point (e.g. 1/29 is 3.4%, not 3.5%); JSON is unchanged. The held-out split was not evaluated; its procedure is fixed in EVAL_PREREGISTRATION.md.

