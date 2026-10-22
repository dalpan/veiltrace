# Product Specification

Status: specification · Working name: VEILTRACE (UI brand "VeilTrace"). **As of M3:** the Chromium extension popup (§5) is implemented: scan on demand, verdict, findings with confidence, action risk and rule explanation, evidence snippets, Show on page, complete/partial status and limitations. **Not yet implemented:** "Copy report", Indonesian UI strings, the M4 demo site (§8).

> **VEILTRACE · Uncover the Manipulation Behind the Page.**
> An offline-first browser security engine for detecting contextual social engineering and deceptive instructions.

## 1. Problem

Modern social engineering on the web, ClickFix in particular, does not need a malicious download or an exploit. The page *tells the user* to open a system dialog, paste and run a command. It wraps that request in a believable pretext such as a CAPTCHA, an error fix or an account verification. URL reputation tools judge *where* the content is. They do not read *what the page is asking the user to do*. The same instruction can appear on an attacker domain, a compromised legitimate site, a comment section or a third-party widget.

## 2. Research hypothesis (not an established capability)

> A browser-native, offline, deterministic system can detect when page content asks the reader to perform a high-risk action under a manipulative pretext, independent of domain reputation, while staying quiet on benign pages that discuss, quote, or legitimately request similar actions.

Success is defined by the measured results in EVALUATION_PLAN.md, not by feature count.

## 3. Users and jobs

| User | Job |
|---|---|
| Non-specialist web user (primary) | "Before I do what this page says, tell me if it's asking me to do something dangerous, and why." |
| Security-aware user / IT helpdesk | "Show me exactly which element contains the instruction, so I can report or explain it." |
| Researcher / reviewer | "Show me that detection is explainable, measured and not just domain blocklisting." |

## 4. MVP scope (M1–M4)

**In:**
- Chromium MV3 extension. The user clicks the toolbar icon → the current page is analyzed locally → the popup shows the verdict.
- Threat classes T1 (ClickFix / fake CAPTCHA), T2 (fix-it lure with an execution chain), T3 (terminal command delivery), T7 (injected into a legitimate page), in **English and Indonesian**.
- Explainable findings: what was *observed* (snippets, source offsets), what is *inferred*, which context modifiers applied, and coverage limits.
- "Show on page" highlighting of the instruction region (browser adapter, M3).
- Reproducible evaluation corpus and harness with dev/test splits and baseline B0.

**Out (MVP):** auto-scan, page blocking, URL reputation, clipboard interception, AI, Firefox build, T5/T6 classes, settings UI, telemetry of any kind.

## 5. UX specification (popup)

1. **Header verdict.** It maps from the engine's classification (DETECTION_MODEL.md §1) and is one of:
   - 🔴 **Manipulative instruction** (`manipulative_instruction`): "This part of the page asks you to run a command on your computer as a fake verification step. Don't follow it."
   - 🟠 **Suspicious instruction** (`suspicious_correlation`): "This part of the page asks you to run a command and uses pressure or a 'fix' story. Be careful."
   - ⚪ **No manipulative instructions found in the inspected content.** This also covers `observed_instruction`, which is listed neutrally under Details as "Instructions to run commands were found (no signs of manipulation)". Never "Safe".
2. **Confidence** is shown separately from the classification ("confidence: medium, the text is inside a quotation"). **Action risk** describes what following the instruction would do ("runs code on your computer").
3. **Coverage line** (always): "Complete scan · 312 text blocks" or **"Partial scan:** 2 frames not inspected · page too large, first 5,000 blocks analyzed". The text is driven by `scanStatus()` (ARCHITECTURE.md §3.10). On a partial scan, "No manipulative instructions found" must be qualified with "in the inspected content".
4. **Finding card:** classification, confidence, action risk, a rule explanation in plain language, a list of observed evidence (quoted snippet + signal label + source, e.g. *"Win + R"* → *Open Run / terminal · Visible text*), applied modifiers ("Lowered from manipulative because of context: …") and **Show on page** (implemented in M3, with explicit outcomes). **Copy report** remains planned.
5. **Rescan** button (dynamic pages).
6. Observed instructions sit under a collapsed "Details for experts" section.

The product makes **no claim of real-time or proactive protection**. It analyzes a page only when the user asks (D-004).

Copy guidelines: name the requested action concretely, avoid fear language (we do not want to manipulate users either), and give one clear next step.

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Privacy | Zero network. No persistence of page data (PRIVACY_SECURITY.md) |
| Permissions | `activeTab`, `scripting` only |
| Performance | Popup result in ≤ 400 ms p95 on large pages (target, measured in M4) |
| Accessibility | Popup keyboard-navigable. Severity is not conveyed by color alone |
| Languages | Detection: EN, ID. UI: EN first, ID UI strings in M4 if time permits |
| Explainability | Every finding has ≥ 1 observed evidence snippet with exact source offsets and a region reference |
| Determinism | The same snapshot gives the same result |

## 7. Measurable differentiation (from COMPETITIVE_ANALYSIS.md §7)
D1 no domain bypass · D2 element-local correlation (FP vs B0) · D3 context modifiers (hard-negative pass rate) · D4 DOM-referenced evidence (localization accuracy) · D5 `activeTab` + `scripting` only, zero network · D6 Indonesian + English · D7 published held-out evaluation.

## 8. Demo narrative (target 3 minutes)
1. Open a locally hosted, legitimate-looking (fictional) organization blog. Click VEILTRACE: no high-risk instructions found.
2. Scroll to a comment that contains a fake "verifikasi" ClickFix instruction. Click VEILTRACE: **Manipulative instruction**, evidence snippets, and (once M3 implements it) **Show on page** highlights the comment.
3. Open the security tutorial that quotes the same command in a code block: no manipulative finding, and Details shows "demoted: code example in an article".
4. Show the evaluation table: test split, B0 vs VEILTRACE, raw counts.
5. Show the manifest: two permissions, and the network panel is empty.

## 9. Potential High-Assurance Deployment

Context: organizations with closed or high-assurance networks may evaluate VEILTRACE. **This is a potential opportunity, not an adoption, endorsement, certification or requirement.** VEILTRACE is not military-grade, certified, approved or endorsed by anyone (D-048).

Positioning: a defensive, privacy-preserving, human-centric browser security tool that explains manipulative instructions to the person reading them. It is **not** a monitoring product.

| Category | Content |
|---|---|
| **Implemented (M1–M4.4)** | On-device detection with no network code; Chromium MV3 extension with `activeTab` + `scripting` only; on-demand scanning; explainable evidence; complete/partial scan reporting; deterministic engine; offline evaluation harness; Indonesian + English detection lexicons; contextual rule set `m4.1` as the default engine 0.2.0, with overrides explained in the popup (M4.3A); **Indonesian and English popup UI (M4.2)**; **CycloneDX SBOM, license review, dependency audit (M4.2)**; **reproducible release ZIP with release manifest, SHA-256 checksums and a verification script (M4.2)**; organizational threat model and Operator Guide (M4.2); offline demo site and release candidate v0.5.0 (M4.4) |
| **Experimental (M5.1; not independently evaluated)** | Credential-disclosure detector `cred-0.1.0-exp`: flags requests to send passwords, one-time codes, PINs, recovery codes, recovery phrases or tokens to someone, recovery phrases under a pretext, and secret requests under account threats or in third-party content; ordinary sign-in and MFA are listed as observed, not alerts. Shown in its own popup section labelled Experimental. Development results only (DETECTION_MODEL.md §12) |
| **Planned (M4.3+; not implemented)** | Signed CRX packaging and a self-hosted update channel; end-to-end managed-browser force-install test; reproducibility across OSes; strictly opt-in, user-reviewed, privacy-preserving incident reports (local export first); independent security review |
| **Research hypotheses (unproven)** | Contextual instruction analysis detects social-engineering lures independent of domain reputation; region-local correlation + context modifiers reduce false positives versus page-level matching; results on synthetic dev data transfer to real pages (unmeasured) |
| **Potential organizational applications (speculative)** | User-side awareness aid in organizations with strict browser policies; a training aid that explains why a page is manipulative; one layer alongside existing endpoint and network controls. Not a replacement for EDR, email filtering or URL reputation |

Explicit non-goals without a separate requirements process and review: centralized monitoring, employee surveillance, collection of browsing data, privileged endpoint access, and military-specific operational features.

## 10. Multi-threat roadmap (M5.x)

| Stage | Scope | Status |
|---|---|---|
| M5.1 | Credential-disclosure indicators (passwords, codes, PINs, recovery codes and phrases, tokens): separate experimental detector, structural form fields, dev corpus, popup section | Implemented, experimental, development data only |
| M5.2 | Independent held-out credential corpus, preregistration, frozen evaluation (EVALUATION_PLAN.md §13) | Not started |
| Later | Aggregation layer across detectors; other threat classes (payment manipulation, remote-access tools) | Not started; payment manipulation and general malware scanning are explicitly out of scope for M5.1 |

UX principle for every detector: show the **threat category**, the **requested action**, the observed **evidence** with "Show on page", the **context indicators**, separate **confidence** and **action risk**, and the **limits** (what was not examined, which claims cannot be verified). Benign authentication content (sign-in, MFA) is listed as observed, never as an alert.
