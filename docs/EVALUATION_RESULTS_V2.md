# Held-out evaluation v2: results (D-085)

Run once on 2026-10-22 at the owner's request, as preregistered (`docs/EVAL_PREREGISTRATION_V2.md`): commit `29dda8e`, engine 0.3.0 (ruleset m5), `cred-0.2.0-exp`, `pay-0.3.0-exp`, `sup-0.3.0-exp`, extractor 0.3.0. Raw output: `eval/results/test-v2.json`; run log: `eval/runs-v2.md`. 60 synthetic scenarios written blind to the rules; **not real-world effectiveness**.

## Results (Wilson 95% intervals)

| Scope | TP | FP | TN | FN | Recall | Precision | Hard-negative FPR | Localization |
|---|---|---|---|---|---|---|---|---|
| **Overall** | 11 | 5 | 23 | 21 | **34.4%** (20.4–51.7) | **68.8%** | **17.9%** (7.9–35.6) | 9/11 |
| cmd | 3 | 1 | 6 | 5 | 37.5% | 75.0% | 14.3% | 3/3 |
| cred | 2 | 2 | 5 | 6 | 25.0% | 50.0% | 28.6% | 2/2 |
| pay | 5 | 2 | 5 | 3 | 62.5% | 71.4% | 28.6% | 3/5 |
| sup | 1 | 0 | 7 | 7 | 12.5% | 100% | 0% | 1/1 |
| Indonesian | 10 | 5 | 12 | 13 | 43.5% | 66.7% | 29.4% | 8/10 |
| English | 1 | 0 | 11 | 8 | 11.1% | 100% | 0% | 1/1 |

Targets (recall ≥ 85%, precision ≥ 90%, hard-negative FPR ≤ 10%, localization ≥ 95%) are **all missed**. Requests during scanning: 0 (met). ClickFix baseline `m4.1` (engine 0.2.0) scored identically on the cmd scenarios (TP 3, FP 1, TN 6, FN 5): the round-1 changes did not transfer.

## What this means
The same detectors scored 95–100% recall on the development corpora. The gap shows that the lexicon-and-rule design **overfits the author's own wording**: it recognizes the phrasings it was written for and misses paraphrases a different author produces. Dev numbers must not be quoted as accuracy.

## Failure analysis (after the run; v2 is no longer a held-out set)
1. **Action wording outside the lexicon (cmd):** "Press Windows + X and choose Terminal (Admin)", "right-click inside the window to paste", descriptive keys ("tombol berlogo jendela … sentuh huruf R"), macOS Terminal and font-fix stories, forum slang with `mshta`.
2. **Secrets and requests described indirectly (cred):** "angka 6 digit masuk sms … dikirim ke dm min", a "moderator" private message asking members to re-verify their password before a migration, a top-up seller asking for a game password, a mailbox-quota passphrase.
3. **Scam scripts without the expected payment verbs (pay):** an over-refund "return the difference" with gift cards, an unpaid-toll "final notice", a job-task deposit ("misi").
4. **Support scams outside the alarm/contact patterns (sup):** a lock screen whose wording differs, `.apk` attachments in chat (a courier "photo of your parcel", a wedding invitation), a "fund recovery task force" comment, an "IT compliance" remote session.
5. **False positives from protective or reported text:** "PDAM tidak pernah meminta transfer ke rekening pribadi petugas" (the negation "tidak pernah meminta" is not in the negation lexicon, so a warning reads as a request), news reports and public-service warnings that quote scam messages with quotation marks instead of quote markup.

## Next steps (recommended, not done)
- Do not tune on v2 and re-quote it. Further changes are measured on the real-world field sample (`corpus/realworld`) and on a new blind set (v3).
- Address classes, not cases: protective-statement negation ("X never asks you to …", "tidak pernah meminta"), quoted speech marked only by quotation marks, structural signals that do not depend on wording (`.apk` attachments in chats, copy-to-clipboard buttons next to run instructions, full-screen alarm layouts), and broader action vocabularies written from public scam reports rather than from the author's own fixtures.
- Consider an on-device learned component trained on a larger, independently written corpus, kept explainable by pairing it with the rules (a design decision for the owner; D-017 forbids a combined score).
