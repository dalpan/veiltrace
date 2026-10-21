# Detection Model

Status: M1 (implemented in `src/core`). Engine version is recorded in `ENGINE_VERSION`.

## 1. Design goals

1. **Separate observation from inference.** The engine first records *observations*: an exact text span in a known source matched a lexicon entry. It then infers *findings* from explicit rules. A risky instruction (a command, a key sequence, a clipboard step) is an observation. It becomes suspected social engineering **only** when it is correlated with a manipulation pretext inside the same region.
2. **Three result classes, never a single "score".**
   - `observed_instruction`: a risky instruction is present, but there is not enough evidence of manipulation. It is informational and does not alert.
   - `suspicious_correlation`: a risky instruction co-occurs with a weak pretext, or an incomplete instruction co-occurs with a strong pretext.
   - `manipulative_instruction`: a complete risky instruction co-occurs with a strong pretext (fake human verification).
3. **Confidence is not severity.** Each finding carries three independent fields:
   - `classification` is the tier above, after context modifiers.
   - `confidence` (`high`/`medium`/`low`) is how strongly the evidence supports that classification. Ambiguity (quotes, reporting, educational framing) lowers it.
   - `actionRisk` (`high`/`medium`) is the potential harm *if the instruction is followed and is malicious*. It depends only on the requested action (a complete execution chain or an executable command → `high`, an incomplete chain → `medium`).
4. **Direct instructions only.** VEILTRACE targets instructions **addressed to the current reader**. Descriptions of what someone else was told to do (news, incident reports, awareness material) are recognized by the *reported speech* modifier and demoted (§6).
5. **Domain-independent.** The core never reads `snapshot.url` or a hostname for any decision. Domain reputation is not ground truth for intent. A test asserts that changing `url` does not change the result.
6. **Deterministic and explainable.** The same snapshot always gives the same result. Every finding lists the rule, the observation IDs (with source offsets) and every modifier applied.

## 2. Pipeline

```
PageSnapshot ─▶ normalize each source text (offset map kept)
             ─▶ match lexicons ─▶ Observation[] (exact source offsets)
             ─▶ negation binding (negated actions are not instructions)
             ─▶ group blocks into Regions (same containerId, consecutive)
             ─▶ per region, slide a window of K blocks; evaluate rules R1–R5
             ─▶ select non-overlapping findings by precedence
             ─▶ apply context modifiers (quote, reported, educational, code example)
             ─▶ AnalysisResult { verdict, findings, observations, regions, coverage }
```

## 3. Sources, regions, windows

- **Sources** are text-bearing parts of the snapshot: visible `blocks`, `hiddenCopyCandidates` (text a page can place on the clipboard but the reader does not see) and `copyTriggers` (copy/verify buttons). Every observation records `{ source, start, end }`, where offsets are UTF-16 indices into that source's **original** text, and `text === original.slice(start, end)`.
- **Region:** a maximal run of consecutive blocks (document order) sharing the same `containerId`. The extractor (M2) assigns `containerId` from the nearest boundary element (dialog, section, article, form, positioned overlay, comment container, body). Region IDs are `"<containerId>:<firstBlockId>-<lastBlockId>"`, which is stable for a given snapshot. Hidden copy candidates and copy triggers join the region of their `containerId`, positioned at `afterBlockId`.
- **Window:** correlation happens only among observations within **K = 8 consecutive blocks of one region** (`WINDOW_BLOCKS`). Signals in different regions never correlate. This rule is tested explicitly: a pretext in region A cannot raise an instruction in region B.

## 4. Signals

| ID | Kind | Meaning | Lang |
|---|---|---|---|
| `A.OPEN_RUN` | action | Open the Run dialog, a terminal, PowerShell or a command prompt (incl. Win+R, Win+X, ⌘+Space) | en, id, any |
| `A.PASTE` | action | Paste into that surface (Ctrl+V, ⌘+V, "paste the code", "tempel kode") | en, id, any |
| `A.EXECUTE` | action | Confirm execution ("press Enter", "tekan Enter", "run the command") | en, id |
| `A.COMMAND` | action | A shell command with an execution/download/encoded-payload shape (strong), or a bare shell invocation (weak) | any |
| `A.COPY_TRIGGER` | action | A copy/verify control (structural) or text telling the reader to click it | en, id |
| `P.HUMAN_VERIFY` | pretext (**strong**) | Fake human/bot verification ("verify you are human", "saya bukan robot", "Verification ID") | en, id |
| `P.FAKE_FIX` | pretext (weak) | Error/fix/update framing | en, id |
| `P.URGENCY` | pretext (weak) | Deadlines, loss, threats | en, id |
| `P.AUTHORITY` | pretext (weak) | Claimed authority ("Microsoft Support", "Tim Keamanan") | en, id |
| `C.NEGATION` | context | A negation cue bound to an action ("never press…", "jangan pernah tekan…") | en, id |
| `C.REPORTED` | context | Reported speech ("victims were told to…", "korban diminta…") | en, id |
| `C.EDUCATIONAL` | context | Educational framing ("how to spot", "contoh modus penipuan", "waspada") | en, id |

Why the pretext split: "fix this issue", "within 24 hours" and "Security Team" appear routinely in legitimate troubleshooting, billing and account pages. A website asking you to *run a command to prove you are human* has no legitimate counterpart we know of. Strong pretexts can produce `manipulative_instruction`. Weak pretexts can produce at most `suspicious_correlation`.

**Derived action facts (per window):**
- `EXEC_CHAIN`: `A.OPEN_RUN` → `A.PASTE` → `A.EXECUTE` in reading order (block order, then offset).
- `PARTIAL_CHAIN`: `A.OPEN_RUN` followed by `A.PASTE` or `A.EXECUTE`. The open step is required, because "Ctrl+V then Enter" alone is common in benign contexts.
- `DELIVERED_COMMAND`: a strong `A.COMMAND` plus a delivery path in the window: a copy trigger, any of `A.OPEN_RUN`/`A.PASTE`/`A.EXECUTE`, or the command itself sitting in a hidden copy candidate.

## 5. Decision rules and precedence

Rules are evaluated on each window with **non-negated** actions only, and they are listed in precedence order. Per window evaluation, the first matching rule wins.

**Two passes per window.** Each window is evaluated twice: (1) with *direct* actions only (not reported, not inside a quotation), and (2) with all non-negated actions. Both results become candidates. This prevents a reported or quoted decoy chain from "absorbing" a real lure in the same region (tested).

**Selection.** Context modifiers (§6) are applied to every candidate first. Candidates are then ranked by **final classification** (manipulative > suspicious > observed), then rule precedence R1 > R2 > R3 > R4 > R5, then earliest evidence. A candidate is dropped if its evidence span overlaps an already-selected finding in the same region. Selected findings are reported in reading order.

**Evidence selection within a window.** The chain uses the earliest open step and the earliest following paste and execute steps. Pretext evidence includes every qualifying pretext observation in the window. When a strong and a weak lexicon entry of the same signal overlap, the strong (more precise) match is kept, e.g. "Windows + R" over "press the Windows key".

| Rule | Condition (same window) | Rule classification | Base confidence | actionRisk |
|---|---|---|---|---|
| **R1** `VERIFICATION_EXEC_CHAIN` | `EXEC_CHAIN` ∧ `P.HUMAN_VERIFY` | manipulative_instruction | high | high |
| **R2** `VERIFICATION_DELIVERED_COMMAND` | `DELIVERED_COMMAND` ∧ `P.HUMAN_VERIFY` | manipulative_instruction | high | high |
| **R3** `VERIFICATION_PARTIAL_CHAIN` | `PARTIAL_CHAIN` ∧ `P.HUMAN_VERIFY` | suspicious_correlation | medium | medium |
| **R4** `PRESSURE_EXEC_CORRELATION` | (`EXEC_CHAIN` ∨ `DELIVERED_COMMAND`) ∧ ≥ 1 weak pretext family | suspicious_correlation | medium if ≥ 2 weak families, else low | high |
| **R5** `OBSERVED_EXEC_INSTRUCTION` | `EXEC_CHAIN` ∨ `PARTIAL_CHAIN` ∨ `DELIVERED_COMMAND` (no pretext condition met above) | observed_instruction | high | high if chain/command, else medium |
| — | Pretext without any action, a lone command without a delivery path, or urgency alone | **no finding** | — | — |

Notes:
- R5 confidence is "high" because it is a statement that an instruction **is present**, not that it is malicious.
- No rule reads hostname, URL, title or page-global text.

## 6. Context modifiers

Applied after rule selection. Demotion moves the classification down the tier ladder `manipulative → suspicious → observed`, never below `observed_instruction`. **Each applied modifier lowers confidence one level** (minimum `low`). The total demotion is capped at 2 tiers.

| Modifier | Trigger (evaluated on the finding's own evidence) | Effect |
|---|---|---|
| `C.NEGATION` | A negation cue precedes the action within 40 characters, with **no clause break** in between (`, ; : . ! ?` or a conjunction: and, then, or, but, dan, lalu, kemudian, atau, tapi), and is not an affirmative idiom ("don't worry", "don't forget", "jangan khawatir", "jangan lupa", "jangan ragu") | The action is marked `negated` and **excluded before correlation**. A broken chain then simply does not match R1–R5. Because conjunctions end the scope, in "never press Win+R **and** paste…" only the first step is negated. That is enough to break the chain, and it defeats "do not refresh **and** press Win+R…" evasions |
| `C.QUOTED` | ≥ 50% of the finding's block-sourced action observations are in blocks flagged `quote` (`blockquote`/`q`/`cite`) | demote 2 |
| `C.REPORTED` | A reported-speech cue appears before an action of the finding in the same block and sentence, **or** in the nearest earlier block (within K) that ends with `:` (list introduction) | demote 2 |
| `C.EDUCATIONAL` | An educational cue appears in a block of the finding's window, or in the `headingContext` of one of its evidence blocks | demote 1 |
| `C.CODE_EXAMPLE` | Every action observation of the finding lies in a `code`/`pre` block inside an `article` (copy buttons are allowed alongside), at least one is block-sourced, and the region has ≥ 15 words of non-code prose | demote 1 |

Deferred to M4: `C.OVERLAY` (geometry) and `C.UGC` (labels findings inside user-generated content, with no demotion).

**Page verdict** = the highest classification among findings, or `none`. Only `suspicious_correlation` and `manipulative_instruction` count as positive detections for evaluation and for any future alert.

## 7. Normalization

Matching runs on a normalized copy. Evidence always uses the original text.
1. The text is processed in units (a base code point plus following combining marks). Each unit is mapped through NFKC → NFD → combining-mark removal → lowercase.
2. Zero-width characters (U+200B–U+200D, U+2060, U+FEFF, U+00AD) are dropped.
3. A small confusables fold maps Cyrillic/Greek lookalikes to Latin.
4. Whitespace runs collapse to a single space.
5. Every normalized character keeps `[origStart, origEnd)`. A normalized span `[s, e)` maps back to `[map[s].start, map[e-1].end)`. Matches whose source units were altered by steps 2–3 set `deobfuscated: true` on the observation.

## 8. Known limits (M1, each pinned by a test in `tests/fixtures/scenarios.ts` → `KNOWN_LIMITATIONS` where applicable)
- **False negatives:** lexicon matching is phrase-based, so paraphrases outside the lexicon are missed (S-L3: "hold the flag key and tap R…"). Recall per language is measured in M2/M4.
- **False positives:** weak pretexts are common in legitimate pages. An IT notice that asks staff to open PowerShell, paste and press Enter is classified `suspicious_correlation` (R4, confidence low) because "IT Department" is an authority cue (S-N8). A troubleshooting doc saying "to fix this error, open Terminal and run: `curl … | bash`" with a copy button is also R4 (S-L2), because the open step is in prose, so `C.CODE_EXAMPLE` does not apply.
- Negation and reported speech are cue-based, not syntactic. An attacker could add a reporting phrase ("the attackers instructed visitors to:") to a lure. That demotes it to `observed_instruction`, but it is still shown.
- Educational cues can be planted by an attacker. They demote only one tier, so a `manipulative_instruction` still surfaces as `suspicious_correlation`.
- Lowercase-only and Latin-confusable folding: other scripts (e.g. Armenian lookalikes) are not folded.
- Region quality depends on the extractor's `containerId` (M2). Hand-written snapshots in M1 assume ideal containers.
- Performance: a 5,000-block snapshot takes ~210 ms in Node on the development machine (all 115 lexicon regexes run on every block). An optimization pass is planned before the M4 latency measurement.
