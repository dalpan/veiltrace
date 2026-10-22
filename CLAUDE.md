# CLAUDE.md: instructions for Claude Code sessions in VEILTRACE

## Before making any change, read in this order
1. `docs/PROGRESS.md`: current milestone, blockers, next step
2. `docs/DECISIONS.md`: accepted vs proposed vs open decisions
3. `docs/ARCHITECTURE.md`: component boundaries and the `PageSnapshot` contract
4. `docs/IMPLEMENTATION_PLAN.md`: scope and acceptance criteria of the current milestone
5. `docs/DETECTION_MODEL.md` when touching `src/core`. `docs/EVALUATION_PLAN.md` when touching `corpus/` or `scripts/eval`

Work only inside the current milestone's scope. If a change needs something outside it, stop and ask.

## Communication
- Reply to the project owner in **Indonesian**. Code, comments, docs and commit messages are in **English** (D-009).

## Hard rules
- **Never commit or push without explicit owner approval** (repository initialized under D-021).
- **No network code in shipped extension code** (`fetch`, XHR, WebSocket, sendBeacon, EventSource). No telemetry. No remote code.
- **`src/core` must stay pure:** no `window`, `document`, `chrome`, `browser`, `fetch`, timers or `Date.now`. It takes a `PageSnapshot` and returns data.
- **Hostname/URL is never a decision input** in the core (D1 differentiator). A test asserts this.
- **Page-derived strings are rendered only via `textContent`.** Never `innerHTML` & co. with page data.
- **Permissions:** the shipped manifest has exactly `activeTab` + `scripting` as granted permissions. The only additions are the D-081 opt-in pieces: `optional_host_permissions` `http://*/*` + `https://*/*` (never granted unless the user turns on automatic scanning) and a badge-only `background.js`. Adding any other permission requires a new DECISIONS.md entry and owner approval. Test-only permissions live **only** in the `--test` build (D-038). Never add them to `src/extension/manifest.json`.
- **Extension (`src/extension`):** no messaging surface (D-035) except the one-way auto-scan channel in `src/extension/auto/channel.ts` that carries only a verdict and a count (D-081); no HTML sinks, no network. Detection runs in the tab's isolated world, and the popup gets only the minimal `ScanReport` (D-036), validated by `parseScanReport`. Never claim a highlight that did not succeed (D-037).
- **No runtime dependencies** without a DECISIONS.md entry. Dev dependencies must be pinned in the lockfile.
- **Clean room:** do not copy code, regexes or pattern lists from Nehboro (no license), ClipShield (GPL-3.0) or other projects (D-012).
- **Evaluation integrity:** never tune rules, lexicons, extractor heuristics or thresholds using `corpus/test` or the **test half** of `corpus/realworld` (its dev half may guide rule changes, D-082; never edit or add locked test records). Never edit, add or delete files in `corpus/test` (hash-checked, D-022). Never open its labels to guide development. Run `npm run eval -- run --split test --final` only when the owner explicitly asks, exactly as preregistered in `docs/EVAL_PREREGISTRATION.md`; it logs to `eval/runs.md`. Research variants run on `--split dev` only.
- **Optional AI (D-093, D-095) is an experiment, compiled out of released builds, and on-device only** (browser built-in model, popup, after the user sees the masked payload). Never add a cloud model, network code or AI into the badge, automatic scanning or the verdict without a new decision; the AI answer stays fixed-value and validated.
- **Extractor (`src/extract`) is read-only:** no DOM writes, clicks, focus or event dispatch, no network, no reading of password/hidden/sensitive or user-typed values (D-025). The ESLint rule enforces most of this; keep the runtime tests green.
- **`AnalyzeOptions` are research-only (D-028).** Production code calls `analyze(snapshot)` with defaults: engine `0.3.0`, ruleset `m5` (D-083); `{ ruleset: 'm4.1' }` is engine `0.2.0`, the one evaluated on held-out v1 (D-055). The M1 model is `{ ruleset: 'm1' }` (engine `0.1.0-m1`); B0 and the ablations are pinned to it. Changing the default, a rule, lexicon, modifier, window or threshold needs a new engine version and owner approval, and after the `eval-freeze-v1` tag it cannot be evaluated on the current held-out split (docs/EVAL_PREREGISTRATION.md).
- **Credential detector (M5.1, D-062 … D-067) is experimental.** `analyzeCredentials()` lives in `src/core/credential/`, never changes `analyze()` results, and must not import into ClickFix files. Never read form field values, default values or typed text, and never export a form's URL (only its destination category); keep the sentinel tests green. Do not add rules like "password field = phishing" or "OTP requested = malicious"; a claimed identity is never evidence. Tune only on `corpus/cred-dev`, record before/after counts, and never report dev numbers as held-out or real-world.
- **UI text** lives in `src/extension/popup/i18n.ts` (EN and ID must stay in parity; tests enforce it). Never translate page evidence. Never use "safe"/"aman".
- **Releases:** use `npm run release` from a clean commit, then `release:verify`. Never commit `release/`, signing keys or CRX files. Never describe checksums as authenticity, and never describe VEILTRACE as certified, military-grade or endorsed (D-048).
- **Malicious samples:** defang payloads (`example.invalid`, `192.0.2.0/24`). Never fetch live malicious URLs.
- **Claims:** do not write "detects X" in docs or UI unless a fixture plus test demonstrates it. Distinguish observed signals from inferred risk. Never call a page "safe". Never claim real-time/proactive protection (D-004); automatic scanning is opt-in, on page load and change, badge-only, and must be described that way. Never claim on-page highlighting before the browser adapter implements it.
- **Result model (D-017):** a risky instruction alone is `observed_instruction`, not a detection. Keep `classification`, `confidence` and `actionRisk` separate. Do not introduce a generic weighted score.

## When finishing a unit of work
1. Run the relevant tests (`npm test`, and `npm run eval -- --split dev` if detection changed) and report actual output.
2. Update `docs/PROGRESS.md` (date, what, verification, next, blockers).
3. Record any new architectural choice in `docs/DECISIONS.md`.
4. Keep docs consistent: IDs (T*, A.*/P.*/C.*, R*, S-P*/S-N*, D-0xx, M*) must match across files.

## Conventions
- TypeScript strict. Small pure functions in the core. Lexicon entries are data with an `id`, a pattern and at least one example.
- Every new rule or signal arrives with at least one positive and one hard-negative fixture in `corpus/dev`.
- Tests: Vitest (unit), Playwright (extraction, e2e). Fixtures are served locally with network egress blocked.
