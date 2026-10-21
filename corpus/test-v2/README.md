# corpus/test-v2: independent held-out evaluation set

**Status: frozen from creation (2026-10-22). Do not edit, add or delete files here, and never use this set for tuning.**

## Purpose

`test-v2` is a second held-out evaluation set. Someone outside the detector authors wrote it so that it carries no influence from the rules, lexicons, thresholds or existing fixtures. Use it only for final, preregistered measurement. Do not use it for development, debugging, threshold selection, rule ideation or error analysis that feeds back into the detector. If anyone opens these pages to improve detection, the set is burned and must be replaced.

## Construction method

- Author: an independent AI agent (Claude) acting as test author, on 2026-10-22.
- **Blind to the rules.** The author did not open, read or search any of: `src/`, `corpus/dev/`, `corpus/cred-dev/`, `corpus/pay-dev/`, `corpus/sup-dev/`, `corpus/test/`, `corpus/realworld/`, `eval/`, `tests/`, `demo/`, `scripts/`, detection/threat-model/results/decisions/progress docs, or `submission/`. The author ran no project command and did not run the extension. The only input was a short description of the four threat categories as a user would understand them, plus the label schema.
- The author did not fetch any URL and did not reuse text from any VEILTRACE file. All pages were written from general knowledge of how real scams and real legitimate pages look.
- Each scenario is one self-contained HTML page with inline CSS and inline SVG logos. There are no external resources. A few pages have small inline scripts that reproduce realistic behaviour, such as a button that reveals a step, a defanged string written to the clipboard on click, or a `beforeunload` nag. No page uses network APIs, `eval` or remote code.
- All organisations, brands, people, apps and domains are fictional. Hosts use `.test` / `.example`. Payload hosts use `.invalid` or `192.0.2.0/24`, and phone numbers are `+1 555 01xx` or `0812-0000-xxxx` placeholders. Generic platform names (Windows, macOS, PowerShell, Terminal, WhatsApp, Telegram, APK) appear only as needed to describe the lure. Crypto addresses and encoded commands are defanged.
- Labels reflect how a careful human reader judges intent. They are not a prediction of what any tool outputs. `expectedClass` follows the schema semantics: `manipulative_instruction`, `suspicious_correlation`, `observed_instruction` or `none`.

## Layout

`V2-<cat>-<nn>-<lang>-<slug>/index.html` + `label.json` (schema shared with the other evaluation splits; `split: "test-v2"`).
A malicious scenario's `evidenceWithin` is an `#id` selector that exists in the page and contains the manipulative text. When a click is needed to reveal the lure, `steps` lists it.

## Composition (60 scenarios)

| Threat category | Malicious (id / en) | Benign hard negatives (id / en) | Total |
|---|---|---|---|
| cmd (command execution) | 8 (6 / 2) | 7 (4 / 3) | 15 |
| cred (credential disclosure) | 8 (5 / 3) | 7 (5 / 2) | 15 |
| pay (payment manipulation) | 8 (6 / 2) | 7 (4 / 3) | 15 |
| sup (fake support / authority) | 8 (6 / 2) | 7 (4 / 3) | 15 |
| **Total** | **32 (23 / 9)** | **28 (17 / 11)** | **60** |

- Language: 40 Indonesian (67%), 20 English.
- 11 scenarios use informal Indonesian (slang, abbreviations such as tf/japri/kak/min/sy/gw, typos): 9 malicious, 2 benign.
- Label category: 25 positive, 7 adversarial (paraphrased or split instructions, unusual synonyms, IT- or comment-embedded lures), 28 benign.
- Expected class: 30 `manipulative_instruction`, 2 `suspicious_correlation`, 17 `observed_instruction`, 11 `none`.
- 2 scenarios need a click step to reveal the lure.
- Benign pages are all hard negatives. They include real-looking checkouts, bills, donations, bank OTP and MFA pages, password reset, wallet backup, developer docs and IT KB commands, an official APK download page, help-center contacts, a bank security page, security-awareness articles and news that quote scam messages, and forum users warning one another.

## Known biases and limitations

- **Single AI author.** All 60 pages come from one language model. Wording, page structure and scam framing may share stylistic regularities that real attackers and real sites do not. A detector that does well here may still fail on human-written or real-world pages.
- **Synthetic pages.** The pages are simplified: short, few elements, no third-party scripts, ads, cookie banners, tracking, frameworks or dynamic loading. Real pages are much noisier and larger.
- **Lure placement.** Most malicious text is grouped in one container to make `evidenceWithin` unambiguous. Real attacks may spread it more widely or load it later.
- **Coverage.** There are 8 malicious and 7 benign scenarios per category, so per-category estimates have wide confidence intervals. Report them with intervals and do not over-interpret small differences.
- **Label subjectivity.** The boundary between `manipulative_instruction` and `suspicious_correlation`, and between `observed_instruction` and `none`, needs human judgment. The author's rationale is recorded in each `label.json`.
- **Indonesian slang** reflects the author's model of common online registers. It may not cover regional variation.

## Rules of use

1. Treat this directory as frozen. Record a hash manifest before the first evaluation, and verify it before every evaluation.
2. Do not open pages or labels to guide development. Do not tune any rule, lexicon, extractor heuristic or threshold on this set.
3. Run it only as preregistered, report the results once, and label them as results on a synthetic, AI-authored held-out set, not as real-world performance.
4. If the set is ever used for tuning or inspected for error analysis that feeds back into the detector, mark it as burned and commission a new independent set.
