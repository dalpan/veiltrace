# VeilTrace: Ungkap Manipulasi di Balik Halaman

**Proposal Solusi · Kartika Cyber Hackathon 2026 · Kategori: Penangkalan (Defensive Shield)**

Tim: *[nama tim dan anggota — diisi oleh tim]* · Repositori: *[tautan repositori]* · Lisensi: Apache-2.0

> VeilTrace adalah proyek independen. VeilTrace tidak berafiliasi dengan, tidak disetujui oleh, dan tidak mewakili TNI AD atau instansi mana pun.

---

## 1. Ringkasan

VeilTrace adalah ekstensi browser (Chrome dan Edge) yang membaca halaman web **di perangkat pengguna** dan menunjukkan, dengan bukti yang disorot langsung di halaman, kapan halaman itu mencoba membuat penggunanya melakukan sesuatu yang merugikan. Contohnya: menjalankan perintah berbahaya, mengirim kode OTP, mentransfer uang ke rekening pribadi, atau memasang aplikasi remote untuk "petugas".

Empat pemeriksaan berjalan terpisah:

| Kode | Kategori | Contoh yang dideteksi |
|---|---|---|
| CMD | Manipulasi Eksekusi Perintah | CAPTCHA palsu "tekan Win+R, Ctrl+V, Enter" (ClickFix), dalih "perbaiki error ini" |
| CRED | Manipulasi Pengungkapan Kredensial | "kirimkan kode OTP", "kasih liat angka yg masuk ke hp lu", frasa pemulihan dompet |
| PAY | Manipulasi Pembayaran | bayar dulu agar refund/hadiah cair, transfer ke rekening pribadi, kartu hadiah, ancaman |
| SUP | Peniruan Dukungan & Otoritas | alarm virus palsu dengan nomor telepon, "CS bank" meminta AnyDesk atau instal APK |

Semua analisis berjalan **luring (offline)**: tidak ada server, tidak ada telemetri, tidak ada data yang keluar dari perangkat.

## 2. Masalah

Serangan yang paling efektif saat ini tidak membobol sistem; serangan itu **membujuk manusia** untuk membobol dirinya sendiri.

- **ClickFix** (CAPTCHA palsu yang menyuruh korban menempel dan menjalankan perintah) naik **517%** pada paruh pertama 2025 menurut ESET. Microsoft mencatatnya sebagai metode pada **47%** kasus *initial access* yang ditangani tim Defender Experts.
- Di Indonesia, **Indonesia Anti-Scam Centre (OJK)** menerima **299.237 laporan** penipuan dengan kerugian sekitar **Rp 7 triliun** dalam kurang lebih satu tahun (per Oktober 2025).
- Lingkungan TNI juga menjadi sasaran rekayasa sosial: penipuan berkedok rekrutmen TNI (kasus Kulon Progo, kerugian Rp 310 juta) dan 40 pelaku yang mencatut nama pejabat Kodam Hasanuddin untuk menipu masyarakat, termasuk keluarga TNI.

Ciri bersamanya: umpan sering muncul di **situs yang sah**, misalnya kolom komentar, widget chat, forum, atau iklan. Daftar blokir domain dan reputasi URL tidak menangkapnya, karena domainnya memang tepercaya. Yang berbahaya adalah **isi instruksinya**, bukan alamat situsnya.

## 3. Solusi dan cara kerja

1. **Ekstraksi hanya-baca.** Saat pemindaian, VeilTrace membaca teks yang terlihat, struktur formulir (jenis kolom dan labelnya, **bukan isinya**), dan tanda tempat konten berada (komentar pengguna, widget, dialog, frame). Halaman tidak diubah.
2. **Empat detektor kontekstual.** Setiap detektor menggabungkan *tindakan yang diminta* (jalankan, kirim, bayar, hubungi, instal) dengan *dalih manipulatif* (verifikasi palsu, ancaman akun, desakan waktu, klaim sebagai petugas, janji refund atau hadiah). **Satu kata kunci saja tidak pernah memicu peringatan.** Konteks yang menurunkan klasifikasi juga dibaca: kutipan, berita, materi edukasi, kalimat negasi ("jangan pernah kirim OTP"), dan pengandaian ("jika komputer Anda terinfeksi").
3. **Hasil yang dapat dijelaskan.** Setiap temuan berisi:
   - kategori;
   - klasifikasi (manipulatif / mencurigakan / teramati);
   - tingkat keyakinan;
   - risiko tindakan;
   - aturan yang terpicu;
   - penjelasan singkat;
   - potongan bukti dengan tombol **Tunjukkan di halaman**;
   - keterbatasan, misalnya bahwa "klaim sebagai petugas tidak dapat diverifikasi".
4. **Dashboard terpadu.** Popup menampilkan ringkasan ancaman halaman, status keempat kategori, saran tindakan sesuai kategori, dan daftar temuan yang diurutkan dari yang paling serius. VeilTrace **tidak pernah menyatakan halaman "aman"**; tanpa temuan pun, VeilTrace hanya menyatakan apa yang tidak ditemukan di bagian yang dapat diperiksa.
5. **Dwibahasa.** Antarmuka dan deteksi tersedia dalam Bahasa Indonesia dan Inggris, termasuk bahasa informal yang umum dipakai penipu.

## 4. Relevansi bagi pengamanan siber TNI AD

VeilTrace bukan sistem pemantauan dan tidak dirancang untuk mengawasi pengguna. Nilainya bagi lingkungan seperti TNI AD ada di **lapisan manusia**:

- **Melindungi personel, PNS, dan keluarganya** dari rekayasa sosial yang memakai identitas institusi: pencatutan nama pejabat, penipuan rekrutmen, "CS bank" palsu, ClickFix di situs yang sah.
- **Kedaulatan data dan jaringan tertutup.** Beberapa perlindungan bawaan browser mengirim sinyal ke layanan cloud milik penyedia browser. VeilTrace tidak membutuhkan koneksi internet sama sekali, bisa dipasang dari paket terverifikasi di jaringan terisolasi, dan tidak menyimpan riwayat.
- **Dapat diaudit.** Berlisensi terbuka (Apache-2.0), aturan deteksi dapat dibaca, build dapat direproduksi byte demi byte, dan setiap rilis dilengkapi checksum.
- **Bahan latihan kesadaran.** Situs demo fiktif dan skenario uji dapat dipakai sebagai materi latihan mengenali rekayasa sosial, dengan penjelasan bukti per kasus.

VeilTrace **tidak** mencakup keamanan OT atau infrastruktur jaringan; ruang lingkupnya adalah perlindungan pengguna di browser.

## 5. Inovasi dibanding solusi sejenis

| | Proteksi bawaan browser (Edge Scareware Blocker, Chrome Enhanced Protection) | Pemblokir clipboard ClickFix (mis. ClickFix Block) | VeilTrace |
|---|---|---|---|
| Menjelaskan *mengapa* dan menyorot bukti di halaman | Peringatan umum | Tidak | **Ya** |
| Tanpa cloud, bisa di jaringan tertutup | Chrome EP mengirim sinyal ke layanan Google | Ya | **Ya** |
| Bahasa Indonesia dan modus penipuan lokal | Fokus tech-support scam | Tidak | **Ya** |
| Cakupan | Terutama tech-support scam | Hanya ClickFix | **4 kategori** |
| Bekerja pada umpan di situs yang sah (komentar, widget) | Sebagian | Ya (clipboard) | **Ya, berbasis konteks** |
| Izin browser minimal | Bawaan browser | Akses semua situs | **`activeTab` + `scripting` saja** |

Kebaruan teknisnya adalah **korelasi kontekstual yang dapat dijelaskan**: tindakan × dalih × tempat konten × konteks penurun (kutipan, edukasi, negasi), per wilayah halaman, tanpa model kotak hitam dan tanpa membaca URL sebagai dasar keputusan.

## 6. Purwarupa dan fungsionalitas

Purwarupa sudah berjalan sebagai ekstensi Chromium MV3:

- **Empat detektor** dengan aturan terdokumentasi.
- **Dashboard dwibahasa.**
- **Tombol "Tunjukkan di halaman"**, termasuk di dalam shadow DOM dan frame dari situs yang sama.
- **Pemindaian sebagian dilaporkan jujur**, misalnya ketika ada frame dari situs lain atau halaman sangat besar.
- **Situs demo fiktif** yang berjalan sepenuhnya luring.

Kualitas dijaga dengan pengujian otomatis:

| Jenis tes | Jumlah lulus |
|---|---|
| Unit | 360 |
| Ekstraksi di Chromium sungguhan | 183 |
| End-to-end dengan ekstensi asli | 66 |

Ada juga pemeriksaan keamanan ekstensi: izin, CSP, ketahanan terhadap XSS dari teks halaman, dan nol permintaan jaringan.

## 7. Kelayakan implementasi

- **Tanpa backend dan tanpa biaya operasional.** Tidak ada server, basis data, atau akun.
- **Pemasangan.** Untuk uji coba, cukup "Load unpacked" dari ZIP terverifikasi. Untuk perangkat yang dikelola, bisa memakai kebijakan force-install Chrome atau Edge dengan CRX yang ditandatangani dan diperbarui dari server internal; tahap ini masih rencana.
- **Kinerja.** Ekstraksi dan analisis halaman besar diuji di bawah batas 1,5 detik; halaman biasa selesai dalam hitungan ratus milidetik.
- **Privasi sejak desain.** Nilai isian formulir, nominal uang, dan nomor telepon tidak pernah disalin ke laporan, dan hal ini diuji dengan nilai *sentinel*.

## 8. Evaluasi dan keterbatasan (disampaikan apa adanya)

**Detektor CMD** dievaluasi sekali pada 26 skenario sintetis yang dibekukan sebelum pengujian:

| Metrik | Hasil | Target |
|---|---|---|
| Recall | 75,0% | 85% |
| Presisi | 81,8% | 90% |
| False positive pada halaman jebakan | 14,3% | 10% |

Ketiga target tidak tercapai. Hasil ini dipublikasikan beserta penyebab kegagalannya.

- **Detektor CRED, PAY, dan SUP** baru diukur pada data pengembangan yang ditulis oleh penulis yang sama dengan aturannya. Angkanya optimistis dan **bukan** tingkat akurasi di dunia nyata.
- **Deteksi berbasis aturan** bisa terlewat oleh susunan kata yang tidak lazim. Contoh: bahasa slang di luar kosakata yang dikenal, atau alarm palsu dengan kalimat baru.
- **Batas cakupan pemindaian:**
  - Pemindaian saat ini dilakukan atas permintaan pengguna, belum otomatis.
  - VeilTrace tidak membaca gambar, video, atau frame dari situs lain.
  - Belum tersedia untuk browser di ponsel.

## 9. Rencana pengembangan

1. **Mode otomatis opt-in**, yaitu pemindaian saat halaman dimuat dengan penanda di ikon toolbar. Mode ini diaktifkan oleh pengguna atau oleh kebijakan organisasi, tetap luring, dan bisa dicabut kapan saja. Mode manual tetap menjadi bawaan.
2. **Dataset kasus nyata Indonesia.** Kasusnya dikumpulkan dari materi edukasi OJK, perbankan, dan berita, serta kiriman sukarela, lalu dilabeli oleh dua orang. Sebagian dikunci sebagai set uji sebelum aturan disesuaikan, supaya hasilnya jujur.
3. **Pola khusus Indonesia**: penipuan rekrutmen ("jalur khusus", biaya masuk), pencatutan pangkat atau jabatan, dan lampiran `.apk` berkedok undangan atau resi.
4. **Prototipe pemindai WhatsApp Web**, manual, lokal, dan tanpa menyimpan percakapan. Fitur ini memerlukan kajian privasi (UU PDP) dan ketentuan layanan terlebih dahulu.
5. **Distribusi untuk perangkat yang dikelola**, meliputi CRX bertanda tangan, server pembaruan internal, dan panduan kebijakan.

## 10. Transparansi pengembangan

Sebagian besar kode, dokumentasi, dan data uji dikembangkan dengan bantuan asisten AI (Claude Code) di bawah arahan dan peninjauan tim. Keputusan desain dicatat di `docs/DECISIONS.md`.

## Sumber

- ESET via Help Net Security, "ClickFix attacks skyrocketing more than 500%" (26 Juni 2025): https://www.helpnetsecurity.com/2025/06/26/clickfix-attacks-fakecaptcha-eset-report/
- Microsoft Digital Defense Report 2025, ringkasan via Infosecurity Magazine: https://www.infosecurity-magazine.com/news/clickfix-attacks-surge-2025/
- Investortrust, "Indonesia Anti-Scam Centre OJK Terima 299.237 Laporan, Total Kerugian Masyarakat Tembus Rp 7 Triliun": https://investortrust.id/financial/82584/indonesia-anti-scam-centre-ojk-terima-299237-laporan-total-kerugian-masyarakat-tembus-rp-7-triliun
- Metro TV, penipuan rekrutmen TNI di Kulon Progo: https://www.metrotvnews.com/read/b3JCpAVL-korban-penipuan-rekrutmen-tni-di-kulon-progo-rugi-rp310-juta-tiga-pelaku-ditangkap
- CNN Indonesia, "Kodam Hasanuddin Tangkap 40 Pelaku Penipuan Online di Sidrap Sulsel": https://www.cnnindonesia.com/nasional/20250425133630-12-1222592/kodam-hasanuddin-tangkap-40-pelaku-penipuan-online-di-sidrap-sulsel
- Microsoft Edge, Scareware blocker: https://blogs.windows.com/msedgedev/2025/01/27/stand-up-to-scareware-with-scareware-blocker/
- BleepingComputer, Chrome on-device AI untuk tech-support scam: https://www.bleepingcomputer.com/news/security/google-chrome-to-use-on-device-ai-to-detect-tech-support-scams/
- Eye Security, ClickFix Block: https://www.eye.security/blog/clickfix-block-fake-captcha-attacks
