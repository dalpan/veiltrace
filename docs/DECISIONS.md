# Decision Log

Format: ID · status · date · decision · rationale · consequences.
Statuses: **Accepted** (approved by the project owner or fixed by the brief) · **Proposed** (awaiting approval) · **Open** (needs input) · **Superseded**.

Never silently change an Accepted decision. Add a new entry that supersedes it.

---

### D-001 · Accepted · 2026-10-21 · Offline-first; no backend, database or cloud
Source: project brief §2/§5. The core detection engine runs locally without network. Consequence: no IOC feeds and no reputation lookups in the core.

### D-002 · Accepted · 2026-10-21 · Deterministic rules for the MVP; no LLM dependency
Source: project brief §5/§6. AI may come later only as opt-in (PRIVACY_SECURITY.md §3).

### D-003 · Accepted · 2026-10-21 · Pure core + serializable `PageSnapshot` boundary
The core is `analyze(snapshot) → result` with no browser or DOM APIs. Approved with M1 authorization ("browser-independent detection core"). Rationale: cross-browser reuse, Node-based testing and a reproducible evaluation.

### D-004 · Accepted · 2026-10-21 · On-demand scanning via `activeTab` (no auto-scan in MVP)
Approved by the owner. **No claim of real-time or proactive protection** may be made in docs, UI or the demo. Auto-scan remains an M6 option behind per-site optional permissions.

### D-005 · Proposed · 2026-10-21 · No background service worker in the MVP
The popup calls `scripting.executeScript` directly. To be confirmed in M3.

### D-006 · Accepted · 2026-10-21 · esbuild instead of Vite
Approved by the owner. Vitest is used for tests.

### D-007 · Accepted · 2026-10-21 · Decision table instead of an additive weighted score
The owner instructed to avoid a generic weighted score that undermines explainability. Superseded in part by D-017 for the result model.

### D-008 · Proposed · 2026-10-21 · Inform, don't block
The MVP never blocks navigation or modifies page content (except a user-requested highlight in M3).

### D-009 · Accepted · 2026-10-21 · English documentation and code; Indonesian conversation with the owner
Detection lexicons are bilingual (ID/EN) by design.

### D-010 · Accepted · 2026-10-21 · License: Apache-2.0
`LICENSE` contains the Apache License 2.0 text. `NOTICE` names the project. GPL-3.0 code (ClipShield) and unlicensed code (Nehboro) must not be incorporated.

### D-011 · Accepted · 2026-10-21 · M4 research targets
Held-out recall ≥ 85%, precision ≥ 90%, hard-negative FPR ≤ 10%, evidence localization ≥ 95%, 0 external network requests during scanning. These are research targets, not guarantees. Report raw counts, uncertainty intervals, corpus composition and limitations. See EVALUATION_PLAN.md §8.

### D-012 · Accepted · 2026-10-21 · Clean-room implementation; no third-party competitor code
Approved with the M1 constraints. Pattern lists, regexes and code are not copied. All lexicon entries in `src/core/lexicon/` were written for this project.

### D-013 · Proposed · 2026-10-21 · Test-only build with `http://localhost/*` host permission for e2e
Playwright cannot perform the real toolbar gesture that grants `activeTab`. CI must assert that the shipped manifest does not contain it. Decide in M3.

### D-014 · Open · Project name
"VEILTRACE" is a working name. No trademark/name-collision check has been done.

### D-015 · Open · Firefox for Android manifest version
Extension Workshop recommends MV2 for Android. Decide after the M5 spike.

### D-016 · Accepted · 2026-10-21 · Corpus samples are reconstructed and defanged; no live malicious URLs in tests
See PRIVACY_SECURITY.md §5.

### D-017 · Accepted · 2026-10-21 · Three-class result model; confidence and action risk are separate fields
Owner correction to M0. Findings are `observed_instruction`, `suspicious_correlation` or `manipulative_instruction`. A risky instruction alone (command, key sequence, clipboard step) is only `observed_instruction` and is not a positive detection. `confidence` (evidence strength) and `actionRisk` (harm if followed) are separate from classification. Supersedes the M0 single-severity model (R2 "exec chain without pretext → medium").

### D-018 · Accepted · 2026-10-21 · Strong vs weak pretexts
Only `P.HUMAN_VERIFY` is a strong pretext, because a page asking the reader to run a command to "prove you are human" has no legitimate counterpart we know of. `P.FAKE_FIX`, `P.URGENCY` and `P.AUTHORITY` are weak, because they occur routinely in legitimate troubleshooting, billing and account pages. Weak pretexts can produce at most `suspicious_correlation`. Rationale: hard-negative FPR target (D-011).

### D-019 · Accepted · 2026-10-21 · Region = consecutive blocks with the same `containerId`; correlation window K = 8 blocks
Signals never correlate across regions. A dedicated test asserts that a pretext in one region cannot raise an instruction in another. K and the container boundaries may be tuned on the dev split only.

### D-020 · Accepted · 2026-10-21 · Negation removes actions before correlation; reported speech and quotation demote
Negated actions ("never press Win+R", "jangan pernah tekan…") are not instructions to the reader and are excluded from rule evaluation. Reported speech, quotation, educational framing and code examples demote the classification (cap 2 tiers, floor `observed_instruction`) and lower confidence one level each. Affirmative idioms ("don't worry", "jangan lupa") do not count as negation.

### D-021 · Accepted · 2026-10-21 · Git repository initialized; no commit without owner review
Owner authorized `git init`. Commits wait for review of the M1 implementation and test results.
