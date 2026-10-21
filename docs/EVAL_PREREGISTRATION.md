# Held-out Evaluation Preregistration (VEILTRACE, evaluation v1)

Status: **preregistered, not executed.** Written 2026-10-21 in M4.3A, before any detection was run on the held-out split. No held-out result exists or was inspected. Executing the run requires explicit owner approval and the `eval-freeze-v1` tag (§12).

## 1. Frozen system under test
| Item | Value |
|---|---|
| Engine (primary system `veiltrace`) | **0.2.0**, ruleset `m4.1` = M1 decision model (R1–R5, lexicons, negation, context modifiers) + P1b + P2-A + R4-β (`C.PROCEDURAL`), exactly as approved at M4.1 (D-041 … D-047, D-055) |
| Extractor | `0.1.0-m2` (`src/extract`, last changed in `64e632a`; unchanged since) |
| Evaluation harness | `src/eval` + `scripts/eval.mjs` as of the freeze commit (last changed in the M4.3A commit that introduces this document) |
| Source / harness commit | The commit tagged `eval-freeze-v1` (proposed: the M4.3A commit). The harness writes `git rev-parse HEAD` and a dirty flag to `eval/runs.md`; a dirty run is invalid |
| Held-out corpus | `corpus/test`, frozen in `407beb0`: 26 scenarios, 53 manifest-listed files. Manifest aggregate `954070c4cab79ba112907810fdc21e02ac5008c2348597b7063f6fed0bdde85e`; `corpus/test/MANIFEST.json` SHA-256 `c89904bfd438d5ea32a8d2ca70ee9e5d414e00e6240977ff8b9f826a8e6fd447` |
| Runtime | Playwright 1.64.1, Chromium headless shell build 1248 (156.0.8078.4), viewport 1280 × 800, deviceScaleFactor 1, macOS arm64, Node 26.8.1, all network requests outside corpus pages aborted |

## 2. Procedure
1. Verify a clean working tree at the tagged commit (`git status --porcelain` empty).
2. `npm ci` (lockfile-pinned; Playwright browser build as in §1). Do not change dependencies.
3. `npm run eval -- validate --split test` (manifest hashes, labels, offline loading). Stop if it fails.
4. **Single run:** `npm run eval -- run --split test --final`.
5. The harness writes `eval/results/test.json` (deterministic metrics and per-scenario outcomes) and `test.md`, appends one line (timestamp, commit, dirty flag, engine version) to `eval/runs.md`, and writes machine-specific latency to `test.perf.json` (git-ignored; summarized in the results document). `test.json`, `test.md` and `eval/runs.md` are committed unchanged, in a commit that contains nothing else.

Each scenario is evaluated with **actual DOM extraction**: the page is served offline at its fictional URL, scripted `steps` are clicked, `extractSnapshot()` runs in the page, and every system analyzes that same snapshot (ARCHITECTURE.md §10). Hand-written core snapshots are not used.

## 3. Systems
| System | Role | Definition |
|---|---|---|
| `veiltrace` | **Primary** | Engine 0.2.0 (default) |
| `veiltrace-m1` | Secondary, descriptive | M1 baseline engine 0.1.0-m1 (`ruleset: 'm1'`) |
| `B0` | Secondary, descriptive | Page-level co-occurrence baseline: all blocks in one region, K = ∞, **M1** R1–R5 table, no negation, no context modifiers (unchanged from M2) |
| `A1-page+context`, `A2-region-only` | Secondary, descriptive | M2 ablations on the M1 table (unchanged from M2) |

Research variants (`research`, `refine`) are never run on the held-out split (the CLI refuses).

## 4. Outcome mapping and metrics
- **Binary mapping:** a scenario is predicted positive iff the page verdict ∈ {`suspicious_correlation`, `manipulative_instruction`}. `observed_instruction` and `none` are negative. Ground truth comes from the frozen `truth` label (malicious = positive).
- **Primary metrics (`veiltrace`), with the D-011 research targets:**

| Metric | Definition | Target |
|---|---|---|
| Positive recall | TP / (TP + FN) over 12 malicious scenarios | ≥ 85% |
| Precision | TP / (TP + FP) | ≥ 90% |
| Hard-negative FPR | FP / hard negatives (14) | ≤ 10% |
| Evidence localization | Localized TPs / TPs (§5) | ≥ 95% |
| Requests during scanning | Every request (served or blocked) issued between extraction start and end, summed over scenarios | 0 |

- **Secondary metrics (descriptive):** overall FPR (identical to hard-negative FPR here, since all 14 benign scenarios are hard negatives); the 4 × 4 class matrix (expected vs predicted class) and exact class agreement; observed-instruction results on benign scenarios; per-language recall and FPR; partial-scan counts; latency p50/p95 (machine-specific, not a target).
- **Uncertainty:** Wilson score 95% intervals for every proportion, always with raw counts (k/n). No significance tests; n = 26.
- **Targets** are research targets (D-011). Meeting or missing them is reported as is; nothing is re-defined after the run.

## 5. Evidence localization criterion
For each true positive: take the strongest finding (highest classification; ties resolved by the engine's finding order). Resolve the locator of **every** evidence source (visible block, hidden clipboard candidate, copy control) in the live page with `resolveLocator`. The TP is localized iff all resolve **and** each element lies inside the label's `evidenceWithin` selector, crossing shadow roots and same-origin frames. A missing or unresolvable locator counts as **not localized**. Localization is not computed for FN, FP or TN.

## 6. Coverage and partial scans
Partial scans are **not excluded**. A scenario is scored on whatever was analyzed. Partial reasons (`frames-skipped`, budgets, etc.) are reported per scenario. A malicious scenario missed because its content was not inspectable (e.g. a cross-origin frame) is an FN.

## 7. Per-scenario reporting format
For every scenario, `docs/EVALUATION_RESULTS.md` will list: id, language, category, truth, expected class, the predicted verdict of each system, the rule IDs and classifications of the primary system's findings, partial-scan reasons, localization (TPs) and the error type (FP/FN). The report also contains corpus composition (truth, category, language, hard negatives), the class matrix, the B0 comparison and §10.

## 8. Failure handling and rerun policy
- **Infrastructure failure** (browser crash, timeout, disk error) **before** any metric was written: one rerun is allowed after fixing only the infrastructure, with no change to engine, extractor, lexicons, harness logic or corpus. Both attempts are logged in `eval/runs.md` with the reason.
- **After metrics exist:** no rerun to change results. If a defect is discovered (engine, extractor or harness), the original results stay published as evaluation v1. A fix becomes a new engine version that can only be evaluated on a **new** held-out split (evaluation v2), and both are reported.
- A dirty-tree run, or a run whose manifest check fails, is invalid and must be reported as such.

## 9. Prohibitions
- No tuning of rules, lexicons, modifiers, windows, thresholds, extractor heuristics, labels or the corpus using held-out results, labels or scenario contents, before or after the run.
- No inspection of held-out labels or pages for development purposes.
- No claim of real-world, operational or military effectiveness from these results. They describe 26 synthetic scenarios.

## 10. Known corpus construction biases (to be restated in the results)
- Same AI author for the rules, the dev split and the held-out split. Wording may track the lexicon (optimistic) or deliberately probe known weaknesses (T09 quote markup, T10 reported speech, T12 cross-origin iframe, T17 internal IT).
- Six canonical lure phrases overlap with lexicon examples by design (corpus/test/README.md).
- Synthetic, short pages; 12:14 malicious:benign; Indonesian text written by a model; n = 26, so intervals are wide.
- The M4.1 rules were developed on the dev split after the held-out split was frozen; the held-out split was not consulted (D-022, D-046).

## 11. Corrections relative to the M2 methodology (made before any held-out result)
1. **`veiltrace` now denotes engine 0.2.0** (the adopted default) instead of the M1 model. Justification: the frozen system under test is the production engine. The M1 model remains reported as `veiltrace-m1` for comparability.
2. **B0 and the A1/A2 ablations are pinned to the M1 decision table** (`ruleset: 'm1'`). Justification: this keeps their definitions identical to M2 (EVALUATION_PLAN.md §5). Without pinning, the default switch would silently change the baseline (P1b would apply to B0).

3. **Display rounding fixed in the harness** (`fmtRate`). Markdown percentages were computed from the 4-decimal JSON values, which rounded twice (1/29 = 3.448% was shown as 3.5%). They are now computed from k/n. JSON values and every metric definition are unchanged. Found while regenerating dev artifacts in M4.3A; affected dev Markdown and two figures in the docs were corrected.

No other methodological change was made.

## 12. Freeze and approval
The run is allowed only after the owner (a) approves this document and (b) approves creating the tag `eval-freeze-v1` on the freeze commit. The command is executed exactly once (§2.4).
