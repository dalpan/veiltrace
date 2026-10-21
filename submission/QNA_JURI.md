# Persiapan Tanya-Jawab Juri

Jawaban singkat yang jujur untuk pertanyaan yang paling mungkin muncul. Setiap jawaban hanya memuat hal yang sudah ada dan diuji.

## "Kenapa tidak pakai AI?"
VeilTrace berbasis aturan yang dapat dibaca, sehingga **setiap peringatan bisa dijelaskan dan ditunjukkan buktinya di halaman**. Aturan juga tidak bisa dibujuk dengan *prompt injection* dari isi halaman, berjalan luring tanpa model besar, dan hasilnya deterministik. Kelemahannya kami akui: kalimat yang tidak lazim bisa lolos. Karena itu kami membangun set data nyata untuk memperluas kosakata, dan model kecil di perangkat menjadi opsi lanjutan yang harus tetap bisa dijelaskan.

## "Kenapa harus diklik? Korban tidak akan memindai dulu."
Sekarang ada **pemindaian otomatis opt-in**. Pengguna mengaktifkannya dari popup setelah membaca penjelasan dan menyetujui dialog izin Chrome. Halaman lalu diperiksa saat dimuat dan berubah, dan ikon diberi tanda **!** untuk konten manipulatif. Bawaannya tetap manual, demi izin seminimal mungkin. Pengaktifan serentak untuk organisasi masih dalam rencana.

## "Apa bedanya dengan proteksi bawaan Edge atau Chrome?"
Kami melengkapi, bukan menggantikan.
- **Edge Scareware Blocker** dan **Chrome Enhanced Protection** berfokus pada scam dukungan teknis, dan sebagian mengirim sinyal ke layanan cloud.
- **VeilTrace** menjelaskan alasannya dengan bukti, berjalan tanpa cloud, mengenali bahasa dan modus penipuan Indonesia, dan mencakup empat kategori.

## "Seberapa akurat?"
Kami menyebut angkanya apa adanya.
- **Detektor ClickFix:** satu uji held-out pada 26 skenario sintetis menghasilkan recall 75%, presisi 81,8%, dan false positive 14,3%. Ketiga target tidak tercapai.
- **Tiga detektor lain:** masih eksperimental dan hanya diukur pada data pengembangan dari penulis yang sama, sehingga angkanya optimistis.
- **Tahap berikutnya:** set data nyata yang dikumpulkan dan dilabeli orang lain, dengan set uji yang dikunci lebih dulu.

## "Mode otomatis berarti membaca semua situs. Bagaimana privasinya?"
- Analisis tetap di perangkat.
- Yang keluar dari tab hanya ringkasan berupa verdict dan jumlah temuan, untuk tanda di ikon.
- Tidak ada yang dikirim ke internet atau disimpan, dan isian formulir tidak pernah dibaca.
- Mematikannya akan mencabut izin.
- Semua ini diuji otomatis, termasuk nol permintaan jaringan.

## "Apa relevansinya untuk TNI AD? Apakah mencakup OT?"
- **Relevansi:** lapisan perlindungan manusia bagi personel, PNS, dan keluarga terhadap pencatutan nama pejabat, penipuan rekrutmen, CS palsu, dan ClickFix.
- **Kesesuaian dengan jaringan tertutup:** VeilTrace bisa berjalan di jaringan tertutup tanpa server dan dapat diaudit.
- **OT tidak tercakup.** Kami tidak mengklaimnya.
- **Status:** VeilTrace adalah proyek independen dan tidak berafiliasi dengan TNI AD.

## "Bagaimana dengan penipuan lewat WhatsApp?"
Banyak pola WA, seperti permintaan OTP, CS palsu, hadiah, dan bahasa gaul, sudah dikenali saat teksnya muncul di halaman web. Pemindai khusus WhatsApp Web masih dalam rencana, setelah kajian privasi (UU PDP) dan ketentuan layanan. Versi ponsel belum tersedia karena Chrome Android tidak mendukung ekstensi.

## "Apakah kode ini dibuat dengan AI?"
Ya. Sebagian besar kode, dokumentasi, dan data uji dikembangkan dengan bantuan asisten AI di bawah arahan tim, dan hal ini kami cantumkan di proposal. Keputusan desain tercatat di `docs/DECISIONS.md`.

*Catatan untuk tim: pastikan Anda bisa menjelaskan arsitekturnya sendiri.*

## "Bagaimana kalau penipu menghindari kata-katanya?"
Bisa, dan kami mendokumentasikan contohnya: bahasa gaul baru, alarm dengan kalimat baru, dan teks di dalam gambar. VeilTrace membaca kombinasi tindakan, dalih, dan tempat, bukan satu kata, sehingga penghindaran butuh usaha lebih. Meski begitu, hasil "tidak ada temuan" bukan jaminan, dan VeilTrace tidak pernah menyebut halaman "aman".
