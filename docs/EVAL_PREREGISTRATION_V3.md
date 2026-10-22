# Preregistration: held-out evaluation v3 (D-096)

Recorded on 2026-10-22, **before** any detector was run on the split.

## Split
- `corpus/test-v3/`: 80 scenarios, 45 malicious and 35 benign hard negatives. By threat category: cmd 11/9, cred 12/8, pay 11/9, sup 11/9 (malicious/benign). 52 Indonesian, 28 English; 47 message contexts (chat, SMS, webmail views) and 33 web pages; 4 need a click.
- Authored by a separate agent instance (Claude) instructed not to read anything in the repository outside its own folder and not to run any project command, after web research into current public scam reports (sources listed in `corpus/test-v3/README.md`; no live scam URL was opened). Real Indonesian institution names may appear as the impersonated sender, as in real scams; everything else is fictional and defanged.
- The rule author did **not** read the pages, labels or README scenario details; only an aggregate schema check (counts, keys, value ranges, files present) and the hash manifest were produced. Frozen by `MANIFEST.json` (SHA-256 of all 160 scenario files); `tests/corpus-v3.test.ts` fails on any change.
- Known bias: same model family as the rule author; synthetic pages. Results are **synthetic held-out**, reported separately from the real-world field sample.

## System
The configuration at the time of the run: ClickFix `m5` (engine 0.3.0) and the credential, payment and support detectors as shipped; versions are recorded by the harness. The on-device AI opinion is not part of the system (D-095).

## Metrics (Wilson 95% intervals, raw counts always reported)
- **Primary (changed from v2, decided before the run):** a malicious scenario is a true positive when **any** detector reports suspicious or manipulative (what a user sees); a benign scenario is a false positive when any detector does. Recall, precision, hard-negative FPR; overall, per threat category, per language and per context (message/page).
- **Secondary:** the v2 definition (the scenario's own category's detector), and localization, from `src/eval/v2.ts` `metrics`.
- Targets (research targets, not guarantees): recall ≥ 85%, precision ≥ 90%, hard-negative FPR ≤ 10%, requests 0.

## Protocol
- The v3 split is never opened or used for tuning. Development continues on the dev corpora and the real-world dev half only.
- The run is `npm run eval:v3 -- --final`, **only on owner request**, once per frozen code state; every run appends to `eval/runs-v3.md`. Results are published whether or not targets are met; a later run is reported as a second run, never replacing the first.
