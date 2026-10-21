# Evaluation: test split

Engine 0.2.0, extractor 0.1.0-m2. Synthetic fixtures; **not** real-world effectiveness.

Composition: category:adversarial=3, category:ambiguous=2, category:benign=12, category:positive=9, hardNegative=14, lang:en=15, lang:id=11, total=26, truth:benign=14, truth:malicious=12

## Systems

| System | TP | FP | TN | FN | Precision | Recall | FPR | Hard-neg FPR | Localization |
|---|---|---|---|---|---|---|---|---|---|
| veiltrace | 9 | 2 | 12 | 3 | 81.8% (9/11; 95% CI 52.3%–94.9%) | 75.0% (9/12; 95% CI 46.8%–91.1%) | 14.3% (2/14; 95% CI 4.0%–39.9%) | 14.3% (2/14; 95% CI 4.0%–39.9%) | 100.0% (9/9; 95% CI 70.1%–100.0%) |
| veiltrace-m1 | 9 | 2 | 12 | 3 | 81.8% (9/11; 95% CI 52.3%–94.9%) | 75.0% (9/12; 95% CI 46.8%–91.1%) | 14.3% (2/14; 95% CI 4.0%–39.9%) | 14.3% (2/14; 95% CI 4.0%–39.9%) | 100.0% (9/9; 95% CI 70.1%–100.0%) |
| B0 | 11 | 4 | 10 | 1 | 73.3% (11/15; 95% CI 48.0%–89.1%) | 91.7% (11/12; 95% CI 64.6%–98.5%) | 28.6% (4/14; 95% CI 11.7%–54.6%) | 28.6% (4/14; 95% CI 11.7%–54.6%) | 100.0% (11/11; 95% CI 74.1%–100.0%) |
| A1-page+context | 9 | 3 | 11 | 3 | 75.0% (9/12; 95% CI 46.8%–91.1%) | 75.0% (9/12; 95% CI 46.8%–91.1%) | 21.4% (3/14; 95% CI 7.6%–47.6%) | 21.4% (3/14; 95% CI 7.6%–47.6%) | 100.0% (9/9; 95% CI 70.1%–100.0%) |
| A2-region-only | 11 | 3 | 11 | 1 | 78.6% (11/14; 95% CI 52.4%–92.4%) | 91.7% (11/12; 95% CI 64.6%–98.5%) | 21.4% (3/14; 95% CI 7.6%–47.6%) | 21.4% (3/14; 95% CI 7.6%–47.6%) | 100.0% (11/11; 95% CI 74.1%–100.0%) |

## VEILTRACE class matrix

| expected \ predicted | none | observed | suspicious | manipulative |
|---|---|---|---|---|
| none | 5 | 0 | 0 | 0 |
| observed | 0 | 7 | 2 | 0 |
| suspicious | 0 | 0 | 3 | 0 |
| manipulative | 1 | 2 | 0 | 6 |

Observed-instruction (informational) results on benign scenarios: 7.

Requests during scanning: 0. Partial scans: T12-en-cross-origin-ad-iframe (frames-skipped).

Latency is machine-specific and kept out of this file: see `test.perf.json` (not committed).

## Per scenario

| Scenario | Truth | Expected | VEILTRACE | B0 | A1 page+context | A2 region-only |
|---|---|---|---|---|---|---|
| T01-en-recipe-captcha-overlay | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| T02-id-news-dialog-captcha | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| T03-en-fake-defender-support | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| T04-id-font-update-modal | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| T05-en-forum-comment-ugc | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| T06-id-bank-help-injected-widget | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| T07-en-macos-document-gate | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| T08-en-obfuscated-split-spans | malicious | manipulative | manipulative | manipulative | manipulative | manipulative |
| T09-en-quote-markup-abuse | malicious | manipulative | observed | manipulative | observed | manipulative |
| T10-id-reported-speech-abuse | malicious | manipulative | observed | manipulative | observed | manipulative |
| T11-en-session-restore-urgency | malicious | suspicious | suspicious | suspicious | suspicious | suspicious |
| T12-en-cross-origin-ad-iframe | malicious | manipulative | none | none | none | none |
| T13-en-real-captcha-interstitial | benign | none | none | none | none | none |
| T14-en-cli-install-docs | benign | observed | observed | observed | observed | observed |
| T15-id-library-install-docs | benign | observed | observed | observed | observed | observed |
| T16-en-it-map-network-drive | benign | observed | observed | observed | observed | observed |
| T17-id-it-vpn-fix | benign | observed | suspicious | suspicious | suspicious | suspicious |
| T18-en-news-report-fake-captcha | benign | observed | suspicious | manipulative | suspicious | manipulative |
| T19-id-news-report-modus | benign | observed | observed | observed | observed | observed |
| T20-en-awareness-negation | benign | none | none | observed | none | observed |
| T21-id-flash-sale | benign | none | none | none | none | none |
| T22-id-bank-otp-warning | benign | none | none | none | none | none |
| T23-en-qa-execution-policy | benign | observed | observed | observed | observed | observed |
| T24-id-security-blog-code-example | benign | observed | observed | manipulative | observed | manipulative |
| T25-en-wiki-banner-and-howto | benign | observed | observed | suspicious | suspicious | observed |
| T26-id-browser-game | benign | none | none | none | none | none |
