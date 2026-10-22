# VeilTrace: Uncover the Manipulation Behind the Page.

**Proposal Solusi · Kartika Cyber Hackathon 2026 · Kategori: Penangkalan (Defensive Shield)**

Tim: Berkahe Kiyai · Repository: https://github.com/dalpan/veiltrace · Coba di HP: https://dalpan.github.io/veiltrace/ · Lisensi: Apache-2.0

> VeilTrace adalah proyek independen. VeilTrace tidak berafiliasi dengan, tidak disetujui oleh, dan tidak mewakili TNI AD atau instansi mana pun. Semua halaman demo dan skenario uji bersifat fiktif.

---

## 1. Ringkasan

Serangan siber yang paling berhasil saat ini tidak membobol sistem. Serangan itu memakai **social engineering**: membujuk manusia untuk membukakan pintunya sendiri, misalnya:
- menempel command ke Run;
- menyerahkan kode OTP;
- mentransfer "biaya pencairan";
- meng-install aplikasi remote untuk "petugas bank".

**VeilTrace** membaca isi halaman web atau pesan secara **on-device**, lalu menunjukkan, dengan bukti yang bisa di-highlight langsung di halaman, kapan teks itu mencoba membuat penggunanya melakukan sesuatu yang merugikan. VeilTrace tersedia sebagai:
- browser extension untuk Chrome, Edge, dan Firefox, termasuk Firefox Android;
- **"Cek Pesan"**, Progressive Web App (PWA) yang bisa di-install di HP mana pun untuk memeriksa pesan WhatsApp, SMS, dan email.

| Aspek | Ringkasan |
|---|---|
| **Yang dideteksi** | 4 kategori: Command Execution (ClickFix), Credential Disclosure (OTP/password), Payment Manipulation, Support & Authority Impersonation |
| **Cara kerja** | *Contextual correlation* yang explainable: *action yang diminta × pretext manipulatif × asal konten × context modifier*. Tanpa blocklist URL, tanpa model black-box |
| **Privasi** | 100% on-device: tanpa server, tanpa telemetry, tanpa network code. Isi form, nominal uang, dan nomor telepon tidak pernah disalin |
| **Status** | Prototype berjalan di Chrome, Edge, Firefox (desktop dan Android), dan PWA (diuji di iPhone). 737 automated test lulus |
| **Evaluasi** | Held-out test set di-lock sebelum dijalankan, hasil buruk tetap dipublikasikan. On-device AI sudah diuji lalu **sengaja tidak dipakai** karena false positive rate 71% |

## 2. Masalah

**Skala.**
- Serangan **ClickFix** (CAPTCHA palsu yang menyuruh korban menempel lalu menjalankan command) naik **517%** pada paruh pertama 2025 menurut ESET. Microsoft mencatatnya sebagai metode pada **47%** kasus *initial access* yang ditangani tim Defender Experts.
- Di Indonesia, **Indonesia Anti-Scam Centre (OJK)** menerima **299.237 laporan** penipuan dengan kerugian sekitar **Rp 7 triliun** dalam kurang lebih satu tahun (per Oktober 2025).

**Modus yang kami temui langsung.** Dari 14 pesan penipuan nyata (WhatsApp, SMS, email) yang dikumpulkan tim, pesan pertama ternyata jarang langsung meminta uang. Yang muncul adalah **lure**:
- notifikasi "perubahan tarif" atas nama bank yang meminta korban membalas 1/2, dengan ancaman "tidak membalas = setuju";
- "CS e-wallet" yang mengabarkan login dari perangkat lain dan meminta korban mengetik "YA";
- SMS "transaksi kartu kredit berhasil" dengan link pembatalan;
- lowongan kerja yang mewajibkan membeli seragam ke e-wallet pribadi;
- kuis berhadiah "ulang tahun perusahaan";
- jasa "sadap WA".

### Lingkungan TNI juga menjadi sasaran
- penipuan berkedok rekrutmen TNI (kasus Kulon Progo, kerugian Rp 310 juta);
- 40 pelaku yang mencatut nama pejabat Kodam Hasanuddin untuk menipu masyarakat, termasuk keluarga TNI.

**Mengapa pertahanan yang ada melewatkannya.** Lure sering berada di **situs yang sah** (kolom komentar, chat widget, forum) atau datang lewat **pesan pribadi**. Domain blocklist dan URL reputation tidak menangkapnya, karena domainnya memang tepercaya atau karena tidak ada domain sama sekali. Yang berbahaya adalah **isi instruksinya**, bukan alamatnya.

## 3. Solusi dan cara kerja

![Halaman resep dengan CAPTCHA palsu "tekan Win+R, Ctrl+V, Enter" (fiktif)](../docs/images/cmd-lure-page.png =58) ![Popup VeilTrace: konten manipulatif terdeteksi, kategori CMD](../docs/images/cmd-lure-popup-top.png =40)

### Alur kerja
1. **Read-only extraction.** VeilTrace membaca:
   - teks yang terlihat;
   - struktur form (jenis field dan label-nya, **bukan isinya**);
   - asal setiap teks: user-generated content, third-party widget, dialog/overlay, frame, atau percakapan chat.

   Halaman tidak diubah dan tidak ada yang diklik.
2. **Empat detector kontekstual** berjalan terpisah. Masing-masing menggabungkan:
   - *action* yang diminta: jalankan command, kirim kode, bayar, hubungi, install, balas, buka link;
   - *pretext*: verifikasi palsu, ancaman terhadap akun, desakan waktu, klaim sebagai petugas/bank/perusahaan, janji refund, hadiah, atau pekerjaan;
   - **satu keyword saja tidak pernah memicu alert**;
   - *context modifier* ikut dibaca: kutipan, berita, materi edukasi, negasi ("jangan pernah kirim OTP"), dan pengandaian ("jika komputer Anda terinfeksi").
3. **Explainable findings.** Setiap finding memuat:
   - kategori;
   - *classification* (manipulative / suspicious / observed);
   - *confidence* dan *action risk*, ditampilkan **terpisah dan tidak digabung menjadi satu skor**;
   - rule yang terpicu beserta penjelasannya;
   - potongan bukti dengan tombol **Show on page**;
   - keterbatasannya, misalnya "klaim identitas tidak dapat diverifikasi";
   - VeilTrace **tidak pernah menyatakan halaman "aman"**.

| Kode | Detector | Contoh pola (sebagian) |
|---|---|---|
| CMD | Command Execution Manipulation | CAPTCHA palsu Win+R/Ctrl+V/Enter, "perbaiki error" lewat terminal |
| CRED | Credential Disclosure Manipulation | "kirim kode OTP", "kasih liat angka yg masuk ke hp", recovery phrase wallet |
| PAY | Payment Manipulation | bayar dulu agar refund/hadiah cair, transfer ke rekening atau e-wallet pribadi, biaya seragam/admin agar diterima kerja, gift card, crypto |
| SUP | Support & Authority Impersonation | fake virus alert dengan nomor telepon, "CS bank" meminta AnyDesk/APK, notifikasi tarif palsu yang meminta balasan, kuis berhadiah atas nama perusahaan, jasa sadap/hack akun |

### Platform

| Platform | Untuk | Status |
|---|---|---|
| Extension Chrome/Edge | laptop/PC; scan saat diklik, atau **auto-scan (opt-in)** dengan **badge "!"** di ikon | berjalan |
| Extension Firefox | desktop dan **Android** | berjalan, diuji di HP Android |
| **Cek Pesan** (PWA) | HP mana pun: paste pesan, atau di Android **Share** langsung dari WhatsApp. Pesan tidak muncul di URL dan tidak dikirim ke mana pun | live, diuji di iPhone |
| WhatsApp Web | percakapan dibaca sebagai satu region konten dari pihak lain | prototype |
| Managed build | organisasi: permission dan auto-scan aktif sejak di-install lewat Chrome/Edge enterprise policy, **tanpa reporting ke pusat** | siap pilot |

![Cek Pesan di HP: pesan penipuan "biaya admin" ditandai manipulative](../docs/images/pwa-result-crop.png =34)

## 4. Relevansi bagi TNI AD (kriteria 25%)

VeilTrace bukan sistem monitoring dan tidak dirancang untuk mengawasi pengguna. Nilainya ada di **human layer**, titik masuk yang paling sering dipakai lawan:

- **Melindungi personel, PNS, dan keluarganya** dari social engineering yang memakai identitas institusi. VeilTrace mengenali pola pencatutan pangkat atau jabatan dan **penipuan rekrutmen** ("jalur khusus, dijamin lulus", biaya masuk). Pola ini ditulis generik, sehingga juga melindungi seleksi CPNS, sekolah kedinasan, dan instansi lain.
- **Data sovereignty dan air-gapped network.** Proteksi bawaan browser umumnya bergantung pada layanan cloud milik vendor browser. VeilTrace sama sekali tidak memerlukan internet: bisa di-install dari paket yang terverifikasi di jaringan tertutup dan tidak menyimpan history.
- **Managed deployment.** Managed build bisa di-install serentak lewat enterprise policy Chrome/Edge dan internal update server. Auto-scan aktif sejak terpasang, tanpa reporting dan tanpa central console, sehingga tidak menimbulkan masalah privasi baru (UU PDP).
- **Mobile-first.** Sebagian besar penipuan datang lewat WhatsApp dan SMS di HP pribadi. Cek Pesan dan Firefox Android menjangkau perangkat yang tidak bisa dijangkau extension desktop.
- **Auditable.** Open source (Apache-2.0), rule deteksi bisa dibaca, reproducible build dengan checksum dan SBOM.
- **Security awareness training.** Galeri demo fiktif (CAPTCHA palsu, chat penjual, OTP bank, fake virus alert, beserta versi aslinya sebagai pembanding) dapat dipakai sebagai materi latihan mengenali social engineering, lengkap dengan penjelasan bukti per kasus.

Scope: perlindungan pengguna di browser dan pesan. VeilTrace **tidak** mencakup OT security atau infrastruktur jaringan.

## 5. Inovasi teknis (kriteria 25%)

1. **Membaca instruksi, bukan alamat.** URL halaman **tidak pernah** menjadi input keputusan, dan ada test yang memastikannya. Karena itu VeilTrace bekerja di domain tepercaya, di user-generated content, dan di pesan yang tidak punya domain.
2. **Region-based correlation.** Bukti hanya digabungkan bila berada di region yang sama, misalnya satu komentar, satu widget, atau satu percakapan. Asal konten ikut diperhitungkan: teks di konten pihak ketiga atau overlay diperlakukan berbeda dari teks milik situs.
3. **Context modifier yang eksplisit.** Kutipan, berita, edukasi, negasi, dan pengandaian menurunkan classification secara terdokumentasi, sehingga artikel peringatan penipuan tidak ikut ditandai sebagai penipuan.
4. **Privacy yang diuji.** *Sentinel value* di form, nominal, dan nomor telepon dipastikan tidak pernah muncul di report. Link hanya dihitung keberadaannya dan tidak pernah dinilai dari domainnya.
5. **Evaluation discipline.** Held-out test set ditulis oleh pihak yang tidak membaca rule, di-lock dengan hash, dan di-preregister. Hasilnya dipublikasikan apa pun hasilnya. Data nyata dikumpulkan lewat OCR lokal, sehingga penulis rule tidak pernah melihat test split.
6. **AI diuji, lalu ditolak berdasarkan data.** Model AI bawaan Chrome (Gemini Nano) sudah kami integrasikan dan ukur. Hasilnya: **false positive 71%** pada halaman wajar, sementara VeilTrace 0%. AI dikeluarkan dari release build supaya pengguna tidak terlatih mengabaikan alert.

| Aspek | Proteksi bawaan browser | ClickFix clipboard blocker | VeilTrace |
|---|---|---|---|
| Menjelaskan *mengapa* dan meng-highlight bukti | warning umum | tidak | **ya** |
| Tanpa cloud, bisa di air-gapped network | umumnya bergantung cloud | ya | **ya** |
| Bahasa Indonesia (termasuk informal) dan modus lokal | terbatas | tidak | **ya** |
| Cakupan | terutama tech-support scam | hanya ClickFix | **4 kategori** |
| Pesan WhatsApp/SMS di HP | tidak | tidak | **ya (Cek Pesan)** |
| Browser permission | bawaan | akses semua situs | **`activeTab` + `scripting`** (auto-scan opsional) |

## 6. Fungsionalitas purwarupa (kriteria 25%)

### Fitur yang berjalan
- **Empat detector** dengan rule yang terdokumentasi.
- **Dashboard bilingual (ID/EN):** ringkasan ancaman, status keempat kategori, rekomendasi tindakan, dan daftar finding yang diurutkan.
- **Show on page,** termasuk di dalam shadow DOM dan same-origin frame.
- **Auto-scan opt-in** dengan badge di ikon toolbar.
- **Partial scan dilaporkan apa adanya,** misalnya bila ada cross-origin frame atau halaman sangat besar.
- **Firefox build** dan **managed build**.
- **PWA Cek Pesan** dengan Android Share Target dan mode offline.
- **Tooling data nyata:** OCR lokal, redaksi otomatis, dan labeling sheet untuk dua annotator.

### Automated test (737 lulus)

| Jenis test | Lulus |
|---|---|
| Unit (engine, extractor, harness, extension) | 421 |
| Extraction di Chromium sungguhan | 236 |
| End-to-end dengan extension asli | 80 |

Test di atas juga mencakup:
- security check extension: permission, CSP, ketahanan terhadap XSS dari teks halaman;
- nol network request;
- tidak ada kode AI di release build.

**Diuji manual oleh tim di perangkat sungguhan:**
- Chrome desktop;
- Firefox Android;
- PWA di iPhone.

Temuan dari device testing (demo yang tidak terdeteksi, kuis berhadiah, jasa sadap, input berupa link saja) langsung menjadi perbaikan yang terdokumentasi.

## 7. Kelayakan implementasi (kriteria 15%)

- **Tanpa backend, tanpa biaya operasional.** Tidak ada server, database, akun, atau langganan API.
- **Deployment bertahap:**
  - Uji coba: install dari ZIP terverifikasi, atau buka link PWA.
  - Unit: managed build lewat Chrome/Edge policy (`ExtensionInstallForcelist`) dengan internal update server. Template policy-nya sudah tersedia.
  - Seluruh organisasi: signed CRX yang didistribusikan lewat MDM.
- **Performa.** Halaman biasa di-scan dalam ratusan milidetik; halaman besar diuji di bawah batas 1,5 detik.
- **Maintenance.** Pola penipuan baru ditambahkan sebagai data lexicon, lengkap dengan contoh positif dan hard negative. Setiap perubahan diukur pada development corpus dan dicatat di decision log.
- **Risiko yang disadari:** parafrase baru bisa lolos, dan teks di dalam gambar belum terbaca. Mitigasinya adalah siklus data nyata (bagian 8 dan 9).

## 8. Evaluasi dan keterbatasan (disampaikan apa adanya)

| Evaluasi | Data | Hasil |
|---|---|---|
| Held-out v1 (ClickFix saja) | 26 skenario sintetis, di-lock sebelum diuji | recall 75,0%, precision 81,8%, false positive 14,3%. **Target tidak tercapai** |
| Held-out v2 (4 detector, penulis tidak membaca rule) | 60 skenario sintetis | recall 34,4%, precision 68,8%, false positive 17,9%. **Rule overfit pada gaya bahasa penulisnya** |
| Pesan penipuan nyata dari tim | 14 penipuan + 1 SMS bank asli | sebelum perbaikan: 2 dari 14 terdeteksi; sesudahnya: **11 dari 14**; SMS asli tidak ditandai. *Angka development: rule diperbaiki dengan melihat pesan-pesan ini* |
| On-device AI (Gemini Nano) | 185 skenario development | mendeteksi 81 dari 82 penipuan, tetapi juga menandai **73 dari 103 halaman wajar (71%)**. **Tidak dipakai** |
| Held-out v3 (penulis tidak membaca rule; 47 skenario berbentuk pesan) | 80 skenario, di-lock dan di-preregister | dijalankan sekali menjelang penjurian |
| Data nyata, test split | dikumpulkan lewat OCR lokal, tidak pernah dilihat penulis rule | pengumpulan berjalan |

### Keterbatasan
- **Deteksi berbasis pola kata bisa lolos** oleh parafrase baru. Hasil v2 membuktikan hal ini, dan itulah sebabnya pengukuran berikutnya memakai data nyata.
- **Belum terbaca:** teks di dalam gambar (surat palsu berupa foto), suara, dan cross-origin frame.
- **Belum terdeteksi:** penipuan yang belum meminta apa pun di pesan pertama, misalnya ajakan "like dapat komisi" atau penjual yang membangun kepercayaan dulu.
- **Belum diverifikasi:** kecocokan dengan markup asli WhatsApp Web.

## 9. Rencana pengembangan

| Tahap | Waktu | Isi |
|---|---|---|
| 1 | Nov–Des 2026 | Dataset pesan nyata Indonesia (target ≥ 300 pesan, dua annotator, test split di-lock); evaluasi bulanan pada data yang belum pernah dilihat |
| 2 | Q1 2027 | Pilot managed build di satu unit: internal update server, panduan operator, umpan balik pengguna tanpa telemetry |
| 3 | Q1–Q2 2027 | On-device OCR untuk pesan berbentuk gambar; verifikasi WhatsApp Web; rilis Firefox di addons.mozilla.org |
| 4 | Q2 2027 | Model machine learning ringan on-device **hanya bila** terbukti menurunkan false positive pada test set nyata; rule tetap menjadi dasar penjelasan |

## 10. Tim dan transparansi pengembangan

Tim **Berkahe Kiyai**.
- Sebagian besar kode, dokumentasi, dan data uji dikembangkan dengan bantuan AI coding assistant (Claude Code), di bawah arahan dan review tim.
- Held-out v2 dan v3 ditulis oleh agent terpisah yang tidak membaca rule deteksi.
- Pesan nyata dikumpulkan dan diberi label oleh manusia.
- Seluruh keputusan desain beserta alasannya tercatat di `docs/DECISIONS.md`.

**Dokumentasi teknis:** `docs/README.md` berisi architecture, detection model, threat model, privacy, evaluation protocol dan hasilnya, serta panduan deployment dan operator.

## Sumber

- ESET via Help Net Security, "ClickFix attacks skyrocketing more than 500%" (26 Juni 2025): https://www.helpnetsecurity.com/2025/06/26/clickfix-attacks-fakecaptcha-eset-report/
- Microsoft Digital Defense Report 2025, ringkasan via Infosecurity Magazine: https://www.infosecurity-magazine.com/news/clickfix-attacks-surge-2025/
- Investortrust, "Indonesia Anti-Scam Centre OJK Terima 299.237 Laporan, Total Kerugian Masyarakat Tembus Rp 7 Triliun": https://investortrust.id/financial/82584/indonesia-anti-scam-centre-ojk-terima-299237-laporan-total-kerugian-masyarakat-tembus-rp-7-triliun
- Metro TV, penipuan rekrutmen TNI di Kulon Progo: https://www.metrotvnews.com/read/b3JCpAVL-korban-penipuan-rekrutmen-tni-di-kulon-progo-rugi-rp310-juta-tiga-pelaku-ditangkap
- CNN Indonesia, "Kodam Hasanuddin Tangkap 40 Pelaku Penipuan Online di Sidrap Sulsel": https://www.cnnindonesia.com/nasional/20250425133630-12-1222592/kodam-hasanuddin-tangkap-40-pelaku-penipuan-online-di-sidrap-sulsel
- Kontan, "BRI imbau nasabah waspadai link palsu kenaikan tarif transaksi": https://keuangan.kontan.co.id/news/bri-himbau-nasabah-waspadai-link-palsu-kenaikan-tarif-transaksi
- Chrome for Developers, Prompt API (Gemini Nano) untuk extension: https://developer.chrome.com/docs/extensions/ai/prompt-api
- Microsoft Edge, Scareware blocker: https://blogs.windows.com/msedgedev/2025/01/27/stand-up-to-scareware-with-scareware-blocker/
- Eye Security, ClickFix Block: https://www.eye.security/blog/clickfix-block-fake-captcha-attacks
