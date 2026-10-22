# Persiapan Tanya-Jawab Juri

Jawaban singkat yang jujur untuk pertanyaan yang paling mungkin muncul. Setiap jawaban hanya memuat hal yang sudah ada dan diuji.

## "Kenapa tidak pakai AI?"
Kami sudah mencobanya. Model AI bawaan Chrome (Gemini Nano) kami integrasikan dan ukur pada 185 skenario.
- **Hasil:** AI menandai 81 dari 82 penipuan, tetapi juga **73 dari 103 halaman wajar (71%)**. VeilTrace pada data yang sama: 0.
- **Keputusan:** alert yang sering salah membuat orang terbiasa mengabaikan peringatan, jadi AI dikeluarkan dari release build.
- **Kelebihan rule-based:** setiap finding bisa dijelaskan dan ditunjukkan buktinya, tidak bisa dibujuk dengan *prompt injection* dari isi halaman, dan hasilnya deterministik.
- **Ke depan:** evaluation tool-nya tetap ada. Model ringan baru akan dipakai bila terbukti menurunkan false positive pada test set nyata.

## "Seberapa akurat?"
Kami menyebut angkanya apa adanya.
- **Held-out v1 (ClickFix, 26 skenario):** recall 75%, precision 81,8%, false positive 14,3%. Target tidak tercapai.
- **Held-out v2 (60 skenario, penulis tidak membaca rule, empat detector):** recall 34,4%, precision 68,8%, false positive 17,9%. Ini membuktikan rule kami overfit pada gaya bahasa penulisnya.
- **Pesan penipuan nyata (14):** dari 2 menjadi 11 yang tertandai setelah perbaikan, dan SMS bank asli tidak ditandai. Ini **angka development** karena rule diperbaiki dengan melihat pesan-pesan itu.
- **Held-out v3 (80 skenario, 47 berbentuk pesan) dan test split data nyata:** di-lock sebelum diuji dan dijalankan sekali. *[isi hasilnya bila sudah dijalankan]*

## "Kenapa harus diklik? Korban tidak akan memindai dulu."
- **Auto-scan (opt-in):** halaman di-scan saat dimuat dan saat berubah, dan ikon diberi badge **!** untuk konten manipulatif.
- **Managed build untuk organisasi:** auto-scan aktif sejak di-install.
- **Di HP:** pesan bisa langsung di-share dari WhatsApp ke Cek Pesan.

## "Bagaimana dengan WhatsApp dan HP?"
- **Cek Pesan (PWA):** paste pesan, atau di Android share langsung dari WhatsApp. Pemeriksaan berjalan on-device dan tidak ada yang dikirim. Sudah diuji di iPhone.
- **Firefox Android:** extension-nya berjalan di sana, sudah diuji di HP Android.
- **WhatsApp Web:** tersedia sebagai prototype. Kecocokan dengan markup aslinya belum diverifikasi.

## "Apa bedanya dengan proteksi bawaan Edge atau Chrome?"
Kami melengkapi, bukan menggantikan. Proteksi bawaan browser berfokus pada tech-support scam dan umumnya bergantung pada layanan cloud. VeilTrace:
- menjelaskan alasannya dengan bukti;
- berjalan tanpa cloud;
- mengenali bahasa dan modus penipuan Indonesia;
- mencakup empat kategori;
- menjangkau pesan di HP.

## "Auto-scan berarti membaca semua situs. Bagaimana privasinya?"
- Analisis tetap on-device.
- Yang keluar dari tab hanya verdict dan jumlah finding, untuk badge di ikon.
- Tidak ada yang dikirim ke internet atau disimpan, dan isi form tidak pernah dibaca.
- Mematikan auto-scan akan mencabut permission-nya.
- Semua ini diuji lewat automated test, termasuk nol network request.

## "Apa relevansinya untuk TNI AD? Apakah mencakup OT?"
- **Relevansi:** proteksi di human layer bagi personel, PNS, dan keluarga terhadap pencatutan pangkat atau jabatan, penipuan rekrutmen, CS palsu, dan ClickFix.
- **Deployment:** cocok untuk air-gapped network, bisa di-install serentak lewat browser policy tanpa central console, dan tidak menimbulkan masalah privasi baru (UU PDP).
- **OT tidak tercakup.** Kami tidak mengklaimnya.
- **Status:** VeilTrace adalah proyek independen dan tidak berafiliasi dengan TNI AD.

## "Bagaimana kalau penipu menghindari kata-katanya?"
Bisa. Hasil v2 justru menunjukkannya. VeilTrace membaca kombinasi action, pretext, dan asal konten, bukan satu keyword, sehingga penghindaran butuh usaha lebih. Celah yang kami ketahui:
- parafrase baru;
- teks di dalam gambar;
- penipuan yang belum meminta apa pun di pesan pertama.

Karena itu, pengukuran dan perbaikan berikutnya memakai data nyata yang dikumpulkan dengan OCR lokal, dan penulis rule tidak pernah melihat test split-nya. Hasil "tidak ada temuan" bukan jaminan.

## "Apakah kode ini dibuat dengan AI?"
Ya. Sebagian besar kode, dokumentasi, dan data uji dikembangkan dengan bantuan AI coding assistant di bawah arahan tim, dan hal ini kami cantumkan di proposal. Held-out v2 dan v3 ditulis oleh agent terpisah yang tidak membaca rule. Keputusan desain tercatat di `docs/DECISIONS.md`.

*Catatan untuk tim: pastikan Anda bisa menjelaskan arsitekturnya sendiri, minimal alur extraction → correlation → evidence, dan alasan URL tidak dipakai.*
