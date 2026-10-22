# VeilTrace: Uncover the Manipulation Behind the Page.

**Proposal Solusi · Kartika Cyber Hackathon 2026 · Kategori: Penangkalan (Defensive Shield)**

Tim: Berkahe Kiyai · Repositori: https://github.com/dalpan/veiltrace · Coba di HP: https://dalpan.github.io/veiltrace/ · Lisensi: Apache-2.0

> VeilTrace adalah proyek independen. VeilTrace tidak berafiliasi dengan, tidak disetujui oleh, dan tidak mewakili TNI AD atau instansi mana pun. Semua halaman demo dan skenario uji bersifat fiktif.

---

## 1. Ringkasan

Serangan siber yang paling berhasil saat ini tidak membobol sistem. Serangan itu **membujuk manusia** untuk membukakan pintunya sendiri: menempel perintah ke Run, menyerahkan kode OTP, mentransfer "biaya pencairan", atau memasang aplikasi remote untuk "petugas bank".

**VeilTrace** membaca teks halaman web atau pesan **di perangkat pengguna**, lalu menunjukkan, dengan bukti yang bisa disorot langsung di halaman, kapan teks itu mencoba membuat penggunanya melakukan sesuatu yang merugikan. VeilTrace tersedia sebagai:

- ekstensi Chrome/Edge dan Firefox, termasuk Firefox Android;
- aplikasi web **"Cek Pesan"** yang bisa dipasang di HP mana pun, untuk pesan WhatsApp, SMS, dan email.

| Aspek | Ringkasan |
|---|---|
| **Apa yang dideteksi** | 4 kategori: eksekusi perintah (ClickFix), pengungkapan kredensial/OTP, manipulasi pembayaran, peniruan dukungan/otoritas |
| **Cara kerja** | Korelasi kontekstual yang dapat dijelaskan: *tindakan yang diminta × dalih manipulatif × tempat konten × konteks penurun*. Tidak memakai daftar URL dan tidak memakai model kotak hitam |
| **Privasi** | 100% di perangkat: tanpa server, tanpa telemetri, tanpa kode jaringan. Isian formulir, nominal, dan nomor telepon tidak pernah disalin |
| **Status** | Purwarupa berjalan di Chrome, Edge, Firefox (desktop dan Android), dan PWA (diuji di iPhone). 737 tes otomatis lulus |
| **Kejujuran evaluasi** | Set uji dikunci sebelum dijalankan dan hasil yang buruk tetap dipublikasikan. AI di perangkat sudah diuji lalu **sengaja tidak dipakai** karena 71% salah alarm |

## 2. Masalah

**Skala.**
- Serangan **ClickFix** (CAPTCHA palsu yang menyuruh korban menempel lalu menjalankan perintah) naik **517%** pada paruh pertama 2025 menurut ESET. Microsoft mencatatnya sebagai metode pada **47%** kasus *initial access* yang ditangani tim Defender Experts.
- Di Indonesia, **Indonesia Anti-Scam Centre (OJK)** menerima **299.237 laporan** penipuan dengan kerugian sekitar **Rp 7 triliun** dalam kurang lebih satu tahun (per Oktober 2025).

**Modus yang kami temui langsung.** Dari 14 pesan penipuan nyata yang dikumpulkan tim (WhatsApp, SMS, email), pola paling umum ternyata **bukan** permintaan uang di pesan pertama, melainkan **umpan**:
- "pemberitahuan perubahan tarif" atas nama bank yang meminta korban membalas 1/2, dengan ancaman "diam dianggap setuju";
- "CS e-wallet" yang mengabarkan percobaan login asing dan meminta korban mengetik "YA";
- SMS "transaksi kartu kredit berhasil" dengan tautan pembatalan;
- lowongan kerja yang mewajibkan membeli seragam ke e-wallet pribadi;
- kuis hadiah "ulang tahun perusahaan";
- jasa "sadap WA".

### Lingkungan TNI juga menjadi sasaran
- penipuan berkedok rekrutmen TNI (kasus Kulon Progo, kerugian Rp 310 juta);
- 40 pelaku yang mencatut nama pejabat Kodam Hasanuddin untuk menipu masyarakat, termasuk keluarga TNI.

**Mengapa pertahanan yang ada melewatkannya.** Umpan sering berada di **situs yang sah** (kolom komentar, widget chat, forum) atau datang lewat **pesan pribadi**. Daftar blokir domain dan reputasi URL tidak menangkapnya karena domainnya memang tepercaya, atau karena tidak ada domain sama sekali. Yang berbahaya adalah **isi instruksinya**, bukan alamatnya.

## 3. Solusi dan cara kerja

![Halaman resep dengan CAPTCHA palsu "tekan Win+R, Ctrl+V, Enter" (fiktif)](../docs/images/cmd-lure-page.png =58) ![Popup VeilTrace: konten manipulatif terdeteksi, kategori CMD](../docs/images/cmd-lure-popup-top.png =40)

### Alur pemeriksaan
1. **Ekstraksi hanya-baca.** VeilTrace membaca teks yang terlihat, struktur formulir (jenis kolom dan labelnya, **bukan isinya**), dan *tempat* setiap teks: konten kiriman pengguna, widget pihak ketiga, dialog/overlay, frame, atau percakapan chat. Halaman tidak diubah dan tidak ada yang diklik.
2. **Empat detektor kontekstual** berjalan terpisah. Masing-masing menggabungkan:
   - *tindakan* yang diminta: jalankan, kirim kode, bayar, hubungi, instal, balas, buka tautan;
   - *dalih*: verifikasi palsu, ancaman akun, desakan waktu, klaim sebagai petugas/bank/perusahaan, janji refund, hadiah, atau pekerjaan;
   - **satu kata kunci saja tidak pernah memicu peringatan**;
   - konteks penurun ikut dibaca: kutipan, berita, materi edukasi, negasi ("jangan pernah kirim OTP"), dan pengandaian ("jika komputer Anda terinfeksi").
3. **Hasil yang dapat dijelaskan.** Setiap temuan memuat:
   - kategori;
   - klasifikasi (manipulatif / mencurigakan / teramati);
   - keyakinan dan risiko tindakan, ditampilkan **terpisah dan tidak digabung menjadi satu skor**;
   - aturan yang terpicu dan penjelasannya;
   - potongan bukti dengan tombol **Tunjukkan di halaman**;
   - keterbatasannya, misalnya "klaim identitas tidak dapat diverifikasi";
   - VeilTrace **tidak pernah menyatakan halaman "aman"**.

| Kode | Detektor | Contoh pola (sebagian) |
|---|---|---|
| CMD | Manipulasi Eksekusi Perintah | CAPTCHA palsu Win+R/Ctrl+V/Enter, "perbaiki error" lewat terminal |
| CRED | Pengungkapan Kredensial | "kirim kode OTP", "kasih liat angka yg masuk ke hp", frasa pemulihan dompet |
| PAY | Manipulasi Pembayaran | bayar dulu agar refund/hadiah cair, rekening atau e-wallet pribadi, biaya seragam/admin untuk diterima kerja, kartu hadiah, kripto |
| SUP | Peniruan Dukungan & Otoritas | alarm virus palsu dengan nomor telepon, "CS bank" meminta AnyDesk/APK, pemberitahuan tarif palsu yang meminta balasan, kuis hadiah atas nama perusahaan, jasa sadap/bobol akun |

### Permukaan penggunaan

| Permukaan | Untuk | Status |
|---|---|---|
| Ekstensi Chrome/Edge | laptop/PC; pindai saat diklik, atau **mode otomatis opt-in** dengan tanda **!** di ikon | berjalan |
| Ekstensi Firefox | desktop dan **Android** | berjalan, diuji di HP Android |
| **"Cek Pesan"** (PWA) | HP mana pun; tempel pesan, atau di Android **Bagikan** langsung dari WhatsApp. Pesan tidak muncul di URL dan tidak dikirim | online, diuji di iPhone |
| WhatsApp Web | percakapan dibaca sebagai satu wilayah konten pihak lain | purwarupa |
| Build terkelola | organisasi: izin dan mode otomatis aktif saat dipasang lewat kebijakan Chrome/Edge, **tanpa pelaporan ke pusat** | siap diuji coba |

![Cek Pesan di HP: pesan penipuan "biaya admin" ditandai manipulatif](../docs/images/pwa-result-crop.png =34)

## 4. Relevansi bagi TNI AD (kriteria 25%)

VeilTrace bukan sistem pemantauan dan tidak dirancang untuk mengawasi pengguna. Nilainya ada di **lapisan manusia**, titik masuk yang paling sering dipakai lawan:

- **Melindungi personel, PNS, dan keluarganya** dari rekayasa sosial yang memakai identitas institusi. VeilTrace mengenali pola pencatutan pangkat/jabatan dan **penipuan rekrutmen** ("jalur khusus, dijamin lulus", biaya masuk). Polanya ditulis umum, sehingga juga melindungi seleksi CPNS, sekolah kedinasan, dan instansi lain.
- **Kedaulatan data dan jaringan tertutup.** Perlindungan bawaan browser umumnya bergantung pada layanan cloud penyedia browser. VeilTrace tidak memerlukan internet sama sekali, sehingga bisa dipasang dari paket terverifikasi di jaringan terisolasi dan tidak menyimpan riwayat.
- **Penggelaran terkelola.** Build terkelola dapat dipasang serentak lewat kebijakan Chrome/Edge dan server pembaruan internal. Mode otomatis aktif sejak terpasang, tanpa pelaporan dan tanpa konsol pusat, sehingga tidak menimbulkan masalah privasi baru (UU PDP).
- **Mobile-first.** Sebagian besar penipuan datang lewat WhatsApp dan SMS di HP pribadi. "Cek Pesan" dan Firefox Android menjangkau perangkat yang tidak bisa dijangkau ekstensi desktop.
- **Dapat diaudit.** Kode terbuka (Apache-2.0), aturan deteksi bisa dibaca, rilis dapat direproduksi byte demi byte dengan checksum dan SBOM.
- **Bahan latihan kesadaran.** Galeri demo fiktif (CAPTCHA palsu, chat penjual, OTP bank, alarm virus palsu, beserta pembanding asli) dapat dipakai dalam latihan mengenali rekayasa sosial, lengkap dengan penjelasan bukti per kasus.

Ruang lingkup: perlindungan pengguna di browser dan pesan. VeilTrace **tidak** mencakup keamanan OT atau infrastruktur jaringan.

## 5. Inovasi teknis (kriteria 25%)

1. **Membaca instruksi, bukan alamat.** Alamat halaman **tidak pernah** menjadi masukan keputusan, dan ada tes yang memastikan hal ini. Karena itu VeilTrace bekerja di domain tepercaya, di konten kiriman pengguna, dan di pesan yang tidak punya domain.
2. **Korelasi per wilayah halaman.** Bukti hanya digabungkan bila berada di wilayah yang sama, misalnya satu komentar, satu widget, atau satu percakapan. Asal konten ikut diperhitungkan: teks dalam konten pihak lain atau overlay diperlakukan berbeda dari teks milik situs.
3. **Konteks penurun yang eksplisit.** Kutipan, berita, edukasi, negasi, dan pengandaian menurunkan klasifikasi secara terdokumentasi. Dengan begitu, artikel peringatan penipuan tidak ditandai sebagai penipuan.
4. **Privasi yang diuji.** Nilai *sentinel* di formulir, nominal, dan nomor telepon dipastikan tidak pernah muncul di laporan. Tautan hanya dihitung keberadaannya dan tidak pernah dinilai dari domainnya.
5. **Disiplin evaluasi.** Set uji ditulis oleh pihak yang buta terhadap aturan, dikunci dengan hash, dan dipraregistrasi, lalu hasilnya dipublikasikan apa pun hasilnya. Data nyata dikumpulkan lewat OCR lokal sehingga penulis aturan tidak pernah melihat bagian uji.
6. **AI diuji, lalu ditolak dengan data.** Model AI bawaan Chrome (Gemini Nano) sudah kami integrasikan dan ukur. Hasilnya: AI menuduh **71% halaman wajar** sebagai berbahaya, sementara VeilTrace 0%. AI kemudian dikeluarkan dari build rilis supaya pengguna tidak terlatih mengabaikan peringatan.

| Aspek | Proteksi bawaan browser | Pemblokir clipboard ClickFix | VeilTrace |
|---|---|---|---|
| Menjelaskan *mengapa* dan menyorot bukti | peringatan umum | tidak | **ya** |
| Tanpa cloud, bisa di jaringan tertutup | umumnya bergantung cloud | ya | **ya** |
| Bahasa Indonesia, termasuk informal, dan modus lokal | terbatas | tidak | **ya** |
| Cakupan | terutama tech-support scam | hanya ClickFix | **4 kategori** |
| Pesan WhatsApp/SMS di HP | tidak | tidak | **ya (Cek Pesan)** |
| Izin browser | bawaan | akses semua situs | **`activeTab` + `scripting`** (mode otomatis opsional) |

## 6. Fungsionalitas purwarupa (kriteria 25%)

### Fitur yang berjalan
- **Empat detektor** dengan aturan terdokumentasi.
- **Dashboard dwibahasa (ID/EN):** ringkasan ancaman, status empat kategori, saran tindakan, dan daftar temuan berurutan.
- **"Tunjukkan di halaman",** termasuk di dalam shadow DOM dan frame dari situs yang sama.
- **Mode otomatis opt-in** dengan badge di ikon.
- **Pemindaian sebagian dilaporkan jujur**, misalnya ketika ada frame dari situs lain atau halaman sangat besar.
- **Build Firefox** dan **build terkelola**.
- **PWA "Cek Pesan"** dengan Share Target Android dan mode offline.
- **Alat kumpul data nyata:** OCR lokal, penyamaran otomatis, lembar label untuk dua anotator.

### Pengujian otomatis (737 tes lulus)

| Jenis tes | Jumlah lulus |
|---|---|
| Unit (mesin, ekstraktor, harness, ekstensi) | 421 |
| Ekstraksi di Chromium sungguhan | 236 |
| End-to-end dengan ekstensi asli | 80 |

Termasuk di dalamnya:
- pemeriksaan keamanan ekstensi: izin, CSP, ketahanan terhadap XSS dari teks halaman;
- nol permintaan jaringan;
- tidak ada kode AI di build rilis.

**Diuji manual di perangkat sungguhan** oleh tim:
- Chrome desktop;
- Firefox Android;
- PWA di iPhone.

Masukan dari uji perangkat (demo yang terlewat, kuis hadiah, jasa sadap, tautan saja) langsung menjadi perbaikan yang terdokumentasi.

## 7. Kelayakan implementasi (kriteria 15%)

- **Tanpa backend dan tanpa biaya operasional.** Tidak ada server, basis data, akun, atau langganan API.
- **Pemasangan bertahap:**
  1. Uji coba: pasang dari ZIP terverifikasi, atau buka tautan PWA.
  2. Unit: build terkelola lewat kebijakan Chrome/Edge (`ExtensionInstallForcelist`) dengan server pembaruan internal. Templat kebijakannya sudah tersedia.
  3. Seluruh organisasi: CRX bertanda tangan dan distribusi lewat MDM.
- **Kinerja.** Halaman biasa diperiksa dalam hitungan ratus milidetik. Halaman besar diuji di bawah batas 1,5 detik.
- **Perawatan.** Pola penipuan baru ditambahkan sebagai data leksikon, lengkap dengan contoh positif dan pembanding. Setiap perubahan diukur pada korpus pengembangan dan tercatat di log keputusan.
- **Risiko yang disadari:** pola kata baru bisa lolos, dan teks di dalam gambar tidak terbaca. Mitigasinya adalah siklus data nyata (bagian 8 dan 9).

## 8. Evaluasi dan keterbatasan (disampaikan apa adanya)

| Evaluasi | Data | Hasil |
|---|---|---|
| Set uji v1 (hanya ClickFix) | 26 skenario sintetis, dikunci sebelum diuji | recall 75,0%, presisi 81,8%, salah alarm 14,3%. **Target tidak tercapai** |
| Set uji v2 (4 detektor, penulis buta aturan) | 60 skenario sintetis | recall 34,4%, presisi 68,8%, salah alarm 17,9%. **Aturan terlalu cocok dengan gaya bahasa penulisnya** |
| Pesan penipuan nyata tim | 14 penipuan + 1 SMS bank asli | sebelum perbaikan 2 dari 14 tertandai; sesudah perbaikan **11 dari 14**; SMS asli tidak ditandai. *Angka pengembangan: aturan diperbaiki dengan melihat pesan ini* |
| AI di perangkat (Gemini Nano) | 185 skenario pengembangan | menandai 81 dari 82 penipuan, tetapi juga **73 dari 103 halaman wajar (71%)**. **Tidak dipakai** |
| Set uji v3 (penulis buta aturan, 47 berbentuk pesan) | 80 skenario, dikunci dan dipraregistrasi | dijalankan sekali menjelang penjurian |
| Data nyata, bagian uji | dikumpulkan lewat OCR lokal, tidak pernah dilihat penulis aturan | pengumpulan berjalan |

### Keterbatasan
- **Deteksi berbasis pola kata bisa terlewat** oleh parafrase baru. Hasil v2 membuktikan hal ini, dan itulah sebabnya pengukuran berikutnya memakai data nyata.
- **Belum terbaca:** teks di dalam gambar (surat palsu berbentuk foto), suara, dan frame dari situs lain.
- **Belum terdeteksi:** penipuan yang belum meminta apa pun di pesan pertama, misalnya ajakan "like dapat komisi" atau penjual yang membangun kepercayaan dulu.
- **Belum diverifikasi:** pencocokan WhatsApp Web dengan markup aslinya.

## 9. Rencana pengembangan

| Tahap | Waktu | Isi |
|---|---|---|
| 1 | Nov–Des 2026 | Dataset kasus nyata Indonesia (target ≥ 300 pesan, dua anotator, bagian uji terkunci); evaluasi bulanan pada data yang belum pernah dilihat |
| 2 | Q1 2027 | Pilot build terkelola di satu unit: server pembaruan internal, panduan operator, umpan balik pengguna tanpa telemetri |
| 3 | Q1–Q2 2027 | OCR di perangkat untuk pesan berbentuk gambar; verifikasi WhatsApp Web; rilis Firefox di addons.mozilla.org |
| 4 | Q2 2027 | Komponen pembelajaran mesin ringan di perangkat **hanya bila** terbukti menurunkan salah alarm pada data uji nyata; aturan tetap menjadi dasar penjelasan |

## 10. Tim dan transparansi pengembangan

Tim **Berkahe Kiyai**. Sebagian besar kode, dokumentasi, dan data uji dikembangkan dengan bantuan asisten AI (Claude Code) di bawah arahan dan peninjauan tim. Set uji v2 dan v3 ditulis oleh instans agen terpisah yang tidak membaca aturan deteksi. Pesan nyata dikumpulkan dan dilabeli oleh manusia. Seluruh keputusan desain beserta alasannya dicatat di `docs/DECISIONS.md`.

**Dokumentasi teknis:** `docs/README.md` (arsitektur, model deteksi, model ancaman, privasi, protokol dan hasil evaluasi, panduan penggelaran dan operator).

## Sumber

- ESET via Help Net Security, "ClickFix attacks skyrocketing more than 500%" (26 Juni 2025): https://www.helpnetsecurity.com/2025/06/26/clickfix-attacks-fakecaptcha-eset-report/
- Microsoft Digital Defense Report 2025, ringkasan via Infosecurity Magazine: https://www.infosecurity-magazine.com/news/clickfix-attacks-surge-2025/
- Investortrust, "Indonesia Anti-Scam Centre OJK Terima 299.237 Laporan, Total Kerugian Masyarakat Tembus Rp 7 Triliun": https://investortrust.id/financial/82584/indonesia-anti-scam-centre-ojk-terima-299237-laporan-total-kerugian-masyarakat-tembus-rp-7-triliun
- Metro TV, penipuan rekrutmen TNI di Kulon Progo: https://www.metrotvnews.com/read/b3JCpAVL-korban-penipuan-rekrutmen-tni-di-kulon-progo-rugi-rp310-juta-tiga-pelaku-ditangkap
- CNN Indonesia, "Kodam Hasanuddin Tangkap 40 Pelaku Penipuan Online di Sidrap Sulsel": https://www.cnnindonesia.com/nasional/20250425133630-12-1222592/kodam-hasanuddin-tangkap-40-pelaku-penipuan-online-di-sidrap-sulsel
- Kontan, "BRI imbau nasabah waspadai link palsu kenaikan tarif transaksi": https://keuangan.kontan.co.id/news/bri-himbau-nasabah-waspadai-link-palsu-kenaikan-tarif-transaksi
- Chrome for Developers, Prompt API (Gemini Nano) untuk ekstensi: https://developer.chrome.com/docs/extensions/ai/prompt-api
- Microsoft Edge, Scareware blocker: https://blogs.windows.com/msedgedev/2025/01/27/stand-up-to-scareware-with-scareware-blocker/
- Eye Security, ClickFix Block: https://www.eye.security/blog/clickfix-block-fake-captcha-attacks
