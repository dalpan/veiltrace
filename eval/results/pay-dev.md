# Payment detector: development results (pay-dev)

Detector pay-0.1.0-exp (EXPERIMENTAL), extractor 0.2.0-m5. DEVELOPMENT data only, written by the same author as the rules. Not a held-out evaluation; not real-world effectiveness.

TP 10 · FP 0 · TN 16 · FN 1

- Precision: 100.0% (10/10; 95% CI 72.2%–100.0%)
- Recall: 90.9% (10/11; 95% CI 62.3%–98.4%)
- Hard-negative FPR: 0.0% (0/16; 95% CI 0.0%–19.4%)
- Localization: 100.0% (10/10; 95% CI 72.2%–100.0%)
- Exact class agreement: 92.6% (25/27; 95% CI 76.6%–97.9%)
- Requests during scanning: 0; privacy sentinel leaks: 0 (3 fields filled)

## Class matrix

| expected \ predicted | none | observed | suspicious | manipulative |
|---|---|---|---|---|
| none | 2 | 0 | 0 | 0 |
| observed | 1 | 13 | 0 | 0 |
| suspicious | 0 | 0 | 1 | 0 |
| manipulative | 1 | 0 | 0 | 9 |

## Per scenario

| Scenario | Truth | Expected | Predicted | Findings | Loc. | ClickFix | Credential |
|---|---|---|---|---|---|---|---|
| PA01-id-slang-tf-buka-akun | malicious | manipulative | none |  |  | none | none |
| PD01-en-chat-refund-release-fee | malicious | manipulative | manipulative | PR1:manipulative_instruction | ✓ | none | none |
| PD02-id-undian-pajak-hadiah | malicious | manipulative | manipulative | PR1:manipulative_instruction | ✓ | none | none |
| PD03-id-overlay-akun-diblokir-biaya-verifikasi | malicious | manipulative | manipulative | PR1:manipulative_instruction | ✓ | none | none |
| PD04-en-tax-office-gift-cards | malicious | manipulative | manipulative | PR2:manipulative_instruction | ✓ | none | none |
| PD05-id-marketplace-chat-transfer-di-luar-aplikasi | malicious | suspicious | suspicious | PR4:observed_instruction, PR2:suspicious_correlation | ✓ | none | none |
| PD06-en-police-arrest-fine | malicious | manipulative | manipulative | PR2:manipulative_instruction | ✓ | none | none |
| PD07-en-forum-crypto-recovery-fee | malicious | manipulative | manipulative | PR1:manipulative_instruction | ✓ | none | none |
| PD08-id-kurir-paket-tertahan-bea-cukai | malicious | manipulative | manipulative | PR1:manipulative_instruction | ✓ | none | none |
| PD09-en-account-locked-unlock-fee | malicious | manipulative | manipulative | PR1:manipulative_instruction | ✓ | none | none |
| PD10-id-cs-palsu-komentar-refund | malicious | manipulative | manipulative | PR2:manipulative_instruction | ✓ | none | none |
| PN01-en-checkout | benign | observed | observed | PR4:observed_instruction, PR4:observed_instruction |  | none | none |
| PN02-id-checkout-virtual-account | benign | observed | observed | PR4:observed_instruction |  | none | none |
| PN03-en-invoice | benign | observed | observed | PR4:observed_instruction |  | none | none |
| PN04-id-tagihan-listrik | benign | observed | observed | PR4:observed_instruction |  | none | none |
| PN05-en-donation | benign | observed | observed | PR4:observed_instruction |  | none | none |
| PN06-id-donasi-yayasan | benign | observed | observed | PR4:observed_instruction |  | none | none |
| PN07-en-news-refund-scam | benign | observed | observed | PR1:observed_instruction |  | none | none |
| PN08-id-berita-penipuan-undian | benign | observed | observed | PR1:observed_instruction |  | none | none |
| PN09-en-awareness-payment-scams | benign | observed | observed | PR1:observed_instruction |  | none | none |
| PN10-id-edukasi-penipuan-kurir | benign | observed | none |  |  | none | none |
| PN11-en-return-policy | benign | observed | observed | PR4:observed_instruction |  | none | none |
| PN12-id-ewallet-topup-cashback | benign | observed | observed | PR4:observed_instruction |  | none | none |
| PN13-en-gift-card-store | benign | observed | observed | PR4:observed_instruction |  | none | none |
| PN14-en-bank-transfer-help | benign | observed | observed | PR4:observed_instruction |  | none | none |
| PN15-id-bantuan-marketplace-rekber | benign | none | none |  |  | none | none |
| PN16-en-legit-prize-no-fee | benign | none | none |  |  | none | none |
