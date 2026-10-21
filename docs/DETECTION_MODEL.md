# Detection Model

Status: since M4.3A the **default** engine is `0.2.0` = the M1 model (§1–§8) plus the M4.1 rule set `m4.1` (P1b + P2-A + R4-β, §11), owner-adopted unchanged from the M4.1 candidate `0.2.0-rc.1` (D-055). This is the engine frozen for held-out evaluation v1 (EVAL_PREREGISTRATION.md). The M1 model stays selectable with `analyze(snapshot, { ruleset: 'm1' })` (engine `0.1.0-m1`); baselines and ablations use it. M2 added research-only `AnalyzeOptions` (§9) and measured the model on the dev split. Rule decisions after the M2 review are in §10; the M4.1 refinement is in §11.

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

## 9. Research options (M2, `AnalyzeOptions`)

`analyze(snapshot, options?)`. *Since M4.3A (D-055), omitting `options` runs engine 0.2.0; the M1 model is `{ ruleset: 'm1' }`, and the sentences below about "omitting options" now apply to that path.* `ruleset` selects `'m4.1'` (default; `'m4.1-rc1'` is an alias) or `'m1'`; the other options apply on top of the selected rule set. Omitting `options`, or passing `{}`, reproduced the M1 model exactly; a test asserts deep equality on all unit fixtures. The options exist so that baselines and ablations run on identical input:
- `windowBlocks` (default 8; `Infinity` = whole region)
- `contextModifiers` (default true)
- `negation` (default true)
- `experimental.r4MinWeakFamilies`, `experimental.r4ExcludeAuthorityOnly`, `experimental.noDemotionInDialogs`, which are candidate rule changes under evaluation (§10)

Production callers (the extension) must use the defaults (D-028, D-055).

## 10. M2 findings and proposed changes (dev split only; NOT applied)

Evidence: `eval/results/dev.research.md`. The dev split deliberately contains these failure modes, so the effects below are **upper bounds on benefit**. Each proposal must be validated on the frozen held-out split at M4 **after** the owner approves it, and that validation run is the first and only test-split run.

| Risk | Dev evidence | Proposal | Status |
|---|---|---|---|
| R-1: R4 FPs on legitimate docs and IT notices | 4/22 dev FPs, all R4: D17/D27 (`P.FAKE_FIX` only), D18/D28 (`P.AUTHORITY` only) | **P1:** R4 must not escalate when `P.AUTHORITY` is the only weak family; report `observed_instruction` and keep the authority observation. Dev: FP 4→2, recall unchanged (12/14) | **Accepted for the next controlled rule revision; not implemented** (D-031) |
| R-1 alternative | `r4MinWeakFamilies = 2`: FP 4→0, but recall 12→10, because real fix-it lures D13 and D14 are lost | Rejected: it trades real lures for docs FPs | Rejected |
| R-1 residual | D17/D27 "to fix this error, open Terminal, paste…, press Enter" + `curl … \| bash` remain FPs under P1 | Open question. Lexically indistinguishable from fix-it lures on these pages; may need presentation signals (overlay, M4 `C.OVERLAY`) | Open |
| R-2: modifier evasion | D10 (planted "Visitors were asked to complete these steps:") and D12 (lure in `<blockquote>`) demoted to `observed_instruction` = FN. D11 (planted "Security tips") demoted to suspicious (still TP) | **P2 (as evaluated):** context modifiers do not demote a finding whose evidence lies entirely in a dialog/overlay container. Dev: recovers D10, D11 and D12 with no new FP, **but the dev split has no benign modal/tutorial counterexamples**, so that result is uninformative about the cost | **Rejected in this form** (D-032). Redesign must require evidence of a direct behavioral instruction to the current user and must preserve benign modal/tutorial demotion |
| R-2 residual | Planted reported speech or quotes **outside** an overlay (e.g. in a comment) still demote | Open: candidate syntactic cues (2nd-person imperative after the cue) | Open |
| R-3: window K | K ∈ {6, 8, 12, 16, ∞} identical on dev. K = 4 demotes D02 (heading + list split by the 3-step list), and K = 2 also loses D03 | Keep K = 8. Dev pages are small, so revisit with larger realistic pages before claiming insensitivity | Keep |
| Region boundaries | Coarse containers (dialog/overlay/body only) add 1 FP (D24: header banner pretext + article how-to) | Keep semantic containers | Keep |

For the record only: P1 + P2 combined on dev gave TP 14, FP 2, TN 20, FN 0. This is tuned on dev, P2 is rejected, and it must not be cited as a performance claim.

## 11. M4.1 controlled refinement (dev split only; rule set `m4.1`, default since M4.3A)

Developed and approved at M4.1 as the experimental candidate `m4.1-rc1` (engine `0.2.0-rc.1`); adopted unchanged as the default engine `0.2.0` at M4.3A (D-055). "rc1" below refers to this rule set.

Evidence: `eval/results/dev.m41.{json,md}` (`npm run eval -- refine --split dev`). The dev split grew from 36 to 50 scenarios (D37–D50). The new scenarios were written **before** the candidates were implemented, and include benign counterexamples aimed at the candidates. The held-out split was not used.

### 11.1 Mechanisms implemented (research options; the default stays M1)

| ID | Mechanism | Implementation |
|---|---|---|
| P1 | R4 does not fire when `P.AUTHORITY` is the only weak family | `experimental.r4ExcludeAuthorityOnly` |
| **P1b** | P1, **unless** the region stages a concealed clipboard payload | `experimental.r4AuthorityOnlyUnlessConcealed` |
| **P2-A** | A **concealed clipboard payload** in the finding's correlation window suppresses contextual demotion (`O.CONCEALED_PAYLOAD`, with the payload observation as evidence). Concealed = a hidden-copy source with a strong `A.COMMAND` whose normalized text appears in no visible block on the page. **Association:** only payloads inside the same K = 8 window count, for P1b, P2-A and the R4-β exclusion (D-047) | `experimental.concealedPayloadOverride` |
| P2-B / P2-C | "Verification gate": all evidence in a dialog/overlay **and** a `P.HUMAN_VERIFY` pretext **and** < 25 other words in the region. B suppresses demotion; C caps it at one tier (`O.VERIFICATION_GATE`) | `experimental.verificationGateOverride: 'skip' / 'cap1'` |
| P2-D | Reported-speech list introductions do not bind inside dialogs/overlays | `experimental.reportedListIntroOutsideDialogsOnly` |
| **R4-β** | New modifier `C.PROCEDURAL` (demote 1). Applies only to R4 findings with exactly one weak family, whose evidence is in `article` context outside any dialog/overlay, in a region that contains a code/pre block and stages no concealed payload | `experimental.proceduralDocModifier` |

Overrides are explicit in the output (`Finding.overrides[]` with id, effect, suppressed modifiers and reason, plus "Not lowered: …" in the summary). Each override, like each modifier, lowers confidence one level, because it signals conflicting evidence. Action risk is never changed by any of these mechanisms.

### 11.2 Dev results (50 scenarios: 21 malicious, 29 benign hard negatives)

| System | TP | FP | TN | FN | Precision | Recall | Hard-neg FPR |
|---|---|---|---|---|---|---|---|
| M3 baseline (M1 model) | 16 | 6 | 23 | 5 | 72.7% (16/22) | 76.2% (16/21) | 20.7% (6/29) |
| P1 | 15 | 4 | 25 | 6 | 78.9% | 71.4% | 13.8% (4/29) |
| P1b | 16 | 4 | 25 | 5 | 80.0% | 76.2% | 13.8% (4/29) |
| P2-A | 16 | 6 | 23 | 5 | 72.7% | 76.2% | 20.7% |
| P2-B | 19 | 7 | 22 | 2 | 73.1% | 90.5% | 24.1% (7/29) |
| P2-C | 19 | 7 | 22 | 2 | 73.1% | 90.5% | 24.1% |
| P2-D | 18 | 7 | 22 | 3 | 72.0% | 85.7% | 24.1% |
| R4-β | 16 | 1 | 28 | 5 | 94.1% | 76.2% | 3.4% (1/29) |
| P1b + P2-A + P2-C + R4-β | 19 | 2 | 27 | 2 | 90.5% (19/21) | 90.5% (19/21) | 6.9% (2/29) |
| **m4.1-rc1 = P1b + P2-A + R4-β** | **16** | **1** | **28** | **5** | **94.1% (16/17; CI 73.0–99.0)** | **76.2% (16/21; CI 54.9–89.4)** | **3.4% (1/29; CI 0.6–17.2)** |

Per-scenario changes vs M3 (from `dev.m41.md`):
- **P1:** fixes FP D18 and D28, but creates **new FN D42** (a fake-support overlay whose only pretext is authority).
- **P1b:** fixes D18 and D28 with no new FN (D42 keeps R4 because its region stages a concealed payload).
- **R4-β:** fixes FP D17, D18, D27, D28 and D40, with no new FN.
- **P2-A:** D45 suspicious → manipulative (class change on a TP); no FP or FN change on dev.
- **P2-B/C:** fix FN D10, D12 and D50, but create **new FP D38** (terse benign quiz dialog quoting a lure).
- **P2-D:** fixes FN D10 and D50, but creates **new FP D37** (benign tutorial modal with a reported list).

### 11.3 Decisions and rationale

| Candidate | Recommendation | Why |
|---|---|---|
| P1 | Superseded by P1b | It loses a real authority-only lure that stages a payload (D42) |
| **P1b** | **Include in rc1** (D-042) | Owner-approved intent (D-031), refined to preserve rule matches backed by clipboard staging. 2 FP fixed, 0 FN |
| **R4-β `C.PROCEDURAL`** | **Include in rc1** (D-044) | 5 FP fixed, 0 FN on dev. It is DOM-evidenced (article, code block, no dialog, no concealed payload), applies only to single-family R4, never touches R1–R3, and keeps action risk high |
| **P2-A** | **Include in rc1** (D-043) | Conservative: it overrides demotion only on hard evidence of interaction machinery a quote or tutorial never has. Small dev effect, no counterexample triggered it |
| P2-B / P2-C / P2-D | **Not included in rc1** (D-043); P2-C not permanently ruled out | Every gate variant that recovers the planted-context lures also misfires on a benign dialog counterexample. With quote-identical text, the dev fixtures offer no evidence that separates D12 (lure) from D38 (quiz) without overfitting. P2-C is offered as an owner option with this explicit trade-off: +3 TP, +1 FP on dev |
| `C.OVERLAY` | Not added as a modifier (D-045) | In the strongest M3 finding, overlay/dialog evidence occurs in 15 malicious vs 3 benign scenarios. It is correlated but not sufficient, and the dev composition (lures were mostly written as overlays) inflates the correlation. It is used only as a *condition* inside other rules (R4-β exclusion, P2 gate), never to raise risk |
| `C.UGC` | Not added (D-045) | 3 malicious vs 1 benign. Too few to justify any effect; candidate for a UI label only |

### 11.4 Remaining errors under rc1 (dev)
- **FP D39:** docs quick-start *dialog* with "To fix this, run the same command with sudo" + install chain. R4-β deliberately excludes dialogs.
- **FN D10, D12, D50:** planted reported speech / blockquote inside a verification dialog, without a payload (P2 gate not adopted).
- **FN D43:** quoted lure in a forum comment without a payload.
- **FN D44:** very informal Indonesian paraphrase ("pencet … sama … barengan", "terus", "abis itu"), which is outside the lexicon. A lexicon revision is a separate future step.

### 11.5 Caveats
- R4-β was motivated by D17/D27 (known since M2), and D40 was written by the same author after that motivation existed. The dev improvement is therefore an **optimistic** estimate.
- The rc1 composition (P1b + P2-A + R4-β) was the pre-stated conservative hypothesis. The evaluation compared it against the alternatives rather than searching all combinations.
- n = 50 synthetic scenarios: the confidence intervals overlap heavily, and no claim of significance or real-world accuracy is made.
- Performance: identical to M1 (≈ 153 ms per 5,000 synthetic blocks after warm-up, Node). The extra work is one concealed-payload pass per analysis.


## 12. EXPERIMENTAL credential-disclosure detector (M5.1, `cred-0.1.0-exp`)

**Status: experimental, development data only.** Separate from the ClickFix engine: `analyzeCredentials(snapshot)` reads the same `PageSnapshot` and returns its own `CredentialResult`. `analyze()` (engine 0.2.0, ruleset `m4.1`) is unchanged and is not influenced by it (tested on every unit fixture and on the 50 dev pages). It has **not** passed a frozen evaluation (D-062).

### 12.1 Inputs
- Block text, as for ClickFix.
- **Structural form fields** (extractor 0.2.0-m5, `snapshot.formFields`): visible `input`/`textarea` elements with a `kind` derived only from `type`, `autocomplete`, `inputmode`/`maxlength` and name/id/label tokens (`password`, `otp`, `pin`, `recovery-code`, `secret-phrase`, `email`, `text`, `other`), the page-authored `label` (`<label>`, `aria-label` or placeholder) and placement. **No value, default value or typed text is ever read** (D-063).
- `snapshot.forms`: method, a **destination category** (`none`, `same-origin`, `other-origin`, `mailto`, `javascript`, `data`, `other`) and the container enclosing the form. The destination is reported as context and **never scored**: legitimate single sign-on posts to other origins, and URL/host remain non-decision inputs (D1).

### 12.2 Signals (EN + ID, `src/core/credential/lexicon.ts`)
| Family | Ids | Notes |
|---|---|---|
| Secret | `S.PASSWORD`, `S.OTP`, `S.PIN`, `S.RECOVERY_CODE`, `S.SEED_PHRASE`, `S.TOKEN` | What is requested |
| Disclosure | `D.SEND` (send, share, tell, reply with, post here; kirim, berikan, sebutkan, me- forms), `D.ENTER` (enter, type, confirm; masukkan, isi, ketik) | What the reader is asked to do |
| Pretext | `CP.ACCOUNT_THREAT`, `CP.URGENCY`, `CP.SUPPORT`, `CP.VERIFY`, `CP.REWARD` | `CP.SUPPORT` and `CP.VERIFY` are ordinary in legitimate flows. Urgency excludes code expiry ("expires in 10 minutes", "berlaku dalam 5 menit") |
| Structural | `F.SECRET_FIELD` | A visible field of a secret kind |
| Context | `C.NEGATION`, `C.REPORTED`, `C.EDUCATIONAL` | Reused read-only from the ClickFix lexicon |

A **request** is a disclosure verb followed by a secret in the same sentence (≤ 60 normalized characters), not negated ("never share your OTP" is advice, not a request), or a visible secret field.

### 12.3 Scope
Requests and pretexts correlate inside one region and window (K = 8), as in ClickFix. **Forms continue the region of a container that encloses them** (`FormInfo.ancestorContainerIds`, nearest first, at most 8), so a dialog's warning text and a form nested in a section inside it are one scope. Only forms are merged, and the ancestor list stops at user-content, widget and frame containers: a form in a comment never inherits the article's context.

**Each request is scored on its own** (its pretexts, its context), and a cluster's finding is its strongest request with the evidence of all of them. A pretext inside a quotation or code sample counts only for a request in that same block, so a quoted scam message does not escalate a practice field or a real form next to it.

### 12.4 Decision table (first match)
| Rule | Name | Condition | Classification |
|---|---|---|---|
| CR1 | SECRET_TO_THIRD_PARTY | A **send** request for any secret | manipulative with any pretext; suspicious without |
| CR2 | RECOVERY_PHRASE_UNDER_PRETEXT | A recovery phrase requested with any pretext | manipulative |
| CR3 | SECRET_IN_UNTRUSTED_CONTENT | A request in user content, a widget or a frame (container kind), with any pretext | suspicious |
| CR4 | SECRET_UNDER_PRESSURE | A request with an **account threat** (suspend, lock, close, freeze) | suspicious |
| CR5 | OBSERVED_SECRET_REQUEST | Any other request (ordinary sign-in, MFA, restore, settings) | observed (informational) |

Rationale: legitimate services ask you to *type* codes into their own form, never to pass them to a person or channel (CR1); a recovery phrase grants full control of a wallet (CR2). "Verify your account" and claimed support are normal in real MFA and help flows, so neither escalates on its own. Deadlines and offers alone are common on legitimate shops (dev CN18), so only account threats escalate a plain entry request (CR4).

### 12.5 Context modifiers and override
- Per request: `C.QUOTED` (−2), `C.REPORTED` (−2) and `C.CODE_EXAMPLE` (−2) for text requests; `C.EDUCATIONAL` (−1) for any request. Total demotion is capped at 2.
- `O.LIVE_SECRET_FIELD`: a working field for the **same kind of secret** in the cluster (outside quotes and code) sets aside **only `C.EDUCATIONAL`**, a cue an attacker can plant next to a form. Quotation, reported speech and code samples stay, because they are structural evidence that the text belongs to someone else (unlike ClickFix P2-A, which sets aside all contextual modifiers).
- Confidence drops one level per applied modifier or override. Action risk is **high** for send requests and for codes, recovery codes, recovery phrases and tokens; **medium** for typing a password or PIN.

### 12.6 Output semantics
Each finding carries `requestedAction` (send/enter), `secretTypes`, `pretexts`, `trustContext` (user-content, third-party-widget, embedded-frame, dialog, overlay, form), `formDestination` (context only), evidence observation ids, modifiers/overrides, and explicit `limitations`: `claimed-identity-unverifiable` (a claim to be support is never proof), `destination-not-scored`, `trust-boundary-heuristic` (third-party status is inferred from structure).

### 12.7 Development results (cred-dev, 36 synthetic scenarios; NOT held-out)
Corpus: 11 positive, 5 adversarial, 20 benign hard negatives; 26 EN, 10 ID (`corpus/cred-dev/README.md`). Same author as the rules.

| Version | Change (dev evidence) | TP | FP | TN | FN |
|---|---|---|---|---|---|
| v0 (first run) | Initial rules, written before the corpus was run | 12 | 1 | 19 | 4 |
| v0.1 | Forms join the preceding region by locator prefix; per-request context reasons; Indonesian me- verbs | 13 | 1 | 19 | 3 |
| **v1 (`cred-0.1.0-exp`)** | Forms join their enclosing container (recorded by the extractor; generalized to a bounded chain in §12.8); CR4 escalates on account threat only; "mengirim" morphology | **14** | **0** | **20** | **2** |

v0 errors: FP CN05 (awareness article mixing a quoted and a reported request), FN CD03/CD07 (pretext in the dialog, field in the nested form), FN CA02, CA03. v0.1 fixed CN05 and CD07 but introduced FP CN18 (shop promo deadline + login) and still missed CD03 (id-based locators broke the prefix test). v1 errors: **FN CA02** (request inside blockquote markup, no live field) and **FN CA03** (very informal Indonesian paraphrase: "kasih liat dong angka yg barusan masuk"). Precision 100% (14/14; CI 78.5–100), recall 87.5% (14/16; CI 64.0–96.5), hard-negative FPR 0% (0/20; CI 0–16.1), localization 14/14, 0 requests, 0 privacy-sentinel leaks over 26 typed fields. **These numbers are tuned on this data and are optimistic by construction.**

### 12.8 Finalization hardening (before the M5.1 commit; no dev classification changed)
Targeted regressions exposed four weaknesses, fixed without changing any cred-dev outcome (36/36 identical; TP 14, FP 0, TN 20, FN 2):
1. Field and form locators no longer contain the element's own id or name (positional path); hints are fixed tokens, never raw attribute values.
2. Forms record their whole enclosing-container chain (bounded, stopping at trust boundaries) instead of one parent, so nested forms keep their dialog context.
3. Per-request scoring; quoted or code pretexts only count for requests in the same block (interactive awareness exercise stays observed).
4. The live-field override needs a field of the same secret kind and only sets aside educational framing (a quoted request next to an unrelated login box stays observed).
Consequence: a credential lure wrapped in quotation markup is not recovered by a nearby live field (consistent with the measured CA02 miss).

## 13. EXPERIMENTAL payment-manipulation detector (M5.2, `pay-0.1.0-exp`)

**Status: experimental, development data only.** `analyzePayments(snapshot)` (`src/core/payment/`) returns its own `PaymentResult`. It changes neither `analyze()` nor `analyzeCredentials()` (tested on every unit fixture and on every pay-dev page). It has **not** passed a frozen evaluation (D-071).

### 13.1 Inputs and privacy
Block text only. It never reads url, title, form fields or forms, so it never sees card numbers, typed values or balances in inputs. Amounts in page text are matched to tie a request to money, but **their values are never reported** (`PA.AMOUNT` observations carry `text: ""`), and runs of 5+ digits in any other evidence are masked (D-072).

### 13.2 Signals (EN + ID, `src/core/payment/lexicon.ts`)
| Family | Ids | Notes |
|---|---|---|
| Request | `PY.PAY` | pay, transfer, wire, deposit, top up, send money, buy gift cards; bayar, transfer, setor, lunasi, kirim uang, wajib membayar. Past tense is a report, not a request |
| Object | `PA.AMOUNT`, `PF.FEE`, `PF.RELEASE_FEE` | Release fee = a fee whose purpose is to release or unlock (verification, unlock, release, clearance fee; pajak hadiah, biaya pencairan, biaya buka blokir) |
| Destination | `PD.PERSONAL`, `PD.OFF_PLATFORM`, `PD.GIFT_CARD`, `PD.CRYPTO` | Only someone else's personal account ("your personal account" is ordinary banking) |
| Receive | `PR.REFUND`, `PR.PRIZE`, `PR.UNLOCK`, `PC.CONDITION` | What is promised, and the clause that makes payment a precondition ("to receive", "agar dapat dicairkan") |
| Pressure | `PP.THREAT`, `PP.URGENCY`, `PP.AUTHORITY` | Threat = account closure or arrest/legal action. Urgency = minutes/hours or explicit pressure, not due dates. Authority is a claim, never verified |
| Context | `C.NEGATION`, `C.REPORTED`, `C.EDUCATIONAL` | Reused read-only from the ClickFix lexicon |

A **request** is a block with a non-negated pay verb and an amount, fee or destination in the same block (or, when the verb has no object, the block just before it), or a release fee stated with an amount. Requests and pressure correlate inside one region and window (K = 8). Pressure inside a quotation or code sample counts only for a request in that same block.

### 13.3 Decision table (first match; keyword-only matches never alert)
| Rule | Name | Condition | Classification |
|---|---|---|---|
| PR1 | ADVANCE_FEE_TO_RECEIVE | A release fee, or a promised refund/prize/unlock nearby **and** a condition clause in the request | manipulative with any of authority, threat, urgency, off-channel destination or untrusted placement; suspicious without |
| PR2 | OFF_CHANNEL_PAYMENT | Destination is a personal account, off-platform, gift cards or crypto | manipulative with authority or threat; suspicious with urgency, untrusted placement or off-platform |
| PR3 | PAYMENT_UNDER_THREAT | Threat with authority or urgency; or urgency with authority claimed in the request's own block | manipulative with threat + authority + urgency; suspicious otherwise |
| PR4 | OBSERVED_PAYMENT_REQUEST | Any other request (checkout, invoice, bill, donation, shop) | observed (informational) |

Rationale: payment requests, fees, deadlines and "customer service" all occur on legitimate checkouts, so none of them alerts alone. Paying first to *receive* something (PR1), paying outside the expected channel under pressure (PR2), and paying under threat from a claimed authority (PR3) are the combinations that legitimate flows do not use.

Modifiers as in §12.5 (`C.QUOTED`, `C.REPORTED`, `C.CODE_EXAMPLE` −2; `C.EDUCATIONAL` −1; cap 2); no override. Confidence: high for manipulative/observed, medium for suspicious, minus one per modifier. Action risk is **high** for PR1 and off-channel destinations (money is rarely recoverable), otherwise **medium**. Limitations: `claimed-identity-unverifiable`, `trust-boundary-heuristic`, `amount-not-reported`.

### 13.4 Development results (pay-dev, 27 synthetic scenarios; NOT held-out)
Corpus: 10 positive, 1 adversarial, 16 benign hard negatives (checkout, virtual account, invoice, utility bill, donations, news reports, awareness pages, return policy, top-up promo, gift-card shop, own-account transfer, marketplace safety tips, genuine prize notice); 13 EN, 14 ID (`corpus/pay-dev/README.md`). Same author as the rules; labels written before the first run; no rule was changed after it.

TP 10 · FP 0 · TN 16 · FN 1 (`eval/results/pay-dev.md`). Miss: **PA01**, very informal Indonesian abbreviations ("tf dl 150rb ... buat bka akunnya"). Localization 10/10, 0 requests during scanning, 0 privacy-sentinel leaks (card-number-like sentinel typed into every field). ClickFix verdict `none` and credential verdict none/observed on all 27 pages. **Optimistic by construction; not real-world effectiveness.**

## 14. EXPERIMENTAL fake-support and authority-impersonation detector (M5.3, `sup-0.1.0-exp`)

**Status: experimental, development data only.** `analyzeSupport(snapshot)` (`src/core/support/`) returns its own `SupportResult` and changes none of `analyze()`, `analyzeCredentials()` or `analyzePayments()` (tested on every unit fixture and every sup-dev page). It has **not** passed a frozen evaluation (D-074).

### 14.1 Inputs and privacy
Block text only; never url, title, form fields or values. Phone numbers (9–15 digits) are matched but **never reported** (`text: ""`); other evidence has 5+ digit runs and `@handles` masked, and `parseScanReport` rejects any support evidence containing a 5+ digit run (D-075).

### 14.2 Signals (EN + ID, including informal Indonesian; `src/core/support/lexicon.ts`)
| Family | Ids | Notes |
|---|---|---|
| Direction | `SC.CONTACT`, `SA.REMOTE`, `SA.INSTALL` | call/contact/chat, hubungi/telp/japri/wa ke; AnyDesk/TeamViewer, share your screen, akses jarak jauh; install/dl/unduh + app/apk/aplikasi |
| Channel | `SX.PHONE`, `SX.MOBILE`, `SX.MESSENGER` | Mobile = Indonesian 08…/+62 8… (a personal line). WhatsApp, Telegram, DM, japri |
| Claim | `SI.SUPPORT`, `SI.BANK`, `SI.ADMIN`, `SI.SECURITY` | Claimed identity: **never verified and never escalates alone** |
| Pressure | `SW.ALERT`, `ST.THREAT`, `SU.URGENCY` | Alert = a virus/hack/lock asserted about the reader's device ("your computer is infected", "hp kamu kena virus", "do not restart your computer") |
| Context | `SH.UNASSERTED`, `C.NEGATION`, `C.REPORTED`, `C.EDUCATIONAL` | `SH.UNASSERTED` makes an alert conditional ("if/jika …") or attributed ("a pop-up that says …"). Negation distributes over "or/atau" lists |

A **direction** is a block with a non-negated remote-access or install request, or a contact verb with a phone number or messenger in the same or an adjacent block, or a messenger name followed by a number ("WA 0812…").

### 14.3 Decision table (all applicable rules are evaluated; the strongest wins)
| Rule | Name | Condition | Classification |
|---|---|---|---|
| SR1 | FAKE_SYSTEM_ALERT_SUPPORT | An asserted device alert with any direction | manipulative |
| SR2 | IMPERSONATED_REMOTE_ACCESS_OR_INSTALL | Remote/install + claim + (threat, urgency, untrusted placement or personal channel) | manipulative with threat, or remote with urgency or user content; else suspicious |
| SR3 | SUPPORT_REDIRECT_UNDER_THREAT | Contact + claim + threat + (personal channel or urgency) | manipulative with personal channel and urgency; else suspicious |
| SR4 | CLAIMED_SUPPORT_IN_USER_CONTENT | Contact from user content whose official claim is itself in user content | manipulative with threat or urgency; else suspicious |
| SR5 | OBSERVED_SUPPORT_DIRECTION | Any other direction (help centers, contact pages, IT procedures) | observed (informational) |

Rationale: support contacts, remote-support tools, account notices and claims of being "customer service" all exist on legitimate sites, so none of them alerts alone. **Observable indicators** are reported separately from **claims**: `page-rendered-system-alert` (browsers and operating systems do not alert inside web pages), `alert-in-overlay`, `remote-access-request`, `software-install-request`, `personal-channel-contact` (an official-sounding claim routed to a mobile number or messenger) and `claim-in-user-content`. None of them is a statement that an organization is fake; the limitation `claimed-identity-unverifiable` says so in the UI.

Modifiers as in §12.5 (cap 2); no override. Confidence: high for manipulative/observed, medium for suspicious, minus one per modifier. Action risk is **high** for remote access and installs, **medium** for contact directions.

### 14.4 Development results (sup-dev, 27 synthetic scenarios; NOT held-out)
Corpus: 10 positive, 2 adversarial, 15 hard negatives; 14 EN, 13 ID including informal Indonesian (`corpus/sup-dev/README.md`). Same author as the rules; labels written before the first run.

| Version | Change (dev evidence) | TP | FP | TN | FN |
|---|---|---|---|---|---|
| v0 (first run, 26 scenarios) | Initial rules | 11 | 1 | 14 | 0 |
| **v1 (`sup-0.1.0-exp`)** | Negation distributes over "or/atau"; attributed alerts ("a pop-up that says …") are unasserted (fixes FP SN08, an awareness list). SA02 added afterwards. Rules evaluated together, strongest wins (found by an E2E markup test; no dev result changed) | **11** | **0** | **15** | **1** |

Miss: **SA02**, a tech-support alarm worded outside the lexicon ("Windows has detected a Zeus trojan"). Precision 11/11 (CI 74.1–100), recall 11/12 (CI 64.6–98.5), hard-negative FPR 0/15 (CI 0–20.4), localization 11/11, exact class 25/27, 0 requests, 0 phone numbers or digit runs in results. ClickFix verdict `none`, credential and payment none/observed on all 27 pages. **Optimistic by construction; not real-world effectiveness.**
