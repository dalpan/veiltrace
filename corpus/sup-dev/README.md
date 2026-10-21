# sup-dev: development corpus for the fake-support and authority-impersonation detector (M5.3)

**Development data, not a held-out split.** It was written by the same AI assistant (Claude Code, for the VEILTRACE owner) who wrote the experimental rules, on 2026-10-21, and one rule change was made on it (DETECTION_MODEL.md §14.4). Results on it are optimistic by construction and must never be reported as held-out or real-world effectiveness.

## Composition
- 27 scenarios: 12 malicious (10 positive, 2 adversarial) and 15 benign hard negatives. 14 English, 13 Indonesian (including informal Indonesian: SD06, SD07, SD10, SA01).
- One static page per scenario, served offline under a fictional `.test` or `.example` host. No JavaScript; the chat widget uses declarative shadow DOM. No real organization or person is named; "Windows"/"Microsoft" appear only as the claimed identity inside lure text, as real scams use them. Phone numbers are reserved 555-01xx numbers or placeholder Indonesian sequences (0812-0000-…).

## Labels
- `truth`: intent as judged by a human reader (malicious = the page impersonates support or an authority to get the reader to contact, install or grant access).
- `expectedClass`: manipulative for page-rendered device alarms with a contact/install direction, remote-access or install requests from a claimed authority under threat, and claimed support + threat + urgency + personal channel; suspicious for weaker combinations (official claim in user content, install request from a claimed courier); observed for help-center, contact and IT-procedure pages, hypothetical antivirus advice, and quoted or reported scam text; none when no direction is given.
- Labels were written before the detector was first run and were not changed afterwards. `SA02` was added after the first run, with its label written before it was scanned.
- `evidenceWithin`: selector that must contain all evidence of a true positive.

## Categories
| Category | Ids | Purpose |
|---|---|---|
| Positive | SD01–SD10 | Fake virus overlays and lock pages with phone numbers, alarm + install, claimed bank fraud department asking for AnyDesk, fake CS on WhatsApp under threat, official claim in forum replies, informal "admin"/"kurir"/"tim IT" messages, IT-admin remote request in a chat widget (EN + ID) |
| Adversarial | SA01, SA02 | Extreme Indonesian abbreviations; alarm worded outside the lexicon ("Windows has detected a Zeus trojan"). SA02 is a known miss |
| Hard negative | SN01–SN15 | Help-center and call-center contact pages, documented IT remote-support procedure, genuine bank block notice, conditional antivirus advice, news reports quoting scams, awareness pages, browser-warning documentation, seller sharing WhatsApp, real moderator, sign-in alert, technician visit, app download page |

Run: `npm run eval:support` (writes `eval/results/sup-dev.{json,md}`). A phone-like sentinel is typed into every visible field before each scan and must never appear in any output, and no phone number or 5+ digit run may appear in any result.
