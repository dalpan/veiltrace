# Dev research variants (not the accepted model)

| System | TP | FP | TN | FN | Precision | Recall | FPR | Hard-neg FPR | Localization |
|---|---|---|---|---|---|---|---|---|---|
| veiltrace | 16 | 1 | 28 | 5 | 94.1% (16/17; 95% CI 73.0%–99.0%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 3.4% (1/29; 95% CI 0.6%–17.2%) | 3.4% (1/29; 95% CI 0.6%–17.2%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |
| veiltrace-m1 | 16 | 6 | 23 | 5 | 72.7% (16/22; 95% CI 51.8%–86.8%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |
| B0 | 20 | 14 | 15 | 1 | 58.8% (20/34; 95% CI 42.2%–73.6%) | 95.2% (20/21; 95% CI 77.3%–99.2%) | 48.3% (14/29; 95% CI 31.4%–65.6%) | 48.3% (14/29; 95% CI 31.4%–65.6%) | 100.0% (20/20; 95% CI 83.9%–100.0%) |
| A1-page+context | 16 | 8 | 21 | 5 | 66.7% (16/24; 95% CI 46.7%–82.0%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 27.6% (8/29; 95% CI 14.7%–45.7%) | 27.6% (8/29; 95% CI 14.7%–45.7%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |
| A2-region-only | 20 | 12 | 17 | 1 | 62.5% (20/32; 95% CI 45.3%–77.1%) | 95.2% (20/21; 95% CI 77.3%–99.2%) | 41.4% (12/29; 95% CI 25.5%–59.3%) | 41.4% (12/29; 95% CI 25.5%–59.3%) | 100.0% (20/20; 95% CI 83.9%–100.0%) |
| K=2 | 14 | 6 | 23 | 7 | 70.0% (14/20; 95% CI 48.1%–85.5%) | 66.7% (14/21; 95% CI 45.4%–82.8%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 100.0% (14/14; 95% CI 78.5%–100.0%) |
| K=4 | 16 | 6 | 23 | 5 | 72.7% (16/22; 95% CI 51.8%–86.8%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |
| K=6 | 16 | 6 | 23 | 5 | 72.7% (16/22; 95% CI 51.8%–86.8%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |
| K=8 | 16 | 6 | 23 | 5 | 72.7% (16/22; 95% CI 51.8%–86.8%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |
| K=12 | 16 | 6 | 23 | 5 | 72.7% (16/22; 95% CI 51.8%–86.8%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |
| K=16 | 16 | 6 | 23 | 5 | 72.7% (16/22; 95% CI 51.8%–86.8%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |
| K=∞ | 16 | 6 | 23 | 5 | 72.7% (16/22; 95% CI 51.8%–86.8%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |
| R4:minFamilies=2 | 13 | 0 | 29 | 8 | 100.0% (13/13; 95% CI 77.2%–100.0%) | 61.9% (13/21; 95% CI 40.9%–79.2%) | 0.0% (0/29; 95% CI 0.0%–11.7%) | 0.0% (0/29; 95% CI 0.0%–11.7%) | 100.0% (13/13; 95% CI 77.2%–100.0%) |
| R4:noAuthorityOnly | 15 | 4 | 25 | 6 | 78.9% (15/19; 95% CI 56.7%–91.5%) | 71.4% (15/21; 95% CI 50.0%–86.2%) | 13.8% (4/29; 95% CI 5.5%–30.6%) | 13.8% (4/29; 95% CI 5.5%–30.6%) | 100.0% (15/15; 95% CI 79.6%–100.0%) |
| MOD:noDemotionInDialogs | 19 | 8 | 21 | 2 | 70.4% (19/27; 95% CI 51.5%–84.1%) | 90.5% (19/21; 95% CI 71.1%–97.3%) | 27.6% (8/29; 95% CI 14.7%–45.7%) | 27.6% (8/29; 95% CI 14.7%–45.7%) | 100.0% (19/19; 95% CI 83.2%–100.0%) |
| COMBINED | 18 | 6 | 23 | 3 | 75.0% (18/24; 95% CI 55.1%–88.0%) | 85.7% (18/21; 95% CI 65.4%–95.0%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 20.7% (6/29; 95% CI 9.8%–38.4%) | 100.0% (18/18; 95% CI 82.4%–100.0%) |
| coarse-containers | 16 | 8 | 21 | 5 | 66.7% (16/24; 95% CI 46.7%–82.0%) | 76.2% (16/21; 95% CI 54.9%–89.4%) | 27.6% (8/29; 95% CI 14.7%–45.7%) | 27.6% (8/29; 95% CI 14.7%–45.7%) | 100.0% (16/16; 95% CI 80.6%–100.0%) |

## Verdict changes vs veiltrace-m1 (M1 baseline)

- **K=2**: D02-id-download-modal-after-click: manipulative_instruction → observed_instruction; D03-en-locked-pc-support-scam: suspicious_correlation → observed_instruction; D44-id-informal-paraphrase: observed_instruction → none
- **K=4**: D02-id-download-modal-after-click: manipulative_instruction → suspicious_correlation
- **K=6**: no change
- **K=8**: no change
- **K=12**: no change
- **K=16**: no change
- **K=∞**: no change
- **R4:minFamilies=2**: D13-en-word-error-winx: suspicious_correlation → observed_instruction; D14-id-session-copy-button: suspicious_correlation → observed_instruction; D17-en-vendor-troubleshooting-fix: suspicious_correlation → observed_instruction; D18-en-internal-it-certificate: suspicious_correlation → observed_instruction; D27-id-troubleshooting-fix: suspicious_correlation → observed_instruction; D28-id-it-certificate: suspicious_correlation → observed_instruction; D39-en-docs-quickstart-dialog: suspicious_correlation → observed_instruction; D40-id-troubleshooting-procedure: suspicious_correlation → observed_instruction; D42-id-authority-only-support-overlay: suspicious_correlation → observed_instruction
- **R4:noAuthorityOnly**: D18-en-internal-it-certificate: suspicious_correlation → observed_instruction; D28-id-it-certificate: suspicious_correlation → observed_instruction; D42-id-authority-only-support-overlay: suspicious_correlation → observed_instruction
- **MOD:noDemotionInDialogs**: D10-en-planted-reported-speech: observed_instruction → manipulative_instruction; D11-en-planted-educational-cue: suspicious_correlation → manipulative_instruction; D12-id-planted-blockquote: observed_instruction → manipulative_instruction; D37-en-security-tutorial-modal: observed_instruction → manipulative_instruction; D38-en-security-quiz-modal: observed_instruction → manipulative_instruction; D45-en-concealed-payload-edu-cue: suspicious_correlation → manipulative_instruction; D50-id-direct-lure-reported-framing: observed_instruction → manipulative_instruction
- **COMBINED**: D10-en-planted-reported-speech: observed_instruction → manipulative_instruction; D11-en-planted-educational-cue: suspicious_correlation → manipulative_instruction; D12-id-planted-blockquote: observed_instruction → manipulative_instruction; D18-en-internal-it-certificate: suspicious_correlation → observed_instruction; D28-id-it-certificate: suspicious_correlation → observed_instruction; D37-en-security-tutorial-modal: observed_instruction → manipulative_instruction; D38-en-security-quiz-modal: observed_instruction → manipulative_instruction; D42-id-authority-only-support-overlay: suspicious_correlation → observed_instruction; D45-en-concealed-payload-edu-cue: suspicious_correlation → manipulative_instruction; D50-id-direct-lure-reported-framing: observed_instruction → manipulative_instruction
- **coarse-containers**: D24-en-cookie-banner-and-howto: observed_instruction → suspicious_correlation; D47-en-unrelated-regions: observed_instruction → suspicious_correlation
