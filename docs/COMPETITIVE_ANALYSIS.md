# Competitive Analysis

Status: M0 draft · Last verified: 2026-10-21

This document records what was **verified** about prior art and what is only
**hypothesis**. Verified claims cite a file and commit or a URL. A claim that a
competitor *lacks* something is only made where the source was inspected; it
otherwise appears as "not observed" with the scope of what was inspected.

No third-party code has been copied into VEILTRACE. See the license column
before anyone considers reuse.

## 1. Snapshot of references

| Project | Commit inspected | License | Type | Distribution |
|---|---|---|---|---|
| [Nehboro/nehboro](https://github.com/Nehboro/nehboro) | `f67efb7205` (2026-04-22) | **None** (no LICENSE file; GitHub reports `null`) | MV3 Chrome extension, plain JS | Chrome Web Store |
| [xorjosh/ClipShield](https://github.com/xorjosh/ClipShield) | `1b55b4ecbd` (2026-04-08) | **GPL-3.0** | MV3 Chrome/Edge extension, plain JS | Chrome Web Store, Edge Add-ons |
| [j0rd1s3rr4n0/ClickFixMitigator](https://github.com/j0rd1s3rr4n0/ClickFixMitigator) | `ae0e514493` (2026-07-28) | **MIT** | MV3 extension (Chromium / Firefox / Firefox-Android variants) + PHP backend + Windows agent | Chrome Web Store |
| [Malwarebytes Browser Guard](https://www.malwarebytes.com/browserguard) | Product page, 2026-10-21 | Proprietary | Closed-source extension | Chrome, Firefox, Edge, Safari |
| Opera Paste Protect | [Opera security blog, July 2026](https://blogs.opera.com/security/2026/07/how-opera-paste-protect-guards-against-clipboard-attacks/) | Proprietary, built into the browser | Native browser feature | Opera desktop |

## 2. Nehboro

### Confirmed capabilities (source: README.md, manifest.json, detections/, utils/helpers.js)
- Three engines per the README: static IOC blocking via `declarativeNetRequest` from community feeds, ~97 heuristic detection IDs in 78 modules, and an optional Claude API "second opinion" using the user's own API key.
- ClickFix detections include full and partial "open → paste → execute" sequences (`detections/clickfix-sequence.js`) and multilingual variants. The README lists the heuristic languages as EN, FR, ES, DE, IT and PT.
- Additive scoring: each detection has a base score, and the total maps to clean (0–44), warning (45–78), block (79–109) and block + auto-report (≥110). The thresholds are configurable.
- A MAIN-world `runtime-interceptor.js` runs at `document_start` in all frames and intercepts clipboard, print, fullscreen and history behavior.
- Community reporting goes to `ntfy.sh/nehboro-reports`. Per the README, a report includes the URL, the matched keywords and **all URLs extracted from the page**.

### Architecture (verified)
- Permissions: `<all_urls>`, `webRequest`, `tabs`, `scripting`, `declarativeNetRequest(WithHostAccess)`, `notifications`, `contextMenus`, `alarms`, `storage`, plus `https://ntfy.sh/*`.
- Detection context (`utils/helpers.js` → `buildContext`) is `document.body.innerText` plus `document.documentElement.innerHTML` for the **whole page**. `CLICKFIX_FULL_SEQUENCE` tests whether the open, paste and execute pattern sets each match **anywhere** in that text, with no proximity or element locality.
- `content/detector.js:19` returns early when `HELPERS.isOnSafeDomain()` is true. The README states that "1100+ trusted domains are whitelisted and never scanned". After 3 dismissals a site is auto-added to a user whitelist (`detector.js:282`).
- Evidence is a matched keyword string. The inspected detector does not return DOM element references.

### Strengths
- The broadest catalog of scam and ClickFix lure types among the references, with useful taxonomy ideas (FileFix, ConsentFix, DNS ClickFix, device-code phishing).
- Combo or "bonus" scoring recognizes that co-occurring signals matter more than single ones.
- CI runs `web-ext lint`.

### Limitations / open questions (evidence-backed)
- **Domain bypass:** content on the built-in safe-domain list is never analyzed. This directly conflicts with the VEILTRACE hypothesis that legitimate domains can host manipulative content, for example through user-generated content or a compromise.
- **Page-level co-occurrence:** a security tutorial that mentions "Win+R", "Ctrl+V" and "Enter" in different paragraphs satisfies the same predicate as a lure. Whether this yields false positives in practice is **untested by us**. It is a hypothesis we will measure with our own baseline (see EVALUATION_PLAN.md §5).
- No Indonesian patterns are listed in the README.
- The repository commits `dist-manual/key.pem`, which looks like an extension signing key. This is a supply-chain hygiene observation and is not evidence about detection quality.
- The README says "Reports are opt-in" but also says "Auto-reports only fire at score ≥ 110". Whether auto-reporting is enabled by default was **not verified**.

### License
No license means all rights are reserved. **Do not reuse any code or pattern lists.** Ideas and taxonomy names can inform our research; text and regexes cannot be copied.

## 3. ClipShield

### Confirmed capabilities (source: README.md, manifest.json, PRIVACY.md, content.js)
- Focused on clipboard-driven ClickFix: MAIN-world patching of `navigator.clipboard.writeText` and `write`, plus synthetic clipboard-event abuse paths (`page_inject.js`).
- The README claims 240 rule patterns (`DETECTION_RULES_MAP` in `background.js`) and 142 lure phrases (`shared_signals.js`).
- Command normalization for homoglyph, zero-width, caret and backtick obfuscation, and detection of multi-stage download → decode → execute chains (README).
- MutationObserver-driven DOM scanning, a user-editable domain allow-list, and a local alert history.
- Privacy policy: no telemetry and no backend. Data stays in `chrome.storage`.

### Architecture (verified)
- Permissions: `clipboardRead`, `clipboardWrite`, `storage`, `offscreen`, `notifications`, `scripting`, `<all_urls>`. Content scripts run at `document_start` in all frames, both isolated and MAIN world.
- Text scanning uses `innerText`/`textContent` with scan windows (`content.js:346–347`), plus a separate inline-script scan (`content.js:464–478`).
- `extension_pages` CSP: `script-src 'self'; object-src 'self'`.

### Strengths
- The strongest *pre-write* clipboard interception of the group, which is the most direct technical control for the paste step of ClickFix.
- An explicit, short privacy policy that matches the manifest.

### Limitations / open questions
- A grep of `content.js` found no explicit handling of `<pre>`, `<code>` or `<blockquote>` context. This is **not proof** of absence, because handling could live in `background.js`, which was not fully read. Treat it as an open question.
- No Indonesian terms were found in `shared_signals.js` (grep-level check only).
- No test suite or evaluation corpus is present in the repository tree.

### License
GPL-3.0. Copying code would require VEILTRACE to be distributed under GPL-3.0-compatible terms. **Do not copy**, unless the project deliberately adopts GPL-3.0 (see DECISIONS.md D-010).

## 4. ClickFix Mitigator

### Confirmed capabilities (source: README.md, TESTING.md, browser-extension/*, Web/)
- A platform rather than an extension alone: browser extension, PHP SOC dashboard, investigation cockpit, enrichment integrations (VirusTotal, AbuseIPDB, URLScan), Windows clipboard agent and a bot analyzer.
- **Separate Chromium, Firefox and Firefox-Android extension builds** (`browser-extension/Firefox-Android/manifest.json` uses `background.scripts`, not a service worker).
- Clipboard mismatch detection, a command obfuscation score, allow/block lists, "allow once / allow session", and screenshot evidence.
- 14 UI locales (`ar ca de en es fr he hi ja ko nl pt ru zh`). Indonesian is not among them. Detection-pattern language coverage was not verified.

### Architecture (verified)
- Permissions: `<all_urls>`, `file:///*`, `tabs`, `clipboardRead`, `clipboardWrite`, `management`, `downloads`, `declarativeNetRequest`, `notifications`, `alarms`, `contextMenus`, `storage`.
- Remote origin `https://clickfix.jordiserrano.me` (`background.js:111`). In the alert path (`background.js:2965–3108`), a report containing `url`, `snippets`, `detectedContent` and `full_context` is passed to `enqueueReport` and later flushed to `clickfix-report.php` on an alarm (`background.js:3727`, `3948`). **No opt-in gate was observed on that path.** Settings default `sendCountry: true` and `privacyBaselineShareSummary: true` (`background.js:63–101`).
- `DEFAULT_SETTINGS.apiLicenseKey` contains a hard-coded license key string.
- The repository tree contains a committed Chrome profile (`botanalyzer/chrome-profile/…`) and PHP session files (`Web/ClickFix/Databases/*/sessions/…`).

### Strengths
- An end-to-end analyst workflow, evidence capture and a manual test checklist (TESTING.md).
- The only reference with a verified Firefox-Android build. It is a useful existence proof for cross-browser packaging.

### Limitations / open questions
- Cloud-coupled by design. That is a legitimate choice for SOC use, but it is the opposite of an offline-first, no-transmission posture.
- Testing is a manual checklist. No automated precision/recall evaluation was found.

### License
MIT, so reuse is permitted with copyright and license notice retained. We still **do not plan to reuse** code. A clean-room design keeps the architecture independent. If a snippet is ever reused, it must be recorded in DECISIONS.md and NOTICE.

## 5. Malwarebytes Browser Guard (closed source)

### Confirmed (product page, 2026-10-21)
- Blocks malicious sites and phishing, card skimmers, ads/trackers and cookie banners. The feature table lists "Clipboard (copy/paste) protection", "Heuristic protections", "Search hijacking protection", "Suspicious download protection" and "Advanced phishing protection".
- Free, for Chrome, Firefox, Edge and Safari.
- User reports on Mozilla Add-ons describe the clipboard feature replacing clipboard content with `[⚠️ Suspicious Content]`. The developer replied that a global toggle was in development ([review](https://addons.mozilla.org/fr/firefox/addon/malwarebytes/reviews/2363569/)). This is anecdotal.

### Not verifiable
- Whether detection is local or cloud-assisted, which signals the heuristics use, and how evidence is shown. The marketing page does not say, and the code is closed. **We make no claims about what it does or does not do beyond the above.**

## 6. Opera Paste Protect (native)
Built into Opera desktop and on by default since July 2026, per Opera's blog. It shows that browser vendors now treat the clipboard as an attack surface. **Implication:** VEILTRACE should not compete on clipboard interception. It should compete on *understanding the instruction on the page*, which a clipboard-only control does not observe.

## 7. Positioning: where VEILTRACE differs (measurable claims only)

| # | Differentiator | How it is measured | Prior-art status |
|---|---|---|---|
| D1 | **No domain trust bypass.** Every page is analyzable. Reputation is at most a supplementary signal, and none is used in the MVP. | Demo: a lure served from `localhost` / a reputable-looking test host is detected. | Nehboro verified to skip 1100+ domains. Others have user allow-lists (normal). |
| D2 | **Element-local correlation.** Action and manipulation signals must co-occur within one *instruction region* (DOM subtree / proximity window), not anywhere on the page. | FPR on the hard-negative corpus vs our own page-level baseline B0 (EVALUATION_PLAN.md §5). | Nehboro verified page-level. Others not verified. |
| D3 | **Context modifiers.** Quotation, code examples in articles, negation ("never paste…", "jangan pernah…"), reported speech ("victims were told to…") and educational framing demote findings (M1). Overlay presentation is planned for M4. | Per-scenario pass/fail on the 7 named hard negatives. | Not observed in inspected code (grep-level). |
| D4 | **Evidence with source references.** Every finding carries snippet(s) with exact source offsets, rule IDs, observed-vs-inferred labels, and a region reference plus element locator. UI highlighting is planned for M3 and does not exist yet. | Evidence-localization accuracy metric (EVALUATION_PLAN.md §4.3). | Nehboro returns keywords only. Others not verified. |
| D5 | **Least privilege.** Install-time permissions are `activeTab` + `scripting` only, with zero network code. | Manifest audit, build-artifact grep, Playwright network assertion. | All three OSS references request `<all_urls>`. |
| D6 | **Indonesian + English** lexicons as first-class, tested data. | Per-language recall/FPR in the evaluation. | Not listed by Nehboro. Not observed in ClipShield. Not in ClickFixMitigator UI locales. |
| D7 | **Published, reproducible evaluation** with a frozen held-out split. | The repository itself. | No automated evaluation found in any reference. |

**What we deliberately do *not* claim:** broader coverage (Nehboro is far broader), better clipboard protection (ClipShield and Opera are stronger there), SOC workflow (ClickFixMitigator), or real-world efficacy. Real-world effectiveness is unmeasured until EVALUATION_PLAN.md §7 is executed.

## 8. Literature and threat-intel references
- Microsoft Threat Intelligence, ["Think before you Click(Fix)"](https://www.microsoft.com/en-us/security/blog/2025/08/21/think-before-you-clickfix-analyzing-the-clickfix-social-engineering-technique/), 2025-08-21. Describes campaigns hitting thousands of devices daily, payloads such as Lumma Stealer, and Windows and macOS targets. The "47% of initial access" figure seen in secondary sources was **not verified** against a primary source and must not be quoted.
- Mathur et al., ["Dark Patterns at Scale"](https://arxiv.org/abs/1907.07032), CSCW 2019. Taxonomy of deceptive UI, including countdown timers, some of which reset on reload. This motivates *not* treating countdowns as malicious on their own.
- Tsinganos et al., "CSE-PUC", IEEE Access 2022. A CNN classifier for Cialdini persuasion principles in chat-based social engineering.
- Zielinska et al. (2016). 887 phishing emails coded for Cialdini principles, with conflicting prior findings on which principles dominate.
- [Lumen](https://arxiv.org/abs/2107.10655) (arXiv 2107.10655). An ML framework for influence cues in text, which reports authority as the most frequent cue in a labeled phishing set.

These papers inform the *manipulation-signal taxonomy*. None of them evaluates the specific question of **instruction + manipulation correlation in rendered web pages**, which is the research gap VEILTRACE targets. That gap claim rests on a limited literature search and should be re-checked before any publication.
