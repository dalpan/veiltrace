# Naskah Video Demo VeilTrace (±3 menit)

Untuk direkam tim dengan suara: screen recording laptop (Chrome) dan HP (Cek Pesan, Firefox Android). Video cadangan tanpa suara dapat dibuat otomatis dengan `npm run submission:video` (hasil: `submission/dist/video/veiltrace-demo.mp4`).

## Persiapan (sekali)

1. **Laptop:**
   - `npm ci && npm run build:ext && npm run manual:fixtures`
   - `python3 -m http.server 8080 -d dist/manual`
   - Di `chrome://extensions`: aktifkan Mode pengembang → **Load unpacked** → `dist/extension`, lalu sematkan (pin) VeilTrace. Pastikan popup menampilkan **v0.7.0** dan footer `sup-0.5.0-exp`.
2. **Buka tab berikut secara berurutan, lalu matikan Wi-Fi laptop:**

   | Tab | URL |
   |---|---|
   | 1 | `http://localhost:8080/demo/scenes/cmd-lure.html` (blog resep, CAPTCHA palsu) |
   | 2 | `http://localhost:8080/demo/scenes/cred-lure.html` (marketplace, penjual minta kode) |
   | 3 | `http://localhost:8080/demo/scenes/pay-lure.html` (chat "admin undian") |
   | 4 | `http://localhost:8080/demo/scenes/sup-lure.html` (alarm keamanan palsu) |
   | 5 | `http://localhost:8080/demo/scenes/pay-benign.html` (checkout asli) |

3. **HP:** install Cek Pesan dari https://dalpan.github.io/veiltrace/ (*Install app* / *Add to Home Screen*). Siapkan satu pesan contoh berikut, misalnya di catatan:

   > Selamat kak, saldo bonus 2jt kakak udah siap dicairin ya. tf dlu biaya admin 50rb ke rek admin, abis itu langsung cair ke rekening kakak. buruan ya kak, slotnya cuma sampe jam 12

   Jangan memakai pesan pribadi orang lain di video.
4. Atur bahasa popup ke **ID**. Screen record laptop (macOS: Cmd+Shift+5) dengan mikrofon, dan HP dengan screen recorder bawaan.

## Naskah

| Waktu | Layar | Narasi |
|---|---|---|
| 0:00–0:15 | Kartu judul | "Penipuan hari ini jarang membobol sistem. Penipu membujuk kita untuk membobolnya sendiri, di situs yang sah atau lewat WhatsApp. VeilTrace menunjukkan buktinya, langsung di perangkat." |
| 0:15–0:45 | Tab 1: klik "Saya bukan robot", lalu klik ikon VeilTrace → **Pindai halaman** (scan) | "Blog resep biasa, dengan kotak verifikasi yang menyuruh menekan Windows+R, Ctrl+V, Enter. Ini ClickFix. Wi-Fi saya mati; semuanya berjalan on-device. Hasilnya: manipulative, kategori Command Execution, lengkap dengan alasannya." |
| 0:45–0:55 | Klik **Tunjukkan di halaman** | "Setiap evidence bisa di-highlight langsung di halamannya." |
| 0:55–1:10 | Tab 2, scan | "Penjual di marketplace meminta kode yang masuk ke HP kita. Itu kode OTP, dan VeilTrace menandainya." |
| 1:10–1:25 | Tab 3, scan | "Admin undian: transfer dulu biaya admin, baru hadiahnya cair. Pola advance-fee, ditulis dalam bahasa gaul. Nominal uangnya tidak pernah disalin ke report." |
| 1:25–1:40 | Tab 4, scan | "Fake virus alert dengan nomor telepon. Browser asli tidak pernah menampilkan alert seperti ini di dalam halaman web." |
| 1:40–1:55 | Tab 5, scan | "Checkout asli dengan batas waktu dan virtual account: tidak ditandai berbahaya, alias tidak ada false positive. VeilTrace juga tidak pernah menyebut halaman 'aman'; ia hanya melaporkan apa yang ditemukan." |
| 1:55–2:25 | **HP**: buka Cek Pesan, tempel pesan contoh, **Periksa pesan** (di Android: Share dari WhatsApp → VeilTrace) | "Kebanyakan penipuan datang lewat HP. Cek Pesan memeriksa pesan WhatsApp atau SMS langsung di HP. Teksnya tidak dikirim ke mana pun, bahkan tidak muncul di URL." |
| 2:25–2:40 | HP: Firefox Android, menu → VeilTrace: scan this page (opsional) | "Di Android, extension-nya juga berjalan di Firefox." |
| 2:40–3:00 | Kartu penutup: validasi + link | "Sebelas dari empat belas pesan penipuan nyata terdeteksi, tanpa salah menandai pesan asli. Kami juga menguji on-device AI: ia salah menandai 71% halaman wajar, jadi kami memilih rule yang bisa dijelaskan. VeilTrace: baca instruksinya, bukan URL-nya." |

## Yang tidak boleh diucapkan

- Jangan katakan "aman", "dijamin", "real-time", "memblokir", atau "akurasi X%" tanpa menyebut datanya.
- Jangan menyiratkan bahwa VeilTrace disetujui atau dipakai oleh TNI AD atau instansi mana pun.
- Sebut angka validasi apa adanya: **11 dari 14 pesan penipuan nyata terdeteksi, 0 dari 103 halaman wajar salah ditandai**. Jangan menyebut "akurasi X%" secara umum. Bila juri menanyakan detail evaluasi, gunakan `QNA_JURI.md`.
