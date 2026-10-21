# pay-dev: development corpus for the payment-manipulation detector (M5.2)

**Development data, not a held-out split.** It was written by the same AI assistant (Claude Code, for the VEILTRACE owner) who wrote the experimental rules, on 2026-10-21. Results on it are optimistic by construction and must never be reported as held-out or real-world effectiveness.

## Composition
- 27 scenarios: 11 malicious (10 positive, 1 adversarial) and 16 benign hard negatives. 13 English, 14 Indonesian.
- One static page per scenario, served offline under a fictional `.test` or `.example` host (`label.json` → `pages`). No JavaScript; the chat widget uses declarative shadow DOM. No real organization, brand or person is named.

## Labels
- `truth`: intent as judged by a human reader (malicious = the page tries to obtain money by deception).
- `expectedClass`: manipulative for pay-to-receive (advance fee), off-channel payment under claimed authority or threat, and threat + authority + urgency; suspicious for off-platform transfers without other pressure; observed for checkouts, invoices, bills, donations, gift-card shops, and quoted or reported scam text; none when no payment is requested.
- Labels were written before the detector was first run on the corpus and were not changed afterwards. `PA01` was added after the first run, with its label written before it was scanned.
- `evidenceWithin`: selector that must contain all evidence of a true positive.

## Categories
| Category | Ids | Purpose |
|---|---|---|
| Positive | PD01–PD10 | Fake refund release fee in a chat widget, prize tax, account-unlock / verification fees, gift cards for a fake tax office, off-platform marketplace transfer, fake police fine, crypto recovery fee, customs-held parcel, fake CS refund in comments (EN + ID) |
| Adversarial | PA01 | Very informal Indonesian abbreviations ("tf dl 150rb ... buat bka akunnya"). Known miss |
| Hard negative | PN01–PN16 | Checkout with card form, virtual-account payment, invoice, utility bill, donations, news reports quoting scams, security-awareness pages, return policy, top-up cashback, gift-card shop, own-account bank transfer, marketplace safety tips, genuine prize notice |

Run: `npm run eval:pay` (writes `eval/results/pay-dev.{json,md}`). A card-number-like sentinel is typed into every visible field before each scan and must never appear in any output.
