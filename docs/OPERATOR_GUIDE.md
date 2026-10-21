# VeilTrace Operator Guide (v0.4.0, engine 0.1.0-m1)

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
Production engine `0.1.0-m1`, 50 synthetic development scenarios: TP 16, FP 6, TN 23, FN 5. **These are not real-world rates.**
- **Typical false positives (shown as "Suspicious"):** legitimate troubleshooting docs ("To fix this error, open Terminal and run…") and internal IT notices ("IT Department: open PowerShell, paste the script…").
- **Typical false negatives:** lures that disguise themselves as quotations or reports ("Visitors were asked to:"), quoted lures in comments, very informal Indonesian.

An experimental rule set (`m4.1-rc1`) reduces these false positives on the same data (FP 6 → 1). It is not enabled in the extension.

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
