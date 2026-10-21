# Evaluation: dev split

Engine 0.1.0-m1, extractor 0.1.0-m2. Synthetic fixtures; **not** real-world effectiveness.

Composition: category:adversarial=3, category:ambiguous=1, category:benign=21, category:positive=11, hardNegative=22, lang:en=20, lang:id=16, total=36, truth:benign=22, truth:malicious=14

## Systems

| System | TP | FP | TN | FN | Precision | Recall | FPR | Hard-neg FPR | Localization |
|---|---|---|---|---|---|---|---|---|---|
| veiltrace | 12 | 4 | 18 | 2 | 75.0% (12/16; 95% CI 50.5%–89.8%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |
| B0 | 14 | 8 | 14 | 0 | 63.6% (14/22; 95% CI 43.0%–80.3%) | 100.0% (14/14; 95% CI 78.5%–100.0%) | 36.4% (8/22; 95% CI 19.7%–57.0%) | 36.4% (8/22; 95% CI 19.7%–57.0%) | 100.0% (14/14; 95% CI 78.5%–100.0%) |
| A1-page+context | 12 | 5 | 17 | 2 | 70.6% (12/17; 95% CI 46.9%–86.7%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 22.7% (5/22; 95% CI 10.1%–43.4%) | 22.7% (5/22; 95% CI 10.1%–43.4%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |
| A2-region-only | 14 | 7 | 15 | 0 | 66.7% (14/21; 95% CI 45.4%–82.8%) | 100.0% (14/14; 95% CI 78.5%–100.0%) | 31.8% (7/22; 95% CI 16.4%–52.7%) | 31.8% (7/22; 95% CI 16.4%–52.7%) | 100.0% (14/14; 95% CI 78.5%–100.0%) |

## VEILTRACE class matrix

| expected \ predicted | none | observed | suspicious | manipulative |
|---|---|---|---|---|
| none | 7 | 0 | 0 | 0 |
| observed | 1 | 10 | 4 | 0 |
| suspicious | 0 | 0 | 4 | 0 |
| manipulative | 0 | 2 | 1 | 7 |

Observed-instruction (informational) results on benign scenarios: 10.

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
