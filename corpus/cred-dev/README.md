# cred-dev: development corpus for the credential-disclosure detector (M5.1)

**Development data, not a held-out split.** It was written by the same AI assistant (Claude Code, for the VEILTRACE owner) who wrote the experimental rules, on 2026-10-21, and the rules were adjusted on it (DETECTION_MODEL.md §12.7). Results on it are optimistic by construction and must never be reported as held-out or real-world effectiveness.

## Composition
- 36 scenarios: 16 malicious (11 positive, 5 adversarial) and 20 benign hard negatives. 26 English, 10 Indonesian.
- One static page per scenario, served offline under a fictional `.test` host (`label.json` → `pages`). No JavaScript; chat widgets use declarative shadow DOM. Form actions point to `.invalid` or `.test` hosts; nothing is submitted during evaluation.
- No real organization, brand or person is named. "Contoso" and "Northwind" are conventional fictional names.

## Labels
- `truth`: intent as judged by a human reader (malicious = the page tries to obtain a secret by deception).
- `expectedClass`: what a correct detector should output under the M5.1 threat model: manipulative for secrets requested to be **sent** to someone or recovery phrases under a pretext; suspicious for secrets requested under an account threat or in untrusted content; observed for ordinary sign-in, MFA, settings and user-initiated restore; none when no secret is solicited.
- Labels were written before the detector was first run on the corpus. They were not changed afterwards.
- `evidenceWithin`: selector that must contain all evidence of a true positive.

## Categories
| Category | Ids | Purpose |
|---|---|---|
| Positive | CD01–CD11 | Community/UGC OTP requests, chat-widget code requests, wallet seed phishing, suspension overlays, fake IT/fraud departments (EN + ID) |
| Adversarial | CA01–CA05 | Planted educational heading with a live field, blockquote-wrapped request, informal Indonesian paraphrase, reported framing, text split across inline elements |
| Hard negative | CN01–CN20 | Login, MFA, Indonesian internet banking, recovery-code help, awareness articles, developer token docs, password-manager help, HTML tutorial, OTP pages with expiry, settings, protective support pages, wallet restore, paywall overlay, SSO to another origin, shop promo login, security alert, 2FA setup |

## Known contamination and bias
- Same author for rules and corpus; wording may track the lexicon.
- Indonesian text was written by a model, not a native speaker; slang coverage is thin (CA03 is a deliberate miss).
- Short, clean pages; 16:20 class balance does not reflect prevalence.
- A held-out credential split must be authored independently and frozen before any evaluation (EVALUATION_PLAN.md §13).
