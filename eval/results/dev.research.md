# Dev research variants (not the accepted model)

| System | TP | FP | TN | FN | Precision | Recall | FPR | Hard-neg FPR | Localization |
|---|---|---|---|---|---|---|---|---|---|
| veiltrace | 12 | 4 | 18 | 2 | 75.0% (12/16; 95% CI 50.5%–89.8%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |
| B0 | 14 | 8 | 14 | 0 | 63.6% (14/22; 95% CI 43.0%–80.3%) | 100.0% (14/14; 95% CI 78.5%–100.0%) | 36.4% (8/22; 95% CI 19.7%–57.0%) | 36.4% (8/22; 95% CI 19.7%–57.0%) | 100.0% (14/14; 95% CI 78.5%–100.0%) |
| A1-page+context | 12 | 5 | 17 | 2 | 70.6% (12/17; 95% CI 46.9%–86.7%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 22.7% (5/22; 95% CI 10.1%–43.4%) | 22.7% (5/22; 95% CI 10.1%–43.4%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |
| A2-region-only | 14 | 7 | 15 | 0 | 66.7% (14/21; 95% CI 45.4%–82.8%) | 100.0% (14/14; 95% CI 78.5%–100.0%) | 31.8% (7/22; 95% CI 16.4%–52.7%) | 31.8% (7/22; 95% CI 16.4%–52.7%) | 100.0% (14/14; 95% CI 78.5%–100.0%) |
| K=2 | 10 | 4 | 18 | 4 | 71.4% (10/14; 95% CI 45.4%–88.3%) | 71.4% (10/14; 95% CI 45.4%–88.3%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 100.0% (10/10; 95% CI 72.3%–100.0%) |
| K=4 | 12 | 4 | 18 | 2 | 75.0% (12/16; 95% CI 50.5%–89.8%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |
| K=6 | 12 | 4 | 18 | 2 | 75.0% (12/16; 95% CI 50.5%–89.8%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |
| K=8 | 12 | 4 | 18 | 2 | 75.0% (12/16; 95% CI 50.5%–89.8%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |
| K=12 | 12 | 4 | 18 | 2 | 75.0% (12/16; 95% CI 50.5%–89.8%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |
| K=16 | 12 | 4 | 18 | 2 | 75.0% (12/16; 95% CI 50.5%–89.8%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |
| K=∞ | 12 | 4 | 18 | 2 | 75.0% (12/16; 95% CI 50.5%–89.8%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |
| R4:minFamilies=2 | 10 | 0 | 22 | 4 | 100.0% (10/10; 95% CI 72.3%–100.0%) | 71.4% (10/14; 95% CI 45.4%–88.3%) | 0.0% (0/22; 95% CI 0.0%–14.9%) | 0.0% (0/22; 95% CI 0.0%–14.9%) | 100.0% (10/10; 95% CI 72.3%–100.0%) |
| R4:noAuthorityOnly | 12 | 2 | 20 | 2 | 85.7% (12/14; 95% CI 60.1%–96.0%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 9.1% (2/22; 95% CI 2.5%–27.8%) | 9.1% (2/22; 95% CI 2.5%–27.8%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |
| MOD:noDemotionInDialogs | 14 | 4 | 18 | 0 | 77.8% (14/18; 95% CI 54.8%–91.0%) | 100.0% (14/14; 95% CI 78.5%–100.0%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 18.2% (4/22; 95% CI 7.3%–38.5%) | 100.0% (14/14; 95% CI 78.5%–100.0%) |
| COMBINED | 14 | 2 | 20 | 0 | 87.5% (14/16; 95% CI 64.0%–96.5%) | 100.0% (14/14; 95% CI 78.5%–100.0%) | 9.1% (2/22; 95% CI 2.5%–27.8%) | 9.1% (2/22; 95% CI 2.5%–27.8%) | 100.0% (14/14; 95% CI 78.5%–100.0%) |
| coarse-containers | 12 | 5 | 17 | 2 | 70.6% (12/17; 95% CI 46.9%–86.7%) | 85.7% (12/14; 95% CI 60.1%–96.0%) | 22.7% (5/22; 95% CI 10.1%–43.4%) | 22.7% (5/22; 95% CI 10.1%–43.4%) | 100.0% (12/12; 95% CI 75.8%–100.0%) |

## Verdict changes vs VEILTRACE (M1)

- **K=2**: D02-id-download-modal-after-click: manipulative_instruction → observed_instruction; D03-en-locked-pc-support-scam: suspicious_correlation → observed_instruction
- **K=4**: D02-id-download-modal-after-click: manipulative_instruction → suspicious_correlation
- **K=6**: no change
- **K=8**: no change
- **K=12**: no change
- **K=16**: no change
- **K=∞**: no change
- **R4:minFamilies=2**: D13-en-word-error-winx: suspicious_correlation → observed_instruction; D14-id-session-copy-button: suspicious_correlation → observed_instruction; D17-en-vendor-troubleshooting-fix: suspicious_correlation → observed_instruction; D18-en-internal-it-certificate: suspicious_correlation → observed_instruction; D27-id-troubleshooting-fix: suspicious_correlation → observed_instruction; D28-id-it-certificate: suspicious_correlation → observed_instruction
- **R4:noAuthorityOnly**: D18-en-internal-it-certificate: suspicious_correlation → observed_instruction; D28-id-it-certificate: suspicious_correlation → observed_instruction
- **MOD:noDemotionInDialogs**: D10-en-planted-reported-speech: observed_instruction → manipulative_instruction; D11-en-planted-educational-cue: suspicious_correlation → manipulative_instruction; D12-id-planted-blockquote: observed_instruction → manipulative_instruction
- **COMBINED**: D10-en-planted-reported-speech: observed_instruction → manipulative_instruction; D11-en-planted-educational-cue: suspicious_correlation → manipulative_instruction; D12-id-planted-blockquote: observed_instruction → manipulative_instruction; D18-en-internal-it-certificate: suspicious_correlation → observed_instruction; D28-id-it-certificate: suspicious_correlation → observed_instruction
- **coarse-containers**: D24-en-cookie-banner-and-howto: observed_instruction → suspicious_correlation
