# VeilTrace

**Uncover the manipulation behind the page.** An offline, explainable detector for social-engineering instructions in web pages and messages: fake CAPTCHAs that make you run commands, requests for OTP codes, pay-first refunds, fake bank or support notices, and more. Everything runs on your device.

> **Ringkasan (Bahasa Indonesia).** VeilTrace adalah browser extension dan PWA "Cek Pesan" yang membaca isi halaman atau pesan secara **on-device**, lalu menunjukkan dengan bukti yang bisa di-highlight kapan teks itu mencoba membuat Anda melakukan sesuatu yang merugikan: menjalankan command, menyerahkan OTP atau password, membayar di muka, atau mengikuti "CS bank" palsu. Tanpa server, tanpa telemetry, tanpa AI black-box. Dibuat untuk Kartika Cyber Hackathon 2026, kategori **Penangkalan (Defensive Shield)**. Proposal dan slide: [submission/](submission/). Coba di HP: **https://dalpan.github.io/veiltrace/**.
>
> VeilTrace adalah proyek independen; tidak berafiliasi dengan, tidak disetujui oleh, dan tidak mewakili TNI AD atau instansi mana pun.

| A fake CAPTCHA on a legitimate-looking site… | …and what VeilTrace shows |
|---|---|
| ![Fake human-verification box asking to press Win+R, Ctrl+V, Enter](docs/images/cmd-lure-page.png) | ![VeilTrace popup: manipulative content detected, command execution category](docs/images/cmd-lure-popup.png) |

## Why

The most effective attacks no longer break into systems; they persuade people to do it for them. The lure often sits on a **legitimate site** (a comment, a chat widget, a forum post) or arrives as a **WhatsApp or SMS message**, so domain blocklists and URL reputation do not see it. What is dangerous is the **instruction**, not the address. VeilTrace reads the instruction and its context.

## What it checks

Four independent detectors. None of them alerts on a single keyword: each needs a requested **action** together with a manipulative **pretext**, and reads context that lowers the result (quotations, news, education, negation such as "never share your code").

| Code | Detector | Examples |
|---|---|---|
| **CMD** | Command Execution Manipulation | ClickFix: "press Win+R, paste, Enter"; fake "fix this error" terminal steps |
| **CRED** | Credential Disclosure Manipulation | "send us the OTP", "kasih liat kode yg masuk ke hp", recovery phrases |
| **PAY** | Payment Manipulation | pay a fee to release a refund or prize, transfer to a personal account, job-offer uniform fees, gift cards |
| **SUP** | Support & Authority Impersonation | fake virus alerts with a phone number, "bank CS" asking for AnyDesk or an APK, fake tariff-change notices asking you to reply, prize quizzes in a company's name, "WhatsApp tapping" services |

Each finding keeps **classification** (manipulative / suspicious / observed), **confidence** and **action risk** separate, names the rule, explains it in plain language, lists the evidence with **Show on page**, and states its limits ("a claimed identity cannot be verified"). VeilTrace never calls a page "safe".

## Where it runs

| Surface | Status | How |
|---|---|---|
| **Chrome / Edge extension** (desktop) | Working | [Install](#install) · scan on click, or opt-in automatic scanning with a toolbar badge |
| **Firefox extension** (desktop and Android ≥ 128) | Working, tested by the owner on Android | `npm run build:firefox` → `dist/extension-firefox` |
| **"Cek Pesan" web app** (any phone) | Live | **https://dalpan.github.io/veiltrace/**: paste a message, or on Android share it from WhatsApp; works offline once opened |
| **WhatsApp Web** | Prototype | conversations are read as one user-content region; markup match with the real service not yet verified |
| **Managed build** for organizations | Ready to pilot | install-time permissions, automatic scanning on, no reporting: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |

<p align="center"><img src="docs/images/pwa-result.png" alt="Cek Pesan on a phone: a WhatsApp scam message flagged as manipulative payment request" width="300"></p>

## Privacy and security by design

- **No network code** in the extension or the app: no server, no telemetry, no remote rules. The app's CSP is `connect-src 'none'`; tests assert zero requests.
- **Minimal permissions:** `activeTab` + `scripting`. Automatic scanning asks for site access only when the user turns it on, and gives it back when turned off.
- **Never reads what you type**: form-field values, amounts and phone numbers are never copied into a report (tested with sentinel values).
- **The page address is never a decision input.** Detection reads content, so it works on trusted domains and cannot be gamed by a fresh domain.
- Page text is rendered only as text (no HTML sinks); reports crossing from the page to the popup are validated field by field.
- Reproducible release ZIPs with checksums and SBOMs ([docs/RELEASE.md](docs/RELEASE.md)).

## Results, reported as they are

| Evaluation | What | Result |
|---|---|---|
| Held-out v1 (ClickFix only, 26 synthetic) | frozen before testing, run once | recall 75.0%, precision 81.8%, hard-negative false-alarm 14.3%: **targets missed** ([details](docs/EVALUATION_RESULTS.md)) |
| Held-out v2 (60 synthetic, all four detectors, blind author) | run once on 22 Oct 2026 | recall 34.4%, precision 68.8%, false-alarm 17.9%: **the rules overfit their author's wording** ([details](docs/EVALUATION_RESULTS_V2.md)) |
| Owner's real scam messages (14 scams + 1 genuine SMS) | development data: rules were improved on them | 2 → **11 of 14** flagged, genuine bank SMS not flagged ([details](docs/DETECTION_MODEL.md)) |
| On-device AI (Gemini Nano) as a second opinion | 185 development scenarios, owner's Chrome | flagged **71% of benign pages**, so it is **not used** in released builds ([details](docs/AI_EVAL.md)) |
| Held-out v3 (80 synthetic, blind author, 47 message contexts) | locked and preregistered | **not run yet** (runs once, on owner request) |
| Real-world test half | collected with local OCR, never seen by the rule author | collection in progress |

Development numbers are not accuracy claims. Every held-out run is preregistered, hash-locked and published whether or not it meets the targets ([docs/EVALUATION_PLAN.md](docs/EVALUATION_PLAN.md)).

## Install

**Chrome / Edge (unpacked):**
```bash
npm ci
npm run build:ext            # → dist/extension
```
`chrome://extensions` → Developer mode → **Load unpacked** → `dist/extension`. Open a page, click the VeilTrace icon, press **Scan page**. A fictional demo gallery runs offline: `npm run manual:fixtures && python3 -m http.server 8080 -d dist/manual` → `http://localhost:8080/demo/scenes/` ([demo/README.md](demo/README.md)).

**Firefox (desktop or Android):** `npm run build:firefox`, then load `dist/extension-firefox` temporarily (`about:debugging`, or `npx web-ext run -t firefox-android` over USB). Permanent installation needs a Mozilla-signed XPI.

**Phone:** open https://dalpan.github.io/veiltrace/ → *Install app* / *Add to Home Screen*.

## Repository map

```
src/core/          pure TypeScript detection engine: PageSnapshot → findings (no browser APIs, deterministic)
src/extract/       read-only DOM → PageSnapshot extractor (shadow DOM, frames, user-content regions)
src/extension/     MV3 extension: popup dashboard, content script, opt-in automatic scanning, experimental AI panel
src/pwa/           "Cek Pesan" installable web app (share target, offline)
src/eval/          evaluation harnesses (dev, held-out v1/v2/v3, real-world field sample, AI)
corpus/            labelled scenarios: dev splits, locked held-out sets, redacted real-world records
tests/             unit, real-browser extraction and end-to-end tests (737 passing)
demo/              fictional, offline demo pages (never shipped)
deploy/            policy templates for managed deployment
docs/              technical documentation and decision records: start at docs/README.md
submission/        hackathon proposal, slides outline, video script, jury Q&A (Indonesian)
```

## Development

```bash
npm ci && npx playwright install chromium
npm run check                        # typecheck + lint + all tests
npm run eval -- run --split dev      # ClickFix dev evaluation (also eval:cred, eval:pay, eval:support)
npm run realworld -- import <dir>    # add real screenshots via local OCR (see corpus/realworld/README.md)
npm run release && npm run release:verify
```
Rules for contributors (including AI assistants) are in [CLAUDE.md](CLAUDE.md); every design choice is recorded in [docs/DECISIONS.md](docs/DECISIONS.md).

## Documentation

Start with [docs/README.md](docs/README.md): architecture, detection model, threat model, privacy, evaluation protocol and results, deployment and operator guides.

## Development transparency

Most code, documentation and test data were written with an AI coding assistant (Claude Code) under the team's direction and review. Held-out sets were written by separate, rule-blind agent instances and locked before use; real-world records are collected and labelled by people.

## License

[Apache-2.0](LICENSE). Demo pages and test scenarios are fictional; malicious samples are defanged.
