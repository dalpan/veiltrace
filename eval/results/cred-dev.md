# Credential detector: development results (cred-dev)

Detector cred-0.1.1-exp (EXPERIMENTAL), extractor 0.2.0-m5. DEVELOPMENT data only, written by the same author as the rules. Not a held-out evaluation; not real-world effectiveness.

TP 18 · FP 0 · TN 22 · FN 1

- Precision: 100.0% (18/18; 95% CI 82.4%–100.0%)
- Recall: 94.7% (18/19; 95% CI 75.4%–99.1%)
- Hard-negative FPR: 0.0% (0/22; 95% CI 0.0%–14.9%)
- Localization: 100.0% (18/18; 95% CI 82.4%–100.0%)
- Exact class agreement: 95.1% (39/41; 95% CI 83.9%–98.7%)
- Requests during scanning: 0; privacy sentinel leaks: 0 (26 fields filled)

## Class matrix

| expected \ predicted | none | observed | suspicious | manipulative |
|---|---|---|---|---|
| none | 5 | 0 | 0 | 0 |
| observed | 1 | 16 | 0 | 0 |
| suspicious | 0 | 0 | 3 | 0 |
| manipulative | 0 | 1 | 0 | 15 |

## Per scenario

| Scenario | Truth | Expected | Predicted | Findings | Loc. | ClickFix verdict |
|---|---|---|---|---|---|---|
| CA01-en-planted-tips-live-field | malicious | suspicious | suspicious | CR4:suspicious_correlation | ✓ | none |
| CA02-en-quoted-support-request | malicious | manipulative | observed | CR1:observed_instruction |  | none |
| CA03-id-parafrase-informal | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CA04-en-reported-framing-overlay | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CA05-en-split-inline-elements | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CA06-id-slang-kirimin-kode-wa | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CA07-id-slang-spill-otp | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CA08-id-slang-sebutin-angka-sms | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CD01-en-community-otp-reply | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CD02-en-chat-widget-backup-codes | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CD03-en-wallet-sync-seed | malicious | manipulative | manipulative | CR2:manipulative_instruction | ✓ | none |
| CD04-en-overlay-suspension-password-otp | malicious | suspicious | suspicious | CR4:suspicious_correlation | ✓ | none |
| CD05-id-form-akun-diblokir | malicious | suspicious | suspicious | CR4:suspicious_correlation | ✓ | none |
| CD06-id-komentar-admin-kirim-otp | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CD07-id-dompet-frasa-pemulihan | malicious | manipulative | manipulative | CR2:manipulative_instruction | ✓ | none |
| CD08-en-it-helpdesk-reply-password | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CD09-en-airdrop-claim-seed | malicious | manipulative | manipulative | CR2:manipulative_instruction | ✓ | none |
| CD10-id-cs-chat-pembatalan | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CD11-en-fraud-dept-tell-pin | malicious | manipulative | manipulative | CR1:manipulative_instruction | ✓ | none |
| CN01-en-login-form | benign | observed | observed | CR5:observed_instruction |  | none |
| CN02-en-mfa-code | benign | observed | observed | CR5:observed_instruction |  | none |
| CN03-id-ibanking-login | benign | observed | observed | CR5:observed_instruction |  | none |
| CN04-en-recovery-codes-help | benign | none | none |  |  | none |
| CN05-en-awareness-otp-scams | benign | observed | observed | CR1:observed_instruction |  | none |
| CN06-en-cli-api-token-docs | benign | observed | observed | CR5:observed_instruction |  | none |
| CN07-en-password-manager-help | benign | observed | observed | CR5:observed_instruction |  | none |
| CN08-en-html-forms-tutorial | benign | observed | observed | CR5:observed_instruction |  | none |
| CN09-id-edukasi-penipuan-otp | benign | observed | observed | CR1:observed_instruction |  | none |
| CN10-id-halaman-otp-bank | benign | observed | observed | CR5:observed_instruction |  | none |
| CN11-en-change-password | benign | observed | observed | CR5:observed_instruction |  | none |
| CN12-en-support-never-asks | benign | none | none |  |  | none |
| CN13-id-ganti-pin-ewallet | benign | observed | observed | CR5:observed_instruction |  | none |
| CN14-en-wallet-restore | benign | observed | observed | CR5:observed_instruction |  | none |
| CN15-en-forum-advice-never-post | benign | none | none |  |  | none |
| CN16-en-paywall-login-overlay | benign | observed | observed | CR5:observed_instruction |  | none |
| CN17-en-sso-other-origin | benign | observed | observed | CR5:observed_instruction |  | none |
| CN18-id-promo-login | benign | observed | observed | CR5:observed_instruction |  | none |
| CN19-en-new-signin-alert | benign | none | none |  |  | none |
| CN20-en-2fa-setup | benign | observed | observed | CR5:observed_instruction |  | none |
| CN21-id-slang-jangan-kasih-angka | benign | none | none |  |  | none |
| CN22-id-slang-masukin-kode-di-aplikasi | benign | observed | none |  |  | none |
