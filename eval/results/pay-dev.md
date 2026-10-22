# Payment detector: development results (pay-dev)

Detector pay-0.5.0-exp (EXPERIMENTAL), extractor 0.3.0. DEVELOPMENT data only, written by the same author as the rules. Not a held-out evaluation; not real-world effectiveness.

TP 19 · FP 0 · TN 25 · FN 0

- Precision: 100.0% (19/19; 95% CI 83.2%–100.0%)
- Recall: 100.0% (19/19; 95% CI 83.2%–100.0%)
- Hard-negative FPR: 0.0% (0/25; 95% CI 0.0%–13.3%)
- Localization: 100.0% (19/19; 95% CI 83.2%–100.0%)
- Exact class agreement: 93.2% (41/44; 95% CI 81.8%–97.7%)
- Requests during scanning: 0; privacy sentinel leaks: 0 (3 fields filled)

## Class matrix

| expected \ predicted | none | observed | suspicious | manipulative |
|---|---|---|---|---|
| none | 6 | 0 | 0 | 0 |
| observed | 3 | 16 | 0 | 0 |
| suspicious | 0 | 0 | 2 | 0 |
| manipulative | 0 | 0 | 0 | 17 |

## Per scenario

| Scenario | Truth | Expected | Predicted | Findings | Loc. | ClickFix | Credential |
|---|---|---|---|---|---|---|---|
| PA01-id-slang-tf-buka-akun | malicious | manipulative | manipulative | PR2:manipulative_instruction | ✓ | none | none |
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
| PD11-id-realistic-chat-slang-admin-fee | malicious | manipulative | manipulative | PR1:manipulative_instruction | ✓ | none | none |
| PD12-en-realistic-parcel-customs-fee | malicious | manipulative | manipulative | PR1:manipulative_instruction | ✓ | none | none |
| PD13-id-rekrutmen-jalur-khusus | malicious | manipulative | manipulative | PR1:manipulative_instruction | ✓ | none | none |
| PD14-id-catut-dandim-dana-kegiatan | malicious | manipulative | manipulative | PR2:manipulative_instruction | ✓ | none | none |
| PD15-id-wa-lowongan-seragam-ewallet | malicious | manipulative | manipulative | PR1:manipulative_instruction | ✓ | none | none |
| PD16-id-email-kerja-tanpa-interview-biaya-admin | malicious | manipulative | manipulative | PR1:manipulative_instruction | ✓ | none | none |
| PD17-id-sms-nomor-baru-minta-pulsa | malicious | manipulative | manipulative | PR2:manipulative_instruction | ✓ | none | none |
| PD18-id-sms-pembayaran-dikuasakan | malicious | suspicious | suspicious | PR2:suspicious_correlation | ✓ | none | none |
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
| PN17-id-realistic-checkout-virtual-account | benign | observed | none |  |  | none | none |
| PN18-en-realistic-donation-campaign | benign | observed | none |  |  | none | none |
| PN19-id-pengumuman-rekrutmen-resmi | benign | none | none |  |  | none | none |
| PN20-id-berita-penipuan-rekrutmen | benign | observed | observed | PR1:observed_instruction |  | none | none |
| PN21-id-lowongan-resmi-tanpa-biaya | benign | none | none |  |  | none | none |
| PN22-id-pelatihan-biaya-pendaftaran | benign | observed | observed | PR4:observed_instruction |  | none | none |
| PN23-id-wa-undangan-interview-hrd | benign | none | none |  |  | none | none |
| PN24-id-sms-nomor-baru-tanpa-permintaan | benign | none | none |  |  | none | none |
| PN25-id-sms-tagihan-sewa-rekening-perusahaan | benign | observed | observed | PR4:observed_instruction |  | none | none |
