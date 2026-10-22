# Naskah Video Demo VeilTrace (±3 menit)

Untuk direkam tim dengan suara: layar laptop (Chrome) dan layar HP (Cek Pesan, Firefox Android). Video cadangan tanpa suara dapat dibuat otomatis dengan `npm run submission:video` (hasil: `submission/dist/video/veiltrace-demo.mp4`).

## Persiapan (sekali)

1. **Laptop:**
   - `npm ci && npm run build:ext && npm run manual:fixtures`
   - `python3 -m http.server 8080 -d dist/manual`
   - Di `chrome://extensions`: aktifkan Mode pengembang → **Load unpacked** → `dist/extension`, lalu sematkan (pin) VeilTrace. Pastikan popup menampilkan **v0.7.0** dan footer `sup-0.5.0-exp`.
2. **Buka tab berurutan, lalu matikan Wi-Fi laptop:**

   | Tab | URL |
   |---|---|
   | 1 | `http://localhost:8080/demo/scenes/cmd-lure.html` (blog resep, CAPTCHA palsu) |
   | 2 | `http://localhost:8080/demo/scenes/cred-lure.html` (marketplace, penjual minta kode) |
   | 3 | `http://localhost:8080/demo/scenes/pay-lure.html` (chat "admin undian") |
   | 4 | `http://localhost:8080/demo/scenes/sup-lure.html` (alarm keamanan palsu) |
   | 5 | `http://localhost:8080/demo/scenes/pay-benign.html` (checkout asli) |

3. **HP:** pasang Cek Pesan dari https://dalpan.github.io/veiltrace/ (*Install app* / *Add to Home Screen*). Siapkan satu pesan contoh berikut, misalnya di catatan:

   > Selamat kak, saldo bonus 2jt kakak udah siap dicairin ya. tf dlu biaya admin 50rb ke rek admin, abis itu langsung cair ke rekening kakak. buruan ya kak, slotnya cuma sampe jam 12

   Jangan memakai pesan pribadi orang lain di video.
4. Atur bahasa popup ke **ID**. Rekam layar laptop (macOS: Cmd+Shift+5) dengan mikrofon, dan rekam layar HP dengan perekam bawaan.

## Naskah

| Waktu | Layar | Narasi |
|---|---|---|
| 0:00–0:15 | Kartu judul | "Penipuan hari ini jarang membobol sistem. Penipu membujuk kita untuk membobolnya sendiri, di situs yang sah atau lewat WhatsApp. VeilTrace menunjukkan buktinya, langsung di perangkat." |
| 0:15–0:45 | Tab 1: klik "Saya bukan robot", lalu VeilTrace → **Pindai halaman** | "Blog resep biasa, dengan kotak verifikasi yang menyuruh menekan Windows+R, Ctrl+V, Enter. Ini ClickFix. Wi-Fi saya mati, semuanya berjalan di laptop ini. Hasilnya konten manipulatif, kategori perintah, lengkap dengan alasannya." |
| 0:45–0:55 | Klik **Tunjukkan di halaman** | "Setiap bukti bisa disorot langsung di halamannya." |
| 0:55–1:10 | Tab 2, pindai | "Penjual di marketplace meminta kode yang masuk ke HP kita. Itu kode OTP, dan VeilTrace menandainya." |
| 1:10–1:25 | Tab 3, pindai | "Admin undian: transfer dulu biaya admin, baru hadiahnya cair. Pola bayar-dulu-untuk-menerima, dalam bahasa gaul. Nominal uangnya tidak pernah disalin ke laporan." |
| 1:25–1:40 | Tab 4, pindai | "Alarm virus palsu dengan nomor telepon. Browser asli tidak pernah menampilkan alarm seperti ini di dalam halaman web." |
| 1:40–1:55 | Tab 5, pindai | "Checkout asli dengan batas waktu dan virtual account: tidak ditandai berbahaya. VeilTrace juga tidak pernah menyebut halaman 'aman'; ia hanya melaporkan apa yang ditemukan." |
| 1:55–2:25 | **HP**: buka Cek Pesan, tempel pesan contoh, **Periksa pesan** (di Android: Bagikan dari WhatsApp → VeilTrace) | "Kebanyakan penipuan datang lewat HP. Cek Pesan memeriksa pesan WhatsApp atau SMS di HP itu sendiri. Teksnya tidak dikirim ke mana pun, bahkan tidak muncul di alamat halaman." |
| 2:25–2:40 | HP: Firefox Android, menu → VeilTrace: pindai halaman (opsional) | "Di Android, ekstensinya juga berjalan di Firefox." |
| 2:40–3:00 | Kartu penutup: hasil evaluasi + tautan | "Kami menguji diri sendiri dengan set uji yang dikunci, dan mengumumkan hasilnya apa adanya. Kami juga menguji AI di perangkat, lalu tidak memakainya karena 71% salah alarm. VeilTrace: baca instruksinya, bukan alamatnya." |

## Yang tidak boleh diucapkan

- Jangan katakan "aman", "dijamin", "real-time", "memblokir", atau "akurasi X%" tanpa menyebut datanya.
- Jangan menyiratkan bahwa VeilTrace disetujui atau dipakai oleh TNI AD atau instansi mana pun.
- Jika menyebut akurasi, sebutkan apa adanya:
  - v2: recall 34% pada 60 skenario buta;
  - pesan nyata: 11 dari 14 tertandai, dan itu angka pengembangan;
  - hasil v3 dan data nyata bagian uji, bila sudah dijalankan.
