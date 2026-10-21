# Evaluation: dev split

Engine 0.1.0-m1, extractor 0.1.0-m2. Synthetic fixtures; **not** real-world effectiveness.

Composition: category:adversarial=7, category:ambiguous=1, category:benign=28, category:positive=14, hardNegative=29, lang:en=29, lang:id=21, total=50, truth:benign=29, truth:malicious=21

## Systems

| System | TP | FP | TN | FN | Precision | Recall | FPR | Hard-neg FPR | Localization |
|---|---|---|---|---|---|---|---|---|---|
| veiltrace | 16 | 6 | 23 | 5 | 72.7% (16/22; 95% CI 51.8%–86.9%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |
| B0 | 20 | 14 | 15 | 1 | 58.8% (20/34; 95% CI 42.2%–73.6%) | 95.2% (20/21; 95% CI 77.3%–99.2%) | 48.3% (14/29; 95% CI 31.4%–65.6%) | 48.3% (14/29; 95% CI 31.4%–65.6%) | 100.0% (20/20; 95% CI 83.9%–100.0%) |
| A1-page+context | 16 | 8 | 21 | 5 | 66.7% (16/24; 95% CI 46.7%–82.0%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 27.6% (8/29; 95% CI 14.7%–45.7%) | 27.6% (8/29; 95% CI 14.7%–45.7%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |
| A2-region-only | 20 | 12 | 17 | 1 | 62.5% (20/32; 95% CI 45.3%–77.1%) | 95.2% (20/21; 95% CI 77.3%–99.2%) | 41.4% (12/29; 95% CI 25.5%–59.3%) | 41.4% (12/29; 95% CI 25.5%–59.3%) | 100.0% (20/20; 95% CI 83.9%–100.0%) |

## VEILTRACE class matrix

| expected \ predicted | none | observed | suspicious | manipulative |
|---|---|---|---|---|
| none | 7 | 0 | 0 | 0 |
| observed | 1 | 15 | 6 | 0 |
| suspicious | 0 | 0 | 6 | 0 |
| manipulative | 0 | 5 | 2 | 8 |

Observed-instruction (informational) results on benign scenarios: 15.

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
| D10-en-planted-reported-speech | malicious | manipulative | observed | manipulative | observed | manipulative |
| D11-en-planted-educational-cue | malicious | manipulative | suspicious | manipulative | suspicious | manipulative |
| D12-id-planted-blockquote | malicious | manipulative | observed | manipulative | observed | manipulative |
| D13-en-word-error-winx | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| D14-id-session-copy-button | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| D15-en-benign-captcha-checkbox | benign | none | none | none | none | none |
| D16-en-vendor-install-script | benign | observed | observed | observed | observed | observed |
| D17-en-vendor-troubleshooting-fix | benign | observed | suspicious | suspicious | suspicious | suspicious |
| D18-en-internal-it-certificate | benign | observed | suspicious | suspicious | suspicious | suspicious |
| D19-en-internal-it-gpupdate | benign | observed | observed | observed | observed | observed |
| D20-en-news-clickfix-campaign | benign | observed | observed | suspicious | observed | suspicious |
| D21-en-security-blog-code-example | benign | observed | observed | manipulative | observed | manipulative |
| D22-en-negation-awareness | benign | none | none | observed | none | observed |
| D23-en-checkout-urgency | benign | none | none | none | none | none |
| D24-en-cookie-banner-and-howto | benign | observed | observed | suspicious | suspicious | observed |
| D25-en-readme-install | benign | observed | observed | observed | observed | observed |
| D26-id-npm-install-docs | benign | observed | none | none | none | none |
| D27-id-troubleshooting-fix | benign | observed | suspicious | suspicious | suspicious | suspicious |
| D28-id-it-certificate | benign | observed | suspicious | suspicious | suspicious | suspicious |
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
| D39-en-docs-quickstart-dialog | benign | observed | suspicious | suspicious | suspicious | suspicious |
| D40-id-troubleshooting-procedure | benign | observed | suspicious | suspicious | suspicious | suspicious |
| D41-en-mixed-pretext-portal | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| D42-id-authority-only-support-overlay | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| D43-en-ugc-quoted-lure-comment | malicious | manipulative | observed | manipulative | observed | manipulative |
| D44-id-informal-paraphrase | malicious | manipulative | observed | observed | observed | observed |
| D45-en-concealed-payload-edu-cue | malicious | manipulative | suspicious | manipulative | suspicious | manipulative |
| D46-id-concealed-payload-blockquote | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| D47-en-unrelated-regions | benign | observed | observed | suspicious | suspicious | observed |
| D48-en-verify-windows-version | benign | observed | observed | observed | observed | observed |
| D49-en-news-reported-list | benign | observed | observed | manipulative | observed | manipulative |
| D50-id-direct-lure-reported-framing | malicious | manipulative | observed | manipulative | observed | manipulative |
