# Evaluation: dev split

Engine 0.3.0, extractor 0.2.0-m5. Synthetic fixtures; **not** real-world effectiveness.

Composition: category:adversarial=7, category:ambiguous=1, category:benign=31, category:positive=17, hardNegative=32, lang:en=33, lang:id=23, total=56, truth:benign=32, truth:malicious=24

## Systems

| System | TP | FP | TN | FN | Precision | Recall | FPR | Hard-neg FPR | Localization |
|---|---|---|---|---|---|---|---|---|---|
| veiltrace | 23 | 0 | 32 | 1 | 100.0% (23/23; 95% CI 85.7%–100.0%) | 95.8% (23/24; 95% CI 79.8%–99.3%) | 0.0% (0/32; 95% CI 0.0%–10.7%) | 0.0% (0/32; 95% CI 0.0%–10.7%) | 100.0% (23/23; 95% CI 85.7%–100.0%) |
| veiltrace-m1 | 20 | 7 | 25 | 4 | 74.1% (20/27; 95% CI 55.3%–86.8%) | 83.3% (20/24; 95% CI 64.1%–93.3%) | 21.9% (7/32; 95% CI 11.0%–38.8%) | 21.9% (7/32; 95% CI 11.0%–38.8%) | 100.0% (20/20; 95% CI 83.9%–100.0%) |
| B0 | 24 | 17 | 15 | 0 | 58.5% (24/41; 95% CI 43.4%–72.2%) | 100.0% (24/24; 95% CI 86.2%–100.0%) | 53.1% (17/32; 95% CI 36.4%–69.1%) | 53.1% (17/32; 95% CI 36.4%–69.1%) | 100.0% (24/24; 95% CI 86.2%–100.0%) |
| A1-page+context | 20 | 9 | 23 | 4 | 69.0% (20/29; 95% CI 50.8%–82.7%) | 83.3% (20/24; 95% CI 64.1%–93.3%) | 28.1% (9/32; 95% CI 15.6%–45.4%) | 28.1% (9/32; 95% CI 15.6%–45.4%) | 100.0% (20/20; 95% CI 83.9%–100.0%) |
| A2-region-only | 24 | 15 | 17 | 0 | 61.5% (24/39; 95% CI 45.9%–75.1%) | 100.0% (24/24; 95% CI 86.2%–100.0%) | 46.9% (15/32; 95% CI 30.9%–63.6%) | 46.9% (15/32; 95% CI 30.9%–63.6%) | 100.0% (24/24; 95% CI 86.2%–100.0%) |

## VEILTRACE class matrix

| expected \ predicted | none | observed | suspicious | manipulative |
|---|---|---|---|---|
| none | 7 | 0 | 0 | 0 |
| observed | 1 | 24 | 0 | 0 |
| suspicious | 0 | 0 | 6 | 0 |
| manipulative | 0 | 1 | 5 | 12 |

Observed-instruction (informational) results on benign scenarios: 24.

Requests during scanning: 0. Partial scans: none.

Latency is machine-specific and kept out of this file: see `dev.perf.json` (not committed).

## Per scenario

| Scenario | Truth | Expected | VEILTRACE | B0 | A1 page+context | A2 region-only |
|---|---|---|---|---|---|---|
| D01-en-blog-security-check-overlay | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D02-id-download-modal-after-click | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D03-en-locked-pc-support-scam | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| D04-id-locked-pc-support-scam | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| D05-en-docs-comment-lure | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D06-id-recipe-comment-lure | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D07-en-shadow-dom-widget-lure | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D08-en-same-origin-support-iframe | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D09-en-macos-spotlight | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D10-en-planted-reported-speech | malicious | manipulative | suspicious | manipulative | observed | manipulative |
| D11-en-planted-educational-cue | malicious | manipulative | suspicious | manipulative | suspicious | manipulative |
| D12-id-planted-blockquote | malicious | manipulative | suspicious | manipulative | observed | manipulative |
| D13-en-word-error-winx | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| D14-id-session-copy-button | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| D15-en-benign-captcha-checkbox | benign | none | none | none | none | none |
| D16-en-vendor-install-script | benign | observed | observed | observed | observed | observed |
| D17-en-vendor-troubleshooting-fix | benign | observed | observed | suspicious | suspicious | suspicious |
| D18-en-internal-it-certificate | benign | observed | observed | suspicious | suspicious | suspicious |
| D19-en-internal-it-gpupdate | benign | observed | observed | observed | observed | observed |
| D20-en-news-clickfix-campaign | benign | observed | observed | suspicious | observed | suspicious |
| D21-en-security-blog-code-example | benign | observed | observed | manipulative | observed | manipulative |
| D22-en-negation-awareness | benign | none | none | observed | none | observed |
| D23-en-checkout-urgency | benign | none | none | none | none | none |
| D24-en-cookie-banner-and-howto | benign | observed | observed | suspicious | suspicious | observed |
| D25-en-readme-install | benign | observed | observed | observed | observed | observed |
| D26-id-npm-install-docs | benign | observed | none | none | none | none |
| D27-id-troubleshooting-fix | benign | observed | observed | suspicious | suspicious | suspicious |
| D28-id-it-certificate | benign | observed | observed | suspicious | suspicious | suspicious |
| D29-id-it-network-share | benign | observed | observed | observed | observed | observed |
| D30-id-news-clickfix | benign | observed | observed | observed | observed | observed |
| D31-id-negation-awareness | benign | none | none | observed | none | observed |
| D32-id-bank-warning | benign | none | none | none | none | none |
| D33-id-promo-countdown | benign | none | none | none | none | none |
| D34-id-security-blog-example | benign | observed | observed | manipulative | observed | manipulative |
| D35-id-forum-flushdns | benign | observed | observed | observed | observed | observed |
| D36-id-benign-captcha | benign | none | none | none | none | none |
| D37-en-security-tutorial-modal | benign | observed | observed | manipulative | observed | manipulative |
| D38-en-security-quiz-modal | benign | observed | observed | manipulative | observed | manipulative |
| D39-en-docs-quickstart-dialog | benign | observed | observed | suspicious | suspicious | suspicious |
| D40-id-troubleshooting-procedure | benign | observed | observed | suspicious | suspicious | suspicious |
| D41-en-mixed-pretext-portal | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| D42-id-authority-only-support-overlay | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| D43-en-ugc-quoted-lure-comment | malicious | manipulative | observed | manipulative | observed | manipulative |
| D44-id-informal-paraphrase | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D45-en-concealed-payload-edu-cue | malicious | manipulative | manipulative | manipulative | suspicious | manipulative |
| D46-id-concealed-payload-blockquote | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D47-en-unrelated-regions | benign | observed | observed | suspicious | suspicious | observed |
| D48-en-verify-windows-version | benign | observed | observed | observed | observed | observed |
| D49-en-news-reported-list | benign | observed | observed | manipulative | observed | manipulative |
| D50-id-direct-lure-reported-framing | malicious | manipulative | suspicious | manipulative | observed | manipulative |
| D51-en-realistic-humancheck-clipboard | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D52-id-realistic-blog-informal-steps | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D53-en-realistic-docs-install-dialog | benign | observed | observed | suspicious | suspicious | suspicious |
| D54-id-realistic-news-clickfix-figure | benign | observed | observed | manipulative | observed | manipulative |
| D55-en-realistic-awareness-quiz | benign | observed | observed | manipulative | observed | manipulative |
| D56-en-realistic-fake-browser-fix | malicious | manipulative | suspicious | suspicious | suspicious | suspicious |
