# Persiapan Tanya-Jawab Juri

Jawaban singkat yang jujur untuk pertanyaan yang paling mungkin muncul. Setiap jawaban hanya memuat hal yang sudah ada dan diuji.

## "Kenapa tidak pakai AI?"
Kami sudah mencobanya. Model AI bawaan Chrome (Gemini Nano) kami integrasikan dan ukur pada 185 skenario.
- **Hasil:** AI menandai 81 dari 82 penipuan, tetapi juga **73 dari 103 halaman wajar (71%)**. VeilTrace pada data yang sama: 0.
- **Keputusan:** alarm yang sering salah membuat orang terbiasa mengabaikan peringatan, jadi AI dikeluarkan dari build rilis.
- **Kelebihan aturan:** setiap temuan bisa dijelaskan dan ditunjukkan buktinya, tidak bisa dibujuk dengan *prompt injection* dari isi halaman, dan hasilnya deterministik.
- **Ke depan:** alat ukurnya tetap ada. Model ringan baru akan dipakai bila terbukti menurunkan salah alarm pada data uji nyata.

## "Seberapa akurat?"
Kami menyebut angkanya apa adanya.
- **Set uji v1 (ClickFix, 26 skenario):** recall 75%, presisi 81,8%, salah alarm 14,3%. Target tidak tercapai.
- **Set uji v2 (60 skenario buta, empat detektor):** recall 34,4%, presisi 68,8%, salah alarm 17,9%. Ini membuktikan aturan terlalu cocok dengan gaya bahasa penulisnya.
- **Pesan penipuan nyata (14):** dari 2 menjadi 11 yang tertandai setelah perbaikan, dan SMS bank asli tidak ditandai. Ini **angka pengembangan** karena aturan diperbaiki dengan melihat pesan-pesan itu.
- **Set uji v3 (80 skenario, 47 berbentuk pesan) dan data nyata bagian uji:** dikunci sebelum diuji dan dijalankan sekali. *[isi hasilnya bila sudah dijalankan]*

## "Kenapa harus diklik? Korban tidak akan memindai dulu."
- **Mode otomatis opt-in:** halaman diperiksa saat dimuat dan berubah, dan ikon diberi tanda **!** untuk konten manipulatif.
- **Build terkelola untuk organisasi:** mode otomatis aktif sejak terpasang.
- **Di HP:** pesan bisa langsung dibagikan dari WhatsApp ke Cek Pesan.

## "Bagaimana dengan WhatsApp dan HP?"
- **Cek Pesan (PWA):** pesan ditempel, atau di Android dibagikan langsung dari WhatsApp. Pemeriksaan berjalan di HP dan tidak ada yang dikirim. Sudah diuji di iPhone.
- **Firefox Android:** ekstensinya berjalan di sana, sudah diuji di HP Android.
- **WhatsApp Web:** tersedia sebagai purwarupa. Pencocokan dengan markup aslinya belum diverifikasi.

## "Apa bedanya dengan proteksi bawaan Edge atau Chrome?"
Kami melengkapi, bukan menggantikan. Proteksi bawaan berfokus pada scam dukungan teknis dan umumnya bergantung pada layanan cloud. VeilTrace:
- menjelaskan alasannya dengan bukti;
- berjalan tanpa cloud;
- mengenali bahasa dan modus penipuan Indonesia;
- mencakup empat kategori;
- menjangkau pesan di HP.

## "Mode otomatis berarti membaca semua situs. Bagaimana privasinya?"
- Analisis tetap di perangkat.
- Yang keluar dari tab hanya verdict dan jumlah temuan, untuk tanda di ikon.
- Tidak ada yang dikirim ke internet atau disimpan, dan isian formulir tidak pernah dibaca.
- Mematikan mode otomatis akan mencabut izinnya.
- Semua ini diuji otomatis, termasuk nol permintaan jaringan.

## "Apa relevansinya untuk TNI AD? Apakah mencakup OT?"
- **Relevansi:** lapisan perlindungan manusia bagi personel, PNS, dan keluarga terhadap pencatutan pangkat atau jabatan, penipuan rekrutmen, CS palsu, dan ClickFix.
- **Penggelaran:** cocok untuk jaringan tertutup, bisa dipasang serentak lewat kebijakan browser tanpa konsol pusat, dan tidak menimbulkan masalah privasi baru (UU PDP).
- **OT tidak tercakup.** Kami tidak mengklaimnya.
- **Status:** VeilTrace adalah proyek independen dan tidak berafiliasi dengan TNI AD.

## "Bagaimana kalau penipu menghindari kata-katanya?"
Bisa. Hasil v2 justru menunjukkannya. VeilTrace membaca kombinasi tindakan, dalih, dan tempat, bukan satu kata, sehingga penghindaran butuh usaha lebih. Celah yang kami ketahui:
- parafrase baru;
- teks di dalam gambar;
- penipuan yang belum meminta apa pun di pesan pertama.

Karena itu, pengukuran dan perbaikan berikutnya memakai data nyata yang dikumpulkan dengan OCR lokal, dan penulis aturan tidak pernah melihat bagian ujinya. Hasil "tidak ada temuan" bukan jaminan.

## "Apakah kode ini dibuat dengan AI?"
Ya. Sebagian besar kode, dokumentasi, dan data uji dikembangkan dengan bantuan asisten AI di bawah arahan tim, dan hal ini kami cantumkan di proposal. Set uji v2 dan v3 ditulis oleh instans agen terpisah yang tidak membaca aturan. Keputusan desain tercatat di `docs/DECISIONS.md`.

*Catatan untuk tim: pastikan Anda bisa menjelaskan arsitekturnya sendiri, minimal alur ekstraksi → korelasi → bukti, dan alasan URL tidak dipakai.*
