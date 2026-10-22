# realworld: field sample of real scam and benign messages (D-082)

Real messages (WhatsApp, SMS, web comments and pages, email, social media) **collected and labelled by people other than the rule author**, to measure VeilTrace on text it was not written for. Results are reported as **"field sample, n = X, collected between DATES"** and are never merged with synthetic numbers (EVALUATION_PLAN.md §7).

## Rules
- **Only redacted text enters the repository.** Raw screenshots and exports stay with the collector and are deleted after redaction. `npm run realworld -- redact` masks numbers, accounts, links, emails and handles; names and short codes must be checked by hand (the tool warns). CI rejects records that still contain a phone number, a long number, an email address or a link.
- **Records the rule author has read stay dev (D-091).** Add them with `--seen "<reason>"`; the split is then always dev and validation enforces it.
- **Split before anyone looks.** Each record's dev/test half is fixed by a hash of its id when it is added. The **dev** half may be used to extend the rules and lexicons. The **test** half is never used for tuning and is locked (`LOCK.json`, hash per record) before it is evaluated. The test half is evaluated only with `--final`, at the owner's request.
- **Two annotators.** Each record gets independent labels from annotators A and B (`truth`, `category`, `expected`). `npm run realworld -- agree` reports Cohen's kappa and the disagreements; a third person adjudicates them (`final`). Only agreed or adjudicated records are evaluated.
- **No live malicious content.** Links are replaced; nobody opens scam links or installs attached files to collect a sample.
- Consent: private messages are submitted by the person who received them, who confirms that they may be shared in redacted form.

## Workflow
```bash
npm run realworld -- redact < raw.txt                      # preview the redacted text and warnings
npm run realworld -- add --source wa --context chat --lang id --collector RA --origin "private: volunteer submission" < raw.txt
npm run realworld -- label RW-0001 --annotator A --truth malicious --category cred --expected manipulative
npm run realworld -- agree --a A --b B                     # kappa + disagreements
npm run realworld -- eval --split dev                      # development results (may guide rule changes)
npm run realworld -- lock                                  # freeze the test half (once)
npm run realworld -- eval --split test --final             # owner request only, once per lock
```

## From screenshots, without the rule author seeing them (D-096)
```bash
npm run realworld -- import kasus-baru/ --collector RA --source wa   # OCR on this Mac (macOS Vision), clean, redact, add; never prints text
npm run realworld -- show RW-0016                                    # the collector reviews each record; fix names/codes/OCR noise in its JSON
npm run realworld -- sheet --annotator B                            # dist/label-sheet-B.html: offline page; the annotator saves labels-B.json
npm run realworld -- label-import labels-B.json
```
The screenshot folder must stay out of git (add it to `.gitignore`). Only the collector runs `show`; the rule author never opens new records, so the deterministic split keeps about half of them as a genuinely unseen test half.

## Record format (`records/RW-NNNN.json`)
`id`, `schema: 1`, `lang` (id|en), `source` (wa|sms|web-comment|web-page|email|social|other), `context` (chat|comment|page|dialog: how the text appears), `text` (redacted), `collected`, `collector` (initials or pseudonym), `origin` (`public: …` with a defanged reference, or `private: volunteer submission`), `split` (fixed), `labels[]`, optional `final`.

Categories: `cmd` (run a command), `cred` (password/OTP/recovery phrase), `pay` (payment manipulation), `sup` (fake support or authority), `none` (benign). `expected`: what a correct detector should output (manipulative|suspicious|observed|none).

## How records are evaluated
Each record is turned into the content a detector would see: one text block per line, inside a container that matches its context (a chat message or comment is treated as content written by someone else). This approximates a page; it does not reproduce layout, frames or forms. A record counts as detected when any detector reports suspicious or manipulative; the per-category column checks whether the detector for its labelled category did.

Contributor guide (Indonesian): [PANDUAN_KONTRIBUTOR.md](PANDUAN_KONTRIBUTOR.md).
