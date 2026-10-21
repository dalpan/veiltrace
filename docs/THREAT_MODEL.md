# Threat Model

Status: M0, updated at M1 (modifier-evasion rows), M2 (measured outcomes, extractor limits), M4.2 (§7 organizational deployment) and M4.4 (§5 measured status, §8 demo) · Owner: research lead

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

Updated at M4.4 from **existing measured results only**: unit tests, browser/E2E tests, the dev split with engine 0.2.0 (`eval/results/dev.json`) and the recorded held-out evaluation v1 (`eval/results/test.json`, EVALUATION_RESULTS.md). Nothing was re-run on the held-out split. Status labels:
- **Detected:** a fixture with this evasion produced a positive verdict.
- **Not detected:** a fixture with this evasion produced a false negative.
- **Partial:** coverage is incomplete and reported to the user, or detection is weakened but still positive.
- **Mitigated:** a design control exists and is tested, but it is not a detection outcome.
- **Untested:** no fixture measures it.

| Evasion | Status | Measured evidence | Notes |
|---|---|---|---|
| Text split across many elements / interleaved hidden spans | **Detected** | Held-out T08 (obfuscated split spans) TP; browser test "joins inline fragments" | Rendered-text extraction per block, hidden nodes skipped |
| Homoglyphs, zero-width characters, full-width letters | **Detected** | Unit S-P7-en and `normalize.test.ts`; held-out T08 TP | NFKC, zero-width stripping, Latin/Cyrillic confusables fold. Other scripts are not folded |
| Lure inside an **open** shadow-DOM widget | **Detected** | Dev D07 TP; E2E open-shadow widget detected and highlighted | |
| Lure inside a **closed** shadow root | **Detected** (extension) / **Partial** (extractor alone) | E2E: a lure in a closed shadow root is read through `chrome.dom.openOrClosedShadowRoot` in the isolated world and classified manipulative, with a complete scan; browser tests: without the adapter the host is counted in `closedShadowRootsSkipped`, and `closed-shadow-skipped` is reported as a partial reason | |
| Lure in a **same-origin** iframe | **Detected** | Dev D08 TP; E2E detected and highlighted | |
| Lure in a **cross-origin** iframe | **Not detected; reported as Partial** | Held-out T12 FN with `frames-skipped`; E2E and manual `cross-origin.html` show the partial-scan warning and claim no finding | Needs per-frame access, a product and permission decision |
| Content appears after the scan (timers, after-click reveals) | **Partial** | E2E: a modal revealed by user interaction is found on **rescan**; dev D02 (after-click modal, scripted step) TP | On-demand only (D-004); nothing re-scans automatically |
| **Modifier misuse: reported speech** ("visitors were asked to:") | **Not detected** | Dev D10, D50 FN; held-out T10 FN | P2 redesign variants were rejected for false positives (D-043) |
| **Modifier misuse: quotation markup** (`<blockquote>`) | **Not detected** | Dev D12, D43 FN; held-out T09 FN | Detected only when a concealed clipboard payload is also present (dev D46 TP, P2-A) |
| **Modifier misuse: planted educational cue** | **Partial** | Dev D11 manipulative → suspicious (still positive); dev D45 with a concealed payload stays manipulative (P2-A override) | |
| Very informal or paraphrased Indonesian | **Not detected** | Dev D44 FN | Lexicon coverage |
| Novel wording or an unsupported language | **Untested** | No fixture | Not implemented: there is no "language not supported" notice. A page in another language simply yields no findings, and the popup's limits text does not name the supported languages |
| Negation decoy ("do not refresh and press Win+R") | **Mitigated** | Unit S-A3-en, S-A5-en, S-A5-id | Conjunctions and punctuation end the negation scope |
| Adversary detects the scan or the highlight | **Mitigated** | E2E: the scan is read-only (no DOM writes, clicks or handlers); the highlight is drawn only on explicit click, after the snapshot | |
| Instruction rendered as an image, canvas or SVG path text | **Untested** (out of scope) | No fixture | `alt`/`aria-label` are extracted; OCR is future research |
| CSS `::before`/`::after` `content:` text | **Untested** | No fixture | Known gap (ARCHITECTURE.md §3.9) |
| Visually hidden but rendered text (same colour as background, covered) | **Untested** | No fixture | Counted as visible; could plant pretext text |
| Clipboard payload only inside JavaScript (`navigator.clipboard.writeText`) | **Untested** | No fixture | Scripts are not read by design; the visible instruction is still analyzed |
| Instruction split across pages or steps | **Untested** | No fixture | Single-page scan |
| Noise flooding (benign text crafted to trip findings) | **Mitigated** (design) | `observed_instruction` never alerts | Not measured |

False positives are tracked separately (EVALUATION_PLAN.md §12): held-out T17 (internal IT notice, R4) and T18 (news report, R3); dev D39 (docs quick-start dialog, R4).

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


## 8. Demo site threat model and trust boundaries (M4.4)

The hackathon demo (`demo/nusaverta`, docs/PRESENTER_GUIDE.md) models threat class **T7: injected instructions on a legitimate page**.

| Zone | On the demo page | Trust |
|---|---|---|
| First-party content | Header, navigation, help article, related links, footer of the fictional "Nusaverta" help center | Written by the site operator |
| Third-party content | The "Community answers" widget (`#community-widget`), labelled "posted by other customers · not reviewed by Nusaverta" | Written by anyone with a forum account. The lure post impersonates a support account (`nusaverta-support-desk`) |
| The user's machine | Run dialog, clipboard, shell | The asset the lure targets |
| VeilTrace | Reads the rendered page on click; reports evidence; never changes the page except for a temporary highlight box | Runs locally; no network |

What the demo shows: the host is a plausible legitimate application, so domain reputation would not help; the lure lives only in the third-party zone; VeilTrace's evidence and highlight point into that zone; the verdict does not change when the hostname changes (§5 of PRESENTER_GUIDE.md).

Demo safety controls:
- Fictional company, fictional `.test`/`.example` hosts, no real brand, logo or person.
- No JavaScript on the demo pages. Nothing is copied to the clipboard, downloaded or executed. The hidden command text points to a `.invalid` host.
- No external resources: one local stylesheet, inline SVG logo, system fonts.
- No demo-specific code: a test asserts that no file under `src/` mentions the demo. The lure uses canonical public lure phrasing, which the frozen engine is known to detect; the demo shows behavior, not accuracy.
