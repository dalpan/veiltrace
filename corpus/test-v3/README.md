# corpus/test-v3: blind held-out scenario set

80 small, self-contained, static HTML scenarios of social-engineering manipulation (malicious) and look-alike legitimate content (benign hard negatives). Each scenario directory contains `index.html` and `label.json`.

## How it was authored

- Written on 2026-10-22 by an independent test-author agent (Claude). The author was **blind** to the tool: it did not open, read, search or list any file in the repository outside `corpus/test-v3/`, ran no project commands, and saw no rules, lexicons, documentation, prior corpora or evaluation results.
- Scenario content is based on the author's general knowledge plus brief research into public reporting on 2022–2026 scam patterns in Indonesia and worldwide. All wording was paraphrased and invented; nothing was copied verbatim. No live scam or phishing URL or file was visited.
- Research sources consulted (reputable news, bank, government and security-vendor pages, reviewed through web-search summaries; pages were not fetched in full):
  - https://www.bca.co.id/id/informasi/awas-modus/2022/12/14/10/11/waspadai-penipuan-dengan-modus-kurir-paket-yang-mengirimkan-file-apk
  - https://djpb.kemenkeu.go.id/kppn/wates/id/data-publikasi/berita-terbaru/3069-phising-penipuan-undangan-apk-paket.html
  - https://finance.detik.com/moneter/d-6576001/hati-hati-modus-penipuan-undangan-nikah-bisa-kuras-rekening
  - https://www.kompas.tv/saintek/484267/waspada-penipuan-file-apk-dengan-modus-undangan-pemilu-dan-pps-pemilu-2024
  - https://investortrust.id/financial/82718/ojk-berhasil-selamatkan-dana-rp-376-8-miliar-dari-scam-masyarakat-wajib-waspadai-10-modus-ini
  - https://infobanknews.com/waspadai-empat-modus-pembobolan-rekening-lewat-social-engineering/
  - https://keuangan.kontan.co.id/news/modus-kejahatan-di-sektor-jasa-keuangan-makin-kompleks-ojk-upayakan-hal-ini
  - https://finance.detik.com/fintech/d-7838812/waspada-penipuan-online-jelang-idul-fitri-begini-cara-hindarinya
  - https://keuangan.kontan.co.id/news/bri-himbau-nasabah-waspadai-link-palsu-kenaikan-tarif-transaksi
  - https://momsmoney.kontan.co.id/news/waspada-bca-pastikan-informasi-transfer-gratis-antar-bank-adalah-aksi-penipuan
  - https://kabar24.bisnis.com/read/20221123/16/1601293/polri-bongkar-modus-penipuan-berkedok-perubahan-tarif-transfer-bri
  - https://www.ocbc.id/id/article/2025/01/17/modus-penipuan-berkedok-lowongan-pekerjaan
  - https://www.kompas.tv/info-publik/665037/ciri-ciri-penipuan-misi-berbayar-di-telegram-dan-cara-menghindarinya
  - https://finance.detik.com/fintech/d-6794854/marak-penipuan-berkedok-loker-via-wa-begini-modusnya
  - https://finance.detik.com/berita-ekonomi-bisnis/d-7533469/catat-5-modus-penipuan-atas-nama-bea-cukai-ada-asmara-online-shop
  - https://news.ddtc.co.id/berita/nasional/1806710/jangan-terkecoh-kenali-5-modus-penipuan-yang-catut-nama-bea-cukai
  - https://www.idxchannel.com/economics/marak-penipuan-toko-online-fiktif-dan-petugas-bea-cukai-gadungan-pelajari-modusnya/all
  - https://finance.detik.com/fintech/d-7485214/awasjebakanbadman-dana-imbau-pengguna-tak-terjebak-link-palsu-dana-kaget
  - https://momsmoney.kontan.co.id/news/cara-mengenal-dan-menghindari-penipuan-mengatasnamakan-customer-service-dana-1
  - https://www.csoonline.com/article/3610611/rising-clickfix-malware-distribution-trick-puts-powershell-it-policies-on-notice.html
  - https://www.varonis.com/blog/decoding-clickfix
  - https://www.tomsguide.com/computing/online-security/hackers-target-popular-student-site-iclicker-to-spread-malware-via-clickfix-attacks-how-to-stay-safe
  - https://www.sans.org/newsletters/newsbites/xxvii-22
  - https://consumer.ftc.gov/blog/2019/10/ftc-refunds-real-deal-or-not
  - https://www.consumer.ftc.gov/blog/2018/04/ftc-asking-access-your-computer-its-scam
  - https://www.techspot.com/news/69308-ftc-cracks-down-tech-support-scammers.html
- Labels (`truth`, `expectedClass`, `evidenceWithin`) reflect the author's own judgement of each scenario, made without knowledge of how the tool decides.

## Safety and defanging

- All links point to `*.example.invalid` (in page content) or `*.test` (scenario URLs). Phone numbers use `0000` blocks; account numbers and wallet addresses are fictional.
- Commands in `cmd` scenarios point only to `.example.invalid` hosts and are not working malware.
- Static HTML with inline CSS only. Four scenarios contain a tiny inline script that reveals hidden content on click (listed in `steps`); no script makes a network request.
- Every page carries the footer "Skenario uji fiktif · VeilTrace test-v3".
- Real Indonesian and international brand or institution names appear only as the *impersonated* sender inside scam text, as in real campaigns; benign organizations are fictional.

## Counts

| threatCategory | malicious | benign | total |
|---|---|---|---|
| cmd  | 11 | 9 | 20 |
| cred | 12 | 8 | 20 |
| pay  | 11 | 9 | 20 |
| sup  | 11 | 9 | 20 |
| **total** | **45** | **35** | **80** |

- Language: 52 Indonesian (`id`), 28 English (`en`).
- Context: 47 `message` (chat with `role="log"` and `message-in`/`message-out` bubbles, SMS threads, webmail reading pane), 33 `page`.
- expectedClass: 41 `manipulative_instruction`, 4 `suspicious_correlation`, 20 `observed_instruction`, 15 `none`.
- All 35 benign scenarios are hard negatives (`hardNegative: true`).

## Known limitations

- Single author: wording, layout and markup conventions (chat/SMS/mail templates) are shared across scenarios and reflect one writer's style, which may be more uniform than real-world pages.
- Synthetic and short: real pages are larger, noisier, use images, obfuscation, dynamic loading and real brand styling; none of that is represented.
- English share (35%) is slightly above the 30% target; Indonesian slang is approximated by the author and may not cover regional variation.
- Category assignment is the author's view of the *main* threat; several scenarios mix categories (for example, impersonation plus payment, or fake support plus credential request).
- `expectedClass` boundaries between `manipulative_instruction` and `suspicious_correlation`, and between `observed_instruction` and `none`, are judgement calls.
- Research relied mostly on search-result summaries and news/vendor reporting from 2022–2026; some Indonesian sources pre-date 2025, though the patterns are still reported as active.
- The set is small (80); per-category metrics have wide confidence intervals.
