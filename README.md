# VEILTRACE

**Uncover the Manipulation Behind the Page.**

An offline-first browser security engine that detects contextual social engineering and deceptive instructions in web pages, including pages on legitimate HTTPS domains.

> **Status: M1, detection core only.** The browser-independent engine (`src/core`) and its tests exist. There is no extension, UI or DOM extractor yet. See [docs/PROGRESS.md](docs/PROGRESS.md).

## What it does (planned MVP)

When you click the VEILTRACE toolbar icon (planned M3), it reads the visible content of the current page **locally** and looks for regions that:

1. tell **you** to perform a high-risk action (e.g. *Win+R → Ctrl+V → Enter*, or "paste this into PowerShell"),
2. wrap that request in a manipulative pretext (fake CAPTCHA, fake error fix, fake account verification),
3. and are **not** merely quoted, negated, reported or explained (security tutorials, news articles, awareness pages).

Results distinguish an **observed instruction** (e.g. developer docs telling you to run a command) from **suspicious correlation** and **manipulative instruction**. Confidence and action risk are reported separately. Every finding carries the exact text and source offsets. Highlighting the element on the page is planned for M3. Detection works in English and Indonesian. VEILTRACE analyzes on demand and does **not** provide real-time protection.

## Using the core (M1)

```bash
npm ci
npm test          # unit tests
npm run lint      # includes the core-purity rule
npm run build     # esbuild bundle of the core → dist/core.mjs
```

```ts
import { analyze } from './src/core/index.js';
const result = analyze(snapshot); // PageSnapshot → AnalysisResult (pure, deterministic)
```

## What it does not do
- It does not look up URLs or use blocklists, and it does not trust domains.
- It does not send anything anywhere. There is no network code.
- It does not block pages or guarantee safety. It informs.
- It does not use AI in the MVP.

## Permissions
`activeTab` and `scripting` only. Nothing runs until you click.

## Documentation

| Doc | Purpose |
|---|---|
| [PRODUCT_SPEC](docs/PRODUCT_SPEC.md) | Problem, hypothesis, MVP scope, UX, demo |
| [RESEARCH](docs/RESEARCH.md) | Conceptual model, evidence base, open questions |
| [COMPETITIVE_ANALYSIS](docs/COMPETITIVE_ANALYSIS.md) | Verified comparison with Nehboro, ClipShield, ClickFix Mitigator, Browser Guard |
| [THREAT_MODEL](docs/THREAT_MODEL.md) | Attack classes, adversary, evasion, out of scope |
| [DETECTION_MODEL](docs/DETECTION_MODEL.md) | Signals, regions, decision table, finding schema |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Components, snapshot contract, tech choices, manifest |
| [PRIVACY_SECURITY](docs/PRIVACY_SECURITY.md) | Commitments and how each is verified |
| [EVALUATION_PLAN](docs/EVALUATION_PLAN.md) | Corpus, leakage controls, metrics, baseline |
| [IMPLEMENTATION_PLAN](docs/IMPLEMENTATION_PLAN.md) | Milestones M1–M7 with acceptance criteria |
| [DECISIONS](docs/DECISIONS.md) | Decision log |
| [PROGRESS](docs/PROGRESS.md) | Status log |

## Planned repository layout

```
src/core/        pure TypeScript detection engine (no browser APIs)
src/extract/     DOM → PageSnapshot extractor (injected on demand)
src/extension/   manifest, popup, browser adapter
corpus/          dev / test (held-out) / realworld fixtures with labels
scripts/         build and evaluation harness
tests/           unit and e2e tests
docs/            specification and research
```

## License
[Apache-2.0](LICENSE).
