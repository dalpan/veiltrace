# Threat Model

Status: M0, updated at M1 (modifier-evasion rows), M2 (measured outcomes, extractor limits) and M4.2 (§7 organizational deployment) · Owner: research lead

This document covers two threat surfaces:
1. **The user-facing threat:** social engineering instructions on web pages, which is what VEILTRACE detects.
2. **Threats to VEILTRACE itself:** evasion, abuse, and the privacy risk of the extension.

## 1. Protected asset and user

- **Primary asset:** the user's *decision to act* on the host machine or on an account. Typical actions are running a command, pasting clipboard content, disclosing a code or credential, installing remote-access software, or calling a number.
- **Secondary assets:** the privacy of the page content the user views, and the integrity of the user's browser.
- **User model:** a non-specialist who follows on-screen instructions. They are not assumed to read URLs or to recognize PowerShell.

## 2. In-scope attack classes

Each class is defined by **requested action × pretext**. Persuasion alone is never in scope as a detection target. See DETECTION_MODEL.md §2.

| ID | Class | Requested action | Typical pretext | MVP? |
|---|---|---|---|---|
| T1 | **ClickFix / fake CAPTCHA** | Open Run / Terminal / PowerShell → paste → execute | "Verify you are human", "Verifikasi Anda bukan robot" | **Yes** |
| T2 | **Fix-it lure** ("browser error", "update required", "font missing") | Same execution chain, or download-and-run | Fake error, fake update | **Yes** (when the execution chain is present) |
| T3 | **Terminal command delivery** | Copy a visible or hidden command into a shell | Install / fix / verify | **Yes** |
| T4 | Clipboard-staged payload | Paste content the user never saw | Any | Partial: static signals only (copy buttons, hidden copy targets). Runtime clipboard interception is M6+ |
| T5 | Fake tech support / authority impersonation | Call a phone number, install AnyDesk/TeamViewer, grant remote access | "Microsoft Support", "Tim Keamanan Bank" | M6 |
| T6 | Fake account verification / recovery | Disclose an OTP, password or seed phrase. Submit a form | "Akun Anda akan diblokir dalam 24 jam" | M6 (OTP disclosure only) |
| T7 | Injected instructions on a legitimate page | Any of T1–T6 | UGC comment, compromised CMS block, third-party widget, ad iframe | **Yes** (the detection is page-content-based and domain-independent by construction) |
| T8 | Multilingual variants (ID/EN first) | Any | Any | **Yes** for ID + EN |

### Real-world grounding
The Microsoft Threat Intelligence write-up (2025-08-21) documents ClickFix at the scale of thousands of devices per day, delivering infostealers on Windows and macOS. The canonical chain is **Win+R → Ctrl+V → Enter**, with a fake CAPTCHA pretext and a clipboard pre-loaded by the page. Variants observed in prior art and public reporting include Win+X → I (PowerShell/Terminal), the macOS Terminal (`Cmd+Space`, "Terminal"), the File Explorer address bar ("FileFix"), and DNS-based (`nslookup`) stagers.

## 3. Out of scope (explicit)

| Out of scope | Why |
|---|---|
| URL / domain reputation, blocklists, threat feeds | Not the research question. It requires network access. Mature tools already exist (Safe Browsing, SmartScreen). |
| Payload analysis (deobfuscating, sandboxing, executing commands) | VEILTRACE judges the *instruction*, not the malware. Command syntax is only a signal. |
| Credential phishing pages without behavioral instructions (pure login clones) | Visual brand impersonation is a different problem. It may become a supplementary signal later. |
| Email, SMS, chat apps, native apps, PDFs outside the browser | Not observable from a page content script. |
| Instructions delivered **only** in images, canvas, video or audio | Requires OCR or ASR. Documented as an evasion gap (§5). |
| OS-level prevention (blocking Win+R, intercepting shells) | Outside browser capability. It is the endpoint's job. |
| Guaranteeing safety / blocking pages | VEILTRACE *informs*. In the MVP it does not block navigation. |
| Attacks on users who have disabled or never invoked the extension | The MVP is on-demand (DECISIONS.md D-004). |

## 4. Adversary model

- **Capabilities:** full control of the HTML, CSS and JS of the page (or of a component on it, such as a comment, widget or iframe). It can serve different content per user agent, geolocation or timing. It can read DOM changes the extension makes. It cannot read extension isolated-world variables, the popup DOM, or `chrome.storage`.
- **Knowledge:** a sophisticated adversary has read our rules, because the project is open source. **The design assumes this.** Robustness comes from requiring the *semantic* chain (an action the user must perform) rather than secret keywords. The adversary cannot remove the instruction the victim must read without breaking their own attack.
- **Goal:** make the victim perform the action while (a) not triggering VEILTRACE, or (b) making VEILTRACE look noisy so users ignore it.

## 5. Evasion analysis (known limitations of browser observation)

| Evasion | Effect on VEILTRACE | Mitigation / status |
|---|---|---|
| Instruction rendered as an image, canvas or SVG path text | Text not extracted, so missed | Out of scope for the MVP. `alt`/`aria-label` are extracted. An optional local OCR is a future research item. |
| Text split across many elements / interleaved hidden spans | Breaks naive regexes | Use rendered `innerText`-like extraction per block that skips hidden nodes (EXTRACTION §3 in ARCHITECTURE.md), then normalize whitespace |
| Homoglyphs, zero-width characters, full-width letters | Breaks keyword matching | NFKC normalization, zero-width stripping, and a small confusables fold for Latin and Cyrillic lookalikes (DETECTION_MODEL.md §4) |
| CSS `::before`/`::after` `content:` text | Not in the DOM text | Known gap (ARCHITECTURE.md §3.9); not yet measured with a fixture |
| Closed shadow roots | Not traversable via `shadowRoot` | M2: an adapter hook exists and works with a simulated adapter in tests. Without it, closed hosts are counted heuristically in coverage. The real `chrome.dom.openOrClosedShadowRoot` from an isolated world is to be verified in M3 |
| Cross-origin iframes | Inaccessible from the page's frame | M2: same-origin frames extracted; cross-origin frames counted in `coverage.framesSkipped` (tested). The held-out split contains one such lure (T12) to keep recall honest |
| Content appears after the scan (timers, after-click reveals) | On-demand scan misses it | The popup offers "Rescan". An auto mode with debounced MutationObserver is M6 |
| Instruction lives on a second page or step | Single-page scan misses the chain | Each step usually still contains *open → paste → run*. Documented |
| Paraphrase / novel wording / an unsupported language | Lexicon miss | Coverage is measured per language. Unsupported languages are reported as "language not supported" rather than "safe" |
| Adversary DOM-detects the scan (e.g. our highlight outline) | Could swap content after the scan | Highlighting happens only on explicit user click. The snapshot is taken before any DOM change |
| **Modifier misuse: reported speech** ("the attackers instructed visitors to:" before a real lure) | The lure is demoted to `observed_instruction` (still listed, but not a detection) | **Measured (M2 dev):** D10 → FN. The P2 form evaluated in M2 recovers it on dev but was rejected (D-032). A redesign that requires direct-instruction evidence is pending |
| **Modifier misuse: planted educational cues** ("how to spot scams" heading on a lure page) | One-tier demotion: manipulative → suspicious | **Measured (M2 dev):** D11 manipulative → suspicious (still detected). The rejected P2 form restored it; redesign pending (D-032) |
| **Modifier misuse: quotation markup** (lure wrapped in `<blockquote>`) | Two-tier demotion | **Measured (M2 dev):** D12 → FN. Redesign pending (D-032) |
| **Negation decoy** ("do not refresh and press Win+R") | Would suppress the action | Mitigated: conjunctions and punctuation end the negation scope (tests S-A3, S-A5) |
| Visually hidden but rendered text (same color as background, covered by another element) | Counted as visible: a page could plant invisible pretext text near an instruction | Known gap (ARCHITECTURE.md §3.9) |
| Clipboard payload only inside JavaScript (`navigator.clipboard.writeText("…")`) | Payload not observed; the visible instruction is still analyzed | By design: scripts are not read. Runtime clipboard observation is M6+ |
| Noise flooding (benign text crafted to trip findings) | Warning fatigue | `observed_instruction` never alerts. Only region-correlated suspicious/manipulative findings surface prominently |

**Honest bottom line:** a browser-content detector is a *speed bump plus explanation layer*, not a guarantee. The measurable claim is narrower. On a defined corpus, it detects the action + pretext chain with element-level evidence while staying quiet on hard benign counterexamples.

## 6. Threats to the extension itself

| Threat | Control |
|---|---|
| Malicious page injects markup into our UI (stored XSS via evidence snippets) | The popup renders snippets with `textContent` only. `innerHTML` with page data is banned by lint/grep in CI. Strict extension-page CSP |
| Page posts forged messages to the extension | The MVP has no persistent content script and no `runtime.onMessage` listener that accepts page-originated data. The injected extractor returns its result once via the `executeScript` return value |
| Oversized DOM causes the extractor to hang (DoS against the user's browser) | Hard caps on node count, block count, characters per block and a total time budget. Truncation is reported in the result |
| Privacy leak of page content | No network code. No persistence of page text. See PRIVACY_SECURITY.md |
| Supply chain (npm deps) | Minimal runtime dependencies (target: zero). Dev-deps pinned with a lockfile. No CDN loads |
| Over-permission abuse if the extension is compromised | `activeTab` + `scripting` only. No `<all_urls>`, `tabs`, `webRequest` or `clipboardRead` |
| Signing key / secrets in the repo | `.gitignore` covers `*.pem`, `*.crx` and `.env`. CI secret scan later (M3) |

## 7. Organizational deployment threats (M4.2)

Scope: VeilTrace deployed in organizations, possibly high-assurance (D-048). Evidence refers to tests or documents in this repository.

| # | Attack scenario | Mitigations (implemented) | Residual risk | Verification evidence |
|---|---|---|---|---|
| O1 | **Malicious website manipulates the extension**: forges messages, spoofs `VeiltraceContent`, injects HTML via evidence text, plants selectors, uses strict CSP to break highlighting | No messaging surface (D-035); isolated world; text-only rendering; strict report validation; locator grammar (D-040); CSSOM-styled overlay | The page can still *evade* detection (§5) or detect and remove the highlight overlay | `tests/e2e/security.test.ts` (spoofing, XSS, CSP), `tests/e2e/i18n.test.ts` (XSS in ID mode), `tests/extension.test.ts` (validation, locator grammar) |
| O2 | **Malicious or compromised extension update** | No auto-update channel exists yet; releases are reproducible and verifiable; the manifest records commit and dirty flag | No signing yet: an attacker who controls the distribution point can replace the ZIP **and** its checksums | `npm run release:verify`, `tests/release.test.ts`; signing is future work (DEPLOYMENT.md §5) |
| O3 | **Dependency compromise** (build-time npm package) | Zero runtime dependencies; lockfile integrity hashes; pinned dev deps; install scripts not required (`--ignore-scripts`); SBOM; `npm audit`; production bundle scanned for network/eval/messaging identifiers | A compromised build tool (esbuild, TypeScript) could alter the bundle at build time. Bundle checks are heuristic | `release/supply-chain/*`, `scripts/verify-release.mjs` bundle checks, reproducibility across clean builds (a single tampered build environment would diverge) |
| O4 | **Local modification of release artifacts** (in transit or on disk) | SHA256SUMS + per-file hashes in the release manifest + ZIP CRCs | Integrity only; checksums replaced together with the artifact go undetected without an out-of-band trusted copy | `tests/release.test.ts` (tamper detection: byte flip, repacked file, edited manifest, test-build swap) |
| O5 | **Insider misuse**: modifying the extension to collect browsing data or report users | Architecture has no network path (CSP `connect-src 'none'`); release verification rejects network identifiers and extra permissions; Apache-2.0 source is reviewable | An insider with signing authority could ship a modified build. That needs organizational controls: two-person review, reproducible build comparison, protected signing key | `verify-release` policy checks; reproducibility check; D-048 (no monitoring features) |
| O6 | **Browser API changes** (MV3 `scripting`, `activeTab`, `chrome.dom`, `--load-extension` removal) | Minimal API surface; E2E suite on Chromium; manual validation on stable Chrome (M3) and an automated Edge 155 smoke test (M4.2) | Future Chrome/Edge versions could break injection or closed-shadow access; branded Chrome can no longer be automated with unpacked extensions | `tests/e2e/*`; DEPLOYMENT.md §3 automation note |
| O7 | **Partial scans and unsupported content** exploited to hide lures (huge pages, cross-origin frames, images, closed components, late content) | Explicit partial-scan reasons in the UI (D-033); limitations text in both languages | A lure placed beyond 5,000 blocks, in an image or in a cross-origin frame is missed; the user still sees "Partial scan" for budgets and frames, but **not** for images | `tests/e2e/extension.test.ts` (partial, frames), ARCHITECTURE.md §3.9–3.10 |
| O8 | **Extension failure or user misunderstanding** ("no findings" read as "safe"; Observed read as "malicious"; confidence vs risk) | Never says "safe"; explicit "not a guarantee"; distinct labels and help text in EN/ID; Operator Guide §3 | Users may still over-trust a clean result; synthetic accuracy does not transfer automatically | `tests/i18n.test.ts` (no "safe"/"aman"), `tests/e2e/i18n.test.ts`, docs/OPERATOR_GUIDE.md |
| O9 | **Release built from a dirty or unreviewed tree** | The manifest records `dirty: true`; the release process requires clean commits | Operators must check `source.dirty` before distribution | `release-manifest.json` |

