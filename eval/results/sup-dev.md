# Support-impersonation detector: development results (sup-dev)

Detector sup-0.2.0-exp (EXPERIMENTAL), extractor 0.2.0-m5. DEVELOPMENT data only, written by the same author as the rules. Not a held-out evaluation; not real-world effectiveness.

TP 14 · FP 0 · TN 17 · FN 0

- Precision: 100.0% (14/14; 95% CI 78.5%–100.0%)
- Recall: 100.0% (14/14; 95% CI 78.5%–100.0%)
- Hard-negative FPR: 0.0% (0/17; 95% CI 0.0%–18.4%)
- Localization: 100.0% (14/14; 95% CI 78.5%–100.0%)
- Exact class agreement: 96.8% (30/31; 95% CI 83.8%–99.4%)
- Requests during scanning: 0; privacy sentinel leaks: 0 (0 fields filled); phone numbers or digit runs in results: 0

## Class matrix

| expected \ predicted | none | observed | suspicious | manipulative |
|---|---|---|---|---|
| none | 3 | 0 | 0 | 0 |
| observed | 1 | 13 | 0 | 0 |
| suspicious | 0 | 0 | 2 | 0 |
| manipulative | 0 | 0 | 0 | 12 |

## Per scenario

| Scenario | Truth | Expected | Predicted | Findings | Loc. | ClickFix | Credential | Payment |
|---|---|---|---|---|---|---|---|---|
| SA01-id-singkatan-ekstrem | malicious | manipulative | manipulative | SR4:manipulative_instruction | ✓ | none | none | none |
| SA02-en-alert-unusual-wording | malicious | manipulative | manipulative | SR1:manipulative_instruction | ✓ | none | none | none |
| SD01-en-fake-virus-overlay-call | malicious | manipulative | manipulative | SR1:manipulative_instruction | ✓ | none | none | none |
| SD02-id-peringatan-virus-hp-instal-aplikasi | malicious | manipulative | manipulative | SR1:manipulative_instruction | ✓ | none | none | none |
| SD03-en-bank-fraud-anydesk | malicious | manipulative | manipulative | SR2:manipulative_instruction | ✓ | none | none | none |
| SD04-id-cs-palsu-wa-akun-diblokir | malicious | manipulative | manipulative | SR3:manipulative_instruction | ✓ | none | none | none |
| SD05-en-forum-official-support-telegram | malicious | suspicious | suspicious | SR4:suspicious_correlation | ✓ | none | none | none |
| SD06-id-komentar-admin-informal-japri | malicious | manipulative | manipulative | SR3:manipulative_instruction | ✓ | none | none | none |
| SD07-id-kurir-apk-informal | malicious | suspicious | suspicious | SR2:suspicious_correlation | ✓ | none | none | none |
| SD08-en-chat-widget-it-admin-remote | malicious | manipulative | manipulative | SR2:manipulative_instruction | ✓ | none | none | none |
| SD09-en-browser-locked-fullpage | malicious | manipulative | manipulative | SR1:manipulative_instruction | ✓ | none | none | none |
| SD10-id-tim-it-anydesk-informal | malicious | manipulative | manipulative | SR2:manipulative_instruction | ✓ | none | none | none |
| SD11-en-realistic-blue-alert-zeus | malicious | manipulative | manipulative | SR1:manipulative_instruction | ✓ | none | none | none |
| SD12-id-realistic-bank-chat-remote-app | malicious | manipulative | manipulative | SR2:manipulative_instruction | ✓ | none | none | none |
| SN01-en-help-center-contact | benign | observed | observed | SR5:observed_instruction |  | none | none | none |
| SN02-id-pusat-bantuan-kontak | benign | observed | observed | SR5:observed_instruction |  | none | none | none |
| SN03-en-it-helpdesk-remote-procedure | benign | observed | observed | SR5:observed_instruction |  | none | none | none |
| SN04-id-bank-notifikasi-blokir-call-center | benign | observed | observed | SR5:observed_instruction |  | none | none | none |
| SN05-en-antivirus-help-hypothetical | benign | observed | observed | SR5:observed_instruction |  | none | none | none |
| SN06-en-news-tech-support-scam | benign | observed | observed | SR1:observed_instruction |  | none | none | none |
| SN07-id-berita-penipuan-cs-palsu | benign | observed | observed | SR3:observed_instruction |  | none | none | none |
| SN08-en-awareness-fake-support | benign | observed | none |  |  | none | none | none |
| SN09-id-edukasi-modus-anydesk | benign | observed | observed | SR5:observed_instruction |  | none | none | none |
| SN10-en-browser-warning-docs | benign | none | none |  |  | none | none | none |
| SN11-id-marketplace-penjual-wa | benign | observed | observed | SR5:observed_instruction |  | none | none | none |
| SN12-en-moderator-help-center | benign | none | none |  |  | none | none | none |
| SN13-en-signin-alert-legit | benign | observed | observed | SR5:observed_instruction |  | none | none | none |
| SN14-id-teknisi-jadwal-servis | benign | none | none |  |  | none | none | none |
| SN15-en-desktop-app-download | benign | observed | observed | SR5:observed_instruction |  | none | none | none |
| SN16-en-realistic-antivirus-product-page | benign | observed | observed | SR5:observed_instruction |  | none | none | none |
| SN17-id-realistic-isp-help-whatsapp | benign | observed | observed | SR5:observed_instruction |  | none | none | none |
