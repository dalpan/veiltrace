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
| Researcher / hackathon judge | "Show me that detection is explainable, measured and not just domain blocklisting." |

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

## 8. Demo narrative (hackathon, target 3 minutes)
1. Open a locally hosted, legitimate-looking (fictional) organization blog. Click VEILTRACE: no high-risk instructions found.
2. Scroll to a comment that contains a fake "verifikasi" ClickFix instruction. Click VEILTRACE: **Manipulative instruction**, evidence snippets, and (once M3 implements it) **Show on page** highlights the comment.
3. Open the security tutorial that quotes the same command in a code block: no manipulative finding, and Details shows "demoted: code example in an article".
4. Show the evaluation table: test split, B0 vs VEILTRACE, raw counts.
5. Show the manifest: two permissions, and the network panel is empty.
