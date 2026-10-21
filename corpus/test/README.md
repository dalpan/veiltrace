# Held-out test split (FROZEN)

**Do not edit, add or delete files in this directory.** `MANIFEST.json` records the SHA-256 of every
scenario file. `tests/corpus.test.ts` and `npm run eval -- validate --split test` fail on any change.
This README and `MANIFEST.json` themselves are excluded from the hash.

Rules (EVALUATION_PLAN.md §3, D-022):
- Never tune lexicons, rules, windows, extractor heuristics or thresholds against this split.
- Never run detection on this split during development. The harness refuses `--split test` without
  `--final`, and every final run is logged in `eval/runs.md` with the commit SHA.
- Refreezing requires `--refreeze` and an owner-approved DECISIONS.md entry. The old results stay published.

## Construction method

- 26 scenarios: 12 malicious (9 positive + 3 adversarial) and 14 benign. All 14 benign are hard negatives (2 of them are labelled "ambiguous"). 11 are Indonesian (42%) and 15 English.
- Each scenario is a self-contained HTML page served from local files under a **fictional host**
  (`*.example`, `*.test`). "Trusted domain" scenarios (T05 forum, T06 bank help, T14 docs, T16/T17 intranet) use plausible but fictional legitimate-looking hosts. No real organization is impersonated.
- Payloads are defanged (`*.invalid` hosts, harmless base64). Fixture scripts only reveal steps or write to the clipboard when the harness clicks, and they make no network requests.
- Labels give the **ground truth of intent** (`truth`) and the class a correct system should output (`expectedClass`). They were assigned by judging the page as a human reader would, **not** by running VEILTRACE. No detection was run on this split before it was frozen.
- `evidenceWithin` is a CSS selector that must contain every evidence element of a true positive.
- Written on 2026-10-21, after M1 and **before** the M2 DOM extractor, dev corpus and harness existed.

## Known biases and limitations

- **Single author with engine knowledge.** The scenarios and the M1 rules/lexicons were written by the same AI assistant (Claude Code) for the owner. Wording may unconsciously track the lexicon, which inflates recall, or deliberately probe known weaknesses (T09 quote markup, T10 reported speech, T12 cross-origin iframe, T17 internal IT), which deflates it. An independent second author is recommended for the next split.
- **Synthetic pages.** The pages are short and clean compared with real sites (no ads, trackers, frameworks or lazy loading). They are not field samples, and results must not be reported as real-world effectiveness.
- **Small n (26).** Confidence intervals will be wide.
- **Language.** The Indonesian text was written by a model, not a native speaker; colloquial and regional variants are under-represented.
- **Class balance.** 12:14 malicious:benign does not reflect real-world prevalence. Precision on this split does not estimate precision in the wild.
- **Known coverage gaps are included on purpose** (T12 cross-origin frame). They are expected misses that keep the recall estimate honest.
- **Canonical-phrase overlap (measured before freezing).** No sentence of ≥ 6 words is shared with the M1 unit fixtures, the lexicon examples or the dev corpus (`tests/corpus.test.ts`). Six short canonical phrases *do* recur: "Verify you are human", "I'm not a robot", "Prove you're not a robot", "Press Win + R", "Tekan Ctrl + V", "Open a command prompt". They are standard lure or UI wording from public reporting, and the M1 lexicon was built from the same public phrasing. They were deliberately **not** rewritten, because editing the test split to dodge the lexicon would itself be engine-aware tuning. Expect recall on canonical lures to be optimistic relative to novel wording.
