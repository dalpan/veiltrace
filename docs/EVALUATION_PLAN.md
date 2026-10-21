# Evaluation Plan

Status: plan. M4 targets approved (D-011). **Not yet executed:** the M1 snapshot scenarios in `tests/fixtures/scenarios.ts` are dev-split unit fixtures, not an evaluation corpus, and no metrics have been computed. The HTML corpus, harness and B0 arrive in M2.

## 1. Questions the evaluation must answer

- **Q1:** On reconstructed manipulative pages, does VEILTRACE produce a correct finding *and* point at the right element?
- **Q2:** On hard benign counterexamples, does it avoid suspicious/manipulative classifications?
- **Q3:** Does element-local correlation plus context modifiers measurably reduce false positives compared to page-level co-occurrence (baseline B0)?
- **Q4:** Does it work for Indonesian as well as English?
- **Q5:** Is it fast enough to feel instant?

Synthetic results answer Q1–Q5 *on our corpus*. They do **not** establish real-world effectiveness (§7).

## 2. Corpus layout

```
corpus/
  dev/                 # used freely while designing rules
    <scenario-id>/page.html
    <scenario-id>/label.json
  test/                # HELD-OUT; frozen before rule tuning (see §3)
  realworld/           # sanitized captures; never used for tuning
  MANIFEST.md          # table of scenarios, author, date, split, source
```

`label.json`:
```json
{
  "id": "pos-id-fake-captcha-01",
  "split": "dev",
  "lang": "id",
  "class": "T1",
  "expected": {
    "verdict": "manipulative_instruction",
    "findings": [{ "ruleId": "R1", "minClassification": "manipulative_instruction", "regionContainsSelector": "#verify-modal" }]
  },
  "notes": "Fake Cloudflare-style modal, Indonesian, hidden textarea copy target",
  "author": "…", "created": "2026-…"
}
```
Negatives use `"verdict": "none"` or `"verdict": "observed_instruction"`. Neither is a positive detection. An `observed_instruction` result on a negative is **not** a false positive, but its frequency is reported separately ("informational findings on negatives").

## 3. Leakage controls

1. **Split before design.** `test/` scenarios are written *from scenario descriptions* (§6) by a different person where possible, or by us **before** the corresponding rule exists, and are committed in a single "freeze" commit. Their hash is recorded in PROGRESS.md.
2. **No tuning on test.** The harness refuses to print per-scenario test results unless `--final` is passed. `--final` runs are logged to `eval/runs.md` with the commit SHA. If rules change after a final run, the next run is reported as a *new* run, and both are kept.
3. **Lexicon independence.** Test fixtures must use phrasing not copied from lexicon entries. A CI check flags any test fixture sentence that matches a lexicon example string verbatim.
4. **Report dev and test separately, always.**

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

## 5. Baseline B0 (for Q3)

B0 is our own minimal reimplementation of **page-level co-occurrence**, with the same lexicons and normalization: positive if the open + paste + execute patterns and any pretext pattern match anywhere in the full page text, ignoring regions and context modifiers. It is written by us from the description of the technique, not copied from any project. Reporting VEILTRACE vs B0 on the same corpus isolates the value of regions and context modifiers. We do **not** run or benchmark third-party extensions in the MVP evaluation, because that requires license-compatible, fair configuration and is out of hackathon scope.

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
