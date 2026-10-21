# VEILTRACE

**Uncover the Manipulation Behind the Page.**

An offline-first browser security engine that detects contextual social engineering and deceptive instructions in web pages, including pages on legitimate HTTPS domains.

VeilTrace reads the page **on your device** and explains, with evidence highlighted on the page, when it is trying to make you do something harmful. It runs four independent checks:

| Check | Looks for | Status |
|---|---|---|
| **Command Execution Manipulation** (CMD) | ClickFix / fake CAPTCHA: "press Win+R, paste, Enter", fake error fixes | Engine 0.2.0; one frozen held-out evaluation |
| **Credential Disclosure Manipulation** (CRED) | Requests to *send* passwords, OTP codes or recovery phrases, threats to the account | Experimental (`cred-0.1.1-exp`) |
| **Payment Manipulation** (PAY) | Pay-to-receive refunds or prizes, transfers to personal accounts or gift cards, payment under threat | Experimental (`pay-0.1.0-exp`) |
| **Support & Authority Impersonation** (SUP) | Fake virus alerts with a number to call, fake bank/CS asking for AnyDesk or app installs | Experimental (`sup-0.1.0-exp`) |

The popup is one dashboard: page threat summary, the four categories, advice, and one ranked list of findings. Each finding keeps classification, confidence and action risk separate and lists its evidence with **Show on page**. English and Indonesian, including common informal Indonesian.

**Honest status.**
- The only held-out result is for CMD: 26 synthetic scenarios, run once, with recall 75.0%, precision 81.8% and hard-negative FPR 14.3%. All three are **below the research targets** ([docs/EVALUATION_RESULTS.md](docs/EVALUATION_RESULTS.md)).
- A second held-out set (v2, 60 scenarios across all four checks, written blind to the rules) gave **recall 34.4%, precision 68.8%, hard-negative FPR 17.9%** ([docs/EVALUATION_RESULTS_V2.md](docs/EVALUATION_RESULTS_V2.md)): the rules generalize poorly beyond the wording they were written for.
- None of these numbers are real-world rates. Scanning is on demand by default; automatic scanning on page load is opt-in (badge only for manipulative pages).
- Progress log: [docs/PROGRESS.md](docs/PROGRESS.md). Hackathon materials (Indonesian): [submission/](submission/).

## On a phone
- **Cek Pesan (PWA):** `npm run build:pwa` → `dist/pwa` (static files; published at https://dalpan.github.io/veiltrace/ with `npm run deploy:pwa`). Served over HTTPS and installed, it checks a pasted message, or on Android a message shared from WhatsApp or Messages, on the device and offline.
- **Firefox for Android (≥ 128):** `npm run build:firefox` → `dist/extension-firefox`. Not yet tested on a device.

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
npm run release && npm run release:verify   # deterministic ZIP + manifest + SHA256SUMS (docs/RELEASE.md)
npm run release:repro               # two independent clean builds must match
npm run supply-chain                # SBOMs, license review, lockfile check, npm audit
npm run eval -- run --split dev     # offline evaluation on the development split → eval/results/
npm run eval -- research --split dev
npm run eval -- perf
```

The held-out split (`corpus/test`) is frozen and must not be evaluated during development (`--final` only, on owner request).

```ts
import { analyze } from './src/core/index.js';
const result = analyze(snapshot); // PageSnapshot → AnalysisResult (pure, deterministic; engine 0.3.0, ruleset m5)
const m1 = analyze(snapshot, { ruleset: 'm1' }); // M1 baseline model (engine 0.1.0-m1), used for comparisons
```

## What it does not do
- It does not look up URLs or use blocklists, and it does not trust domains.
- It does not send anything anywhere. There is no network code.
- It does not block pages or guarantee safety. It informs.
- It does not use AI or machine learning: every finding comes from explainable rules.

## Permissions
`activeTab` and `scripting` only, with no host permissions and no install warning. Nothing runs until you click **Scan page**, unless you turn on **automatic scanning** in the popup: Chrome then asks for permission to read websites (an optional permission that is removed again when you turn it off). Browser-protected pages (chrome://, the Web Store, other extensions) cannot be scanned.

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
| [EVAL_PREREGISTRATION](docs/EVAL_PREREGISTRATION.md) | Frozen held-out evaluation protocol (v1) |
| [EVALUATION_RESULTS](docs/EVALUATION_RESULTS.md) | Held-out evaluation v1 results, failures, limitations |
| [PRESENTER_GUIDE](docs/PRESENTER_GUIDE.md) | Demo setup, 3- and 7-minute scripts, evaluation slide, limitations |
| [DEMO](docs/DEMO.md) | Manual validation checklists (Chrome stable) |
| [IMPLEMENTATION_PLAN](docs/IMPLEMENTATION_PLAN.md) | Milestones M1–M7 with acceptance criteria |
| [DECISIONS](docs/DECISIONS.md) | Decision log |
| [OPERATOR_GUIDE](docs/OPERATOR_GUIDE.md) | For IT/security staff: results, limits, installation, troubleshooting |
| [DEPLOYMENT](docs/DEPLOYMENT.md) | Organizational deployment feasibility |
| [RELEASE](docs/RELEASE.md) | Release process, reproducibility, supply chain |
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
demo/            fictional offline demo site (not shipped in the extension)
```

## License
[Apache-2.0](LICENSE).
