# Research Notes

Status: M0. This file holds the research framing, the evidence base and open research questions. Competitor specifics are in COMPETITIVE_ANALYSIS.md.

## 1. Research question

> Can a browser-native system detect attempts to manipulate a user's behavior based on page content, context, and requested actions, even when the domain itself is not known to be malicious?

Operationalized for the MVP as: given a rendered page, identify **instruction regions** that (a) address the reader, (b) request a high-risk action from a defined set, and (c) co-occur with a manipulation pretext. Discount regions that are quoted, negated, educational or third-person. The question is answered by the evaluation (EVALUATION_PLAN.md), within a stated corpus.

## 2. Conceptual model

Social engineering instructions decompose into three observable layers:

| Layer | Question | Why it matters |
|---|---|---|
| **Action** | What must the reader physically do? | The only layer an attacker cannot remove: the victim must be told what to do. Most robust signal |
| **Pretext** | Why should they do it? | Distinguishes a lure from legitimate docs ("run npm install"). Persuasion literature maps here |
| **Framing / context** | Is the text addressed to the reader, or quoted, negated, or explained? | Distinguishes a lure from journalism and education about the lure |

**Key insight:** persuasion cues (urgency, authority, scarcity) are common in benign content: checkout timers, genuine security alerts, marketing. Prior work on dark patterns (Mathur et al., CSCW 2019) shows that urgency patterns are widespread on ordinary shopping sites. A detector keyed on persuasion alone will drown users in false positives. The **action** layer gives specificity, and the **context** layer controls false positives.

## 3. Evidence base

| Source | What we take from it | Verification level |
|---|---|---|
| Microsoft Threat Intelligence, "Think before you Click(Fix)" (2025-08-21) | ClickFix prevalence (thousands of devices/day), Win+R → Ctrl+V → Enter chain, Windows + macOS targets, infostealer payloads | Primary source; opening section read |
| Secondary reporting citing "47% of initial access" (MS Digital Defense Report 2025) | — | **Not verified. Do not cite** |
| Mathur et al., "Dark Patterns at Scale" (arXiv 1907.07032) | Countdown/scarcity patterns are common, and some are deceptive (resetting timers). Justifies S-N3 as a hard negative | Abstract + secondary summaries |
| Tsinganos et al., CSE-PUC (IEEE Access 2022) | Cialdini principles are detectable at sentence level in chat SE. Informs pretext taxonomy | Abstract |
| Zielinska et al. (2016), 887 phishing emails | Principle prevalence varies across studies, so do not hard-code assumptions about which principle dominates | Abstract |
| Lumen (arXiv 2107.10655) | Authority is frequent in phishing. Informs `P.AUTHORITY` | Abstract |
| Chrome docs: activeTab, content scripts, `chrome.dom` | Permission model, isolated worlds, closed shadow root access | Primary docs |
| Extension Workshop: Firefox for Android | No background service workers. MV2 recommended for Android. Host-permission UX gaps | Primary docs |
| Opera Paste Protect (July 2026) | Browsers now ship clipboard defenses natively, so VEILTRACE should focus on instruction understanding | Vendor blog |

## 4. Open research questions

1. **Region granularity:** what is the best region boundary (DOM container vs fixed block window) for locality? To be tuned on the dev split only.
2. **Legitimate execution requests:** how to treat docs that ask users to run commands (S-N5, S-N8). Is "no pretext → medium" acceptable to users? A small user study is out of scope; measure frequency only.
3. **Indonesian informal register:** how much recall do colloquial variants (pencet, copas, klik kanan) and code-mixing (ID/EN) add? Measure per-language.
4. **Third-person detection:** can a small phrase lexicon reliably detect reporting framing in news, or does it need syntactic cues?
5. **Adversarial robustness:** how much do split-text, homoglyph and pseudo-element evasions reduce recall? Measured with dedicated fixtures in M4.
6. **Rendered vs source text:** does geometry (overlay detection) add precision beyond text? Measure `C.OVERLAY` ablation.
7. **Generalization:** do rules designed on reconstructed lures transfer to field samples (EVALUATION_PLAN.md §7)?

## 5. Hypotheses we explicitly do **not** assume
- That keywords such as "verify", "urgent" or "PowerShell" indicate malice.
- That HTTPS or a reputable domain indicates safety.
- That high synthetic accuracy implies real-world effectiveness.
- That competitors lack a capability we have not inspected.
