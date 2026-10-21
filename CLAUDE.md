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
- **Permissions:** the shipped manifest has exactly `activeTab` + `scripting`. Adding any permission requires a new DECISIONS.md entry and owner approval.
- **No runtime dependencies** without a DECISIONS.md entry. Dev dependencies must be pinned in the lockfile.
- **Clean room:** do not copy code, regexes or pattern lists from Nehboro (no license), ClipShield (GPL-3.0) or other projects (D-012).
- **Evaluation integrity:** never tune rules or lexicons using `corpus/test` or `corpus/realworld`. Never edit frozen test fixtures. Run `--split test --final` only when the owner asks, and log the run.
- **Malicious samples:** defang payloads (`example.invalid`, `192.0.2.0/24`). Never fetch live malicious URLs.
- **Claims:** do not write "detects X" in docs or UI unless a fixture plus test demonstrates it. Distinguish observed signals from inferred risk. Never call a page "safe". Never claim real-time/proactive protection (D-004). Never claim on-page highlighting before the browser adapter implements it.
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
