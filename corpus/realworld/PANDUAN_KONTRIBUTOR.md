# Panduan Kontributor Data Nyata VeilTrace

Terima kasih telah membantu. Kami mengumpulkan **contoh pesan penipuan dan pesan biasa yang nyata** di Indonesia untuk menguji VeilTrace secara jujur. Data ini harus dikumpulkan dan dilabeli oleh **orang selain pembuat aturan deteksi**.

## Yang kami butuhkan
- **Pesan penipuan:**
  - permintaan kode OTP atau PIN;
  - "CS bank" atau "admin" palsu;
  - hadiah undian yang meminta transfer dulu;
  - kurir yang mengirim file `.apk`;
  - transfer ke rekening pribadi atau di luar aplikasi;
  - alarm virus palsu dengan nomor telepon;
  - CAPTCHA yang menyuruh menekan Win+R.
- **Pesan biasa yang mirip (sama pentingnya):**
  - notifikasi OTP resmi dari bank;
  - pesan kurir asli;
  - tagihan;
  - promo resmi;
  - pesan edukasi "jangan bagikan OTP";
  - berita tentang penipuan.
- Sumber boleh dari WhatsApp, SMS, komentar di situs, email, media sosial, atau kutipan pesan penipu di halaman edukasi OJK, bank, dan berita.

## Aturan wajib
1. **Hanya kirim pesan yang Anda terima sendiri**, atau yang dikutip di sumber publik, dan Anda setuju dibagikan dalam bentuk yang sudah disamarkan.
2. **Jangan pernah membuka tautan atau memasang file dari pesan penipuan**, termasuk untuk mengambil contoh.
3. **Samarkan data pribadi sebelum menyerahkan:**

   | Ganti | Dengan |
   |---|---|
   | Nama orang | `[NAMA]` |
   | Nomor HP | `[NOMOR]` |
   | Nomor rekening | `[NOMOR]` |
   | Kode OTP/PIN asli | `[KODE]` |
   | Tautan | `[TAUTAN]` |
   | Email | `[EMAIL]` |
   | Akun media sosial | `@[AKUN]` |

   Alat `npm run realworld -- redact` membantu, tetapi **nama dan kode pendek harus dicek manual**.
4. **Jangan mengubah isi kalimat lainnya**, termasuk salah ketik dan bahasa gaul. Justru itu yang kami uji.
5. Simpan tangkapan layar asli **di perangkat Anda saja**, lalu hapus setelah teksnya diserahkan. Jangan mengunggahnya ke repositori.

## Cara memberi label (untuk anotator A dan B)
Beri label **sendiri-sendiri, tanpa berdiskusi dan tanpa melihat hasil VeilTrace**:

| Isian | Pilihan |
|---|---|
| `truth` | `malicious` (berniat menipu) atau `benign` |
| `category` | `cmd` (menjalankan perintah) · `cred` (kata sandi/OTP/frasa pemulihan) · `pay` (pembayaran) · `sup` (dukungan/otoritas palsu) · `none` |
| `expected` | `manipulative` (jelas menipu) · `suspicious` (patut dicurigai) · `observed` (permintaan biasa tanpa tanda manipulasi) · `none` |

Ketidaksepakatan antara A dan B diputuskan oleh orang ketiga. Pesan biasa harus memakai `truth: benign`, dan `expected`-nya `observed` atau `none`.

## Penyerahan
Serahkan teks yang sudah disamarkan beserta:
- sumber: `wa`, `sms`, `web-comment`, `web-page`, `email`, `social`, atau `other`;
- konteks: `chat`, `comment`, `page`, atau `dialog`;
- tanggal;
- inisial Anda.

Pengelola repositori menambahkannya dengan `npm run realworld -- add`. Pembagian set pengembangan dan set uji ditentukan otomatis dan tidak boleh diubah.
