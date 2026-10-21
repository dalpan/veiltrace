# VeilTrace Operator Guide (v0.5.0, engine 0.2.0)

For IT/security staff evaluating or deploying the VeilTrace browser extension. VeilTrace is **one awareness layer**. It does **not** replace endpoint protection, secure browsing policies, email/URL filtering or security awareness training.

## 1. What it detects
On request (toolbar button → **Scan page**), VeilTrace reads the visible text of the current page on the device and looks for **instructions to run code** that are combined with **manipulation**. The main target is the "ClickFix" family: fake CAPTCHA, fake error and fake support pages telling the reader to press Win+R / open Terminal, paste and press Enter. It works the same on unknown and on reputable domains (for example a malicious comment on a legitimate forum), in English and Indonesian.

## 2. What it does not detect
- Malware, malicious downloads, phishing login pages without "run this" instructions, or malicious URLs (no reputation lookups).
- Instructions shown only in images, video, canvas, or inside frames from other sites.
- Clipboard payloads that exist only in page scripts.
- Instructions written in unusual words, very informal Indonesian (known gap), or other languages.
- Anything on a page the user did not scan, or content that appears after the scan.

## 3. Reading a result

| Classification | Meaning | Suggested user action |
|---|---|---|
| **Manipulative** | A complete "run this" instruction presented as a verification step | Do not follow it; report the page through your normal channel |
| **Suspicious** | A "run this" instruction plus pressure, claimed authority or a "fix this error" story, or an incomplete verification lure | Do not follow it unless the source is verified independently |
| **Observed** (listed under "Observed instructions…") | An instruction to run commands with no manipulation signs (e.g. developer docs) | Normal caution; follow only trusted sources |
| No findings | Nothing matched in the analyzed content | **Not** a guarantee of safety. VeilTrace never says "safe" |

- **Confidence** (high/medium/low) is how strongly the evidence supports the classification. Context such as quotes, news reports or tutorials lowers it.
- **Action risk** (high/medium) is what following the instruction would do: run code on the computer. A finding can be low-confidence with high action risk.
- **Complete vs partial:** "Partial scan" lists what was not examined (very large page, frames from other sites, hidden components, time limit). Findings only cover the analyzed part.
- **Show on page** draws a temporary amber box around the evidence. If the page changed, it says so instead of pretending.

## 4. Known false positives and negatives (development data, synthetic)
Production engine `0.2.0`, 50 synthetic development scenarios (the same data the rules were refined on, so optimistic): TP 16, FP 1, TN 28, FN 5. **These are not real-world rates**, and the held-out evaluation has not been run yet.
- **Remaining false positive (shown as "Suspicious"):** a documentation dialog that shows a terse run-this-command step.
- **Typical false negatives:** lures that plant educational or quoted context inside a short verification dialog, quoted lures in user comments, very informal Indonesian paraphrases.
- **Shown as "Observed", not "Suspicious":** procedural troubleshooting articles with a code block ("To fix this error, open Terminal and run…") and internal IT notices that only cite an authority. Action risk stays high, so the instruction is still listed.
- **Shown as "Manipulative" despite an educational cue:** pages that also place hidden text on the clipboard. The popup explains which context was set aside and why.

The previous engine (`0.1.0-m1`) had FP 6 on the same data, mainly troubleshooting docs and IT notices.

## 5. Offline installation and integrity verification
1. On a trusted build machine: `npm ci --ignore-scripts && npm run release && npm run release:verify`. Or obtain `release/` from a trusted source.
2. Compare `SHA256SUMS` with a copy obtained out of band (e.g. signed email or ticket): `cd release && shasum -a 256 -c SHA256SUMS`.
3. Unzip `veiltrace-chromium-<version>.zip` to a fixed folder → `chrome://extensions` (or `edge://extensions`) → Developer mode → **Load unpacked**.
4. Check the extension details page: permissions empty, no site access listed.

For fleets, use enterprise force-install with a signed CRX (DEPLOYMENT.md §3, §5; future work). Checksums verify integrity, not who built the artifact.

## 6. Troubleshooting

| Symptom | Cause / action |
|---|---|
| "This page cannot be scanned" | Browser-protected page (chrome://, Web Store, other extensions). Expected |
| "VeilTrace could not access this page" | The page navigated or closed, the site is blocked for extensions by policy (`runtime_blocked_hosts`), or it is a `file://` page without file access. Reload and scan again |
| "Partial scan" | Very large page or embedded frames from other sites. Findings cover only the analyzed part |
| "This element is no longer on the page" | The page changed after the scan. Scan again |
| Popup in the wrong language | It follows the browser UI language. Use the EN/ID buttons (not remembered between popups) |
| Nothing happens on a page | VeilTrace only runs after **Scan page**. There is no background scanning |

## 7. Safe use in organizations
- VeilTrace sends nothing anywhere, keeps no history and has no remote control. Do not add proxies, wrappers or modifications that collect user data. Monitoring employees is outside its purpose (D-048).
- Treat results as advice to the user, not as an enforcement or disciplinary signal.
- Keep users trained: the tool can miss lures and can flag legitimate instructions.
- Distribute only verified releases, and re-run the supply-chain report per release (docs/RELEASE.md).

## 8. Experimental: requests for passwords and codes (M5.1, development build)

In development builds after M5.1, the popup has a second section, **"Credential Disclosure Manipulation · Experimental"** (named "Passwords and codes" before M5.2), next to the command-execution result. It is produced by a separate detector (`cred-0.1.0-exp`) and has **not** passed an independent evaluation. Treat it as an explanation aid, not a verdict on the site.

- **Manipulative:** the page asks you to *send* a password, code, PIN or recovery phrase to someone (a comment, a chat agent, "tell the agent"), or asks for a wallet recovery phrase with a pretext. Advice: do not share it; legitimate services ask you to type codes into their own sign-in form, never to pass them on.
- **Suspicious:** a password or code is requested together with a threat to the account ("will be suspended", "akan diblokir"), or inside a comment, widget or embedded frame with a pretext.
- **Observed (collapsed):** ordinary sign-in, MFA, settings or wallet restore. Not an alert.
- Each finding shows what is asked (send or enter, which secret), the indicators found, where it sits (user content, widget, dialog, form), where the form submits as information only, and its limits. **A claim to be "support" or "official" is never verified.**
- **Privacy:** the check reads the page text and the structure of form fields (type and label), never what anyone typed, and nothing leaves the device.

Known errors on the 41-scenario development set (same author as the rules; optimistic): requests hidden in quotation markup are missed. Common informal Indonesian ("kasih liat angka yg masuk", "kirimin kode verif", "spill otp") is covered since `cred-0.1.1-exp`, but slang outside that list can still be missed. Requests that appear only in images, in frames from other sites, or after the scan are not seen. Do not use this section to clear a page: "no requests found" only covers the analyzed content.

## 9. Experimental: payment manipulation (M5.2, development build)

A third section, **"Payment Manipulation · Experimental"** (detector `pay-0.1.0-exp`), looks for requests to pay or transfer money combined with scam patterns. It has **not** passed an independent evaluation.

- **Manipulative:** pay first to receive a refund, prize, released funds or an unlocked account, with pressure; payment to a personal account, gift cards or crypto under a claimed authority or threat; payment under threat + claimed authority + urgency. Advice: do not pay; contact the organization through a channel you already know.
- **Suspicious:** a pay-to-receive request without other pressure, an off-platform transfer, or a payment with a threat and urgency.
- **Observed (collapsed):** checkouts, invoices, bills, donations and shops. Not an alert.
- Every finding card in all three sections shows its category, a severity (high / medium / informational, taken directly from the classification; not a score), the explanation, indicators, evidence with **Show on page**, and limits.
- **Privacy:** only page text is read, never form fields, card numbers or typed values. Amounts are matched but never shown or stored in the report.

Known errors on the 27-scenario development set (same author as the rules; optimistic): very informal Indonesian abbreviations ("tf dl 150rb") are missed. Requests in images, in frames from other sites, or worded unusually are not seen.

## 10. Experimental: fake support and authority impersonation (M5.3, development build)

A fourth section, **"Support & Authority Impersonation · Experimental"** (detector `sup-0.1.0-exp`), looks for directions to call or message "support", install software or allow remote access, combined with impersonation signs. It has **not** passed an independent evaluation.

- **Manipulative:** a virus or lock alarm drawn by the web page with a number to call or an app to install; a claimed bank, support or administrator asking for remote access or an install under threat; a claimed official with a threat, urgency and a mobile number or messaging app.
- **Suspicious:** weaker combinations, such as an official claim inside a comment with an outside contact, or an install request from a claimed courier.
- **Observed (collapsed):** help centers, contact pages and documented IT procedures. Not an alert.
- Cards list **claims** ("Claims to be (not verified)") separately from **observed indicators** (facts about the page). VeilTrace never states that an organization is fake.
- **Privacy:** only page text is read; phone numbers are never shown or stored in the report.

Known errors on the 27-scenario development set (same author as the rules; optimistic): alarms worded outside the lexicon ("Windows has detected a Zeus trojan") are missed. Numbers shown only in images are not seen.

## 11. The unified dashboard (M5.4, development build)

From M5.4 the popup shows all four checks in one view:
- **Page threat assessment:** the highest classification across the checks, the number of findings that need attention (suspicious or manipulative), the affected categories (CMD, CRED, PAY, SUP) and whether the scan was complete.
- **Detection categories:** one tile per check with its own result. Credential, payment and support checks are marked experimental.
- **What to do:** short advice for each affected category. With no findings, a reminder that this is not a guarantee.
- **Findings:** one list, most serious first (classification, then action risk, then confidence). Each card keeps classification, severity, confidence and action risk separate, and every evidence item has an id (E-nn) and **Show on page**. Findings from different checks that point at the same element are shown together as related findings; each keeps its own evidence and rule.
