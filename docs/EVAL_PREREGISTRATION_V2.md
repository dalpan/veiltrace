# Preregistration: held-out evaluation v2 (D-085)

Recorded on 2026-10-22, **before** any detector was run on the split.

## Split
- `corpus/test-v2/`: 60 scenarios, 15 per category (cmd, cred, pay, sup), each 8 malicious + 7 benign hard negatives; 40 Indonesian, 20 English, 11 in informal Indonesian; 2 need a click to reveal the lure.
- Authored by a separate agent instance (Claude) instructed not to read the rules, lexicons, dev corpora, results or decisions, and to write realistic pages from its own knowledge with fictional brands and defanged payloads. The rule author did **not** read the pages or labels; only a schema check (counts, keys, value ranges) and the hash manifest were produced. The authoring script was deleted.
- Frozen by `MANIFEST.json` (SHA-256 of all 120 files); `tests/corpus-v2.test.ts` fails on any change.
- Known bias: the author is the same model family as the rule author, and the pages are small and clean. Results are **synthetic held-out**, not real-world effectiveness.

## Systems
- **Primary:** the default configuration at the time of the run: ClickFix ruleset `m5` and the credential, payment and support detectors as shipped (versions recorded by the harness).
- **ClickFix baseline:** ruleset `m4.1` (engine 0.2.0) on the cmd scenarios, reported side by side. Earlier versions of the other three detectors no longer exist in the code and are not compared.

## Metrics (Wilson 95% intervals, raw counts always reported)
- **True positive:** a malicious scenario whose own category's detector reports suspicious or manipulative. **False positive:** a benign scenario on which **any** detector reports suspicious or manipulative.
- Recall, precision, hard-negative FPR, localization (evidence of the category's strongest finding inside `evidenceWithin`), requests during scanning; overall, per category and per language.
- Targets (same as v1, research targets, not guarantees): recall ≥ 85%, precision ≥ 90%, hard-negative FPR ≤ 10%, localization ≥ 95%, requests 0.

## Protocol
- Development may continue on the dev corpora and the real-world dev half before the run; the v2 split is never opened or used for tuning.
- The run is `npm run eval:v2 -- --final`, **only on owner request**, once per frozen code state; every run appends to `eval/runs-v2.md` with commit and versions. Results are published whether or not targets are met. Any later change evaluated again on v2 is reported as a second run, never replacing the first.
