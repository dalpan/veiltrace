# VEILTRACE

**Uncover the Manipulation Behind the Page.**

An offline-first browser security engine that detects contextual social engineering and deceptive instructions in web pages, including pages on legitimate HTTPS domains.

> **Status: M3.** A working Chromium (MV3) extension: click the toolbar button, then **Scan page**. The page is analyzed locally in the tab, and the popup shows the verdict, evidence and Show on page. It is built on the detection core (`src/core`) and DOM extractor (`src/extract`), with an offline evaluation harness (`src/eval`). Accuracy figures so far come from a **synthetic development split only**, not real-world use. See [docs/PROGRESS.md](docs/PROGRESS.md).

## What it does

When you click the VeilTrace toolbar button and then **Scan page**, it reads the visible content of the current page **locally** and looks for regions that:

1. tell **you** to perform a high-risk action (e.g. *Win+R → Ctrl+V → Enter*, or "paste this into PowerShell"),
2. wrap that request in a manipulative pretext (fake CAPTCHA, fake error fix, fake account verification),
3. and are **not** merely quoted, negated, reported or explained (security tutorials, news articles, awareness pages).

Results distinguish an **observed instruction** (e.g. developer docs telling you to run a command) from **suspicious correlation** and **manipulative instruction**. Confidence and action risk are reported separately. Every finding shows the exact text, and **Show on page** highlights the element when it can still be located. Partial scans (very large pages, frames from other sites) are labeled as partial, with reasons. Detection works in English and Indonesian; the UI is in English. VEILTRACE analyzes on demand and does **not** provide real-time protection.

## Install (unpacked, Chrome/Chromium ≥ 110)

```bash
npm ci
npm run build:ext            # → dist/extension (production: activeTab + scripting only)
```
Then `chrome://extensions` → Developer mode → **Load unpacked** → select `dist/extension`. See [docs/DEMO.md](docs/DEMO.md) for a manual walkthrough.

## Development

```bash
npm ci
npx playwright install chromium     # one-time browser download (tooling only)
npm run typecheck && npm run lint
npm run test:unit                   # core, extractor contracts, harness, extension units (Node)
npm run test:browser                # extractor in real Chromium
npm run test:e2e                    # real extension loaded in Chromium (builds dist/e2e/*)
npm run check                       # typecheck + lint + all tests
npm run verify:extension            # production build + manifest/permission/offline/CSP/XSS checks
npm run build                       # dist/core.mjs, dist/extractor.js and dist/extension
npm run build:ext:test              # dist/extension-test (E2E only; never distribute)
npm run eval -- run --split dev     # offline evaluation on the development split → eval/results/
npm run eval -- research --split dev
npm run eval -- perf
```

The held-out split (`corpus/test`) is frozen and must not be evaluated during development (`--final` only, on owner request).

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
`activeTab` and `scripting` only, with no host permissions and no install warning. Nothing runs until you click **Scan page**. Browser-protected pages (chrome://, the Web Store, other extensions) cannot be scanned.

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
