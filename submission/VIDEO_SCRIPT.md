# Naskah Video Demo VeilTrace (±3 menit)

Untuk direkam sendiri oleh tim di Google Chrome dengan suara. Video cadangan tanpa suara dapat dibuat otomatis dengan `npm run submission:video` (hasil: `submission/dist/video/veiltrace-demo.mp4`).

## Persiapan (sekali)

1. Siapkan halaman demo dan ekstensinya:
   - `npm ci && npm run build:ext && npm run manual:fixtures`
   - Jalankan `python3 -m http.server 8080 -d dist/manual` dan `python3 -m http.server 8082 -d corpus/cred-dev`.
   - Untuk pembayaran dan dukungan, jalankan juga `python3 -m http.server 8083 -d corpus/pay-dev` dan `python3 -m http.server 8084 -d corpus/sup-dev`.
2. Buka `chrome://extensions`, aktifkan Mode pengembang, klik **Load unpacked**, pilih `dist/extension`, lalu sematkan (pin) VeilTrace.
3. Buka tab-tab berikut berurutan, lalu matikan Wi-Fi:

   | Tab | URL |
   |---|---|
   | 1 | `http://localhost:8080/demo/` |
   | 2 | `http://localhost:8080/demo/benign.html` |
   | 3 | `http://localhost:8082/CA03-id-parafrase-informal/` |
   | 4 | `http://localhost:8083/PD02-id-undian-pajak-hadiah/` |
   | 5 | `http://localhost:8084/SD01-en-fake-virus-overlay-call/` |
   | 6 | `http://localhost:8080/cross-origin.html` |

4. Atur bahasa antarmuka Chrome ke Indonesia, atau klik tombol **ID** di popup.
5. Rekam layar (macOS: Cmd+Shift+5) dengan mikrofon aktif. Tunjukkan bahwa Wi-Fi mati di awal.

## Naskah

| Waktu | Layar | Narasi |
|---|---|---|
| 0:00–0:15 | Kartu judul atau tab 1 | "Penipuan sekarang jarang membobol sistem. Penipu membujuk kita untuk membobol diri sendiri, sering kali di situs yang sah. VeilTrace menunjukkan buktinya." |
| 0:15–0:35 | Tab 1, sorot widget komunitas | "Ini pusat bantuan biasa. Di kolom komunitas ada pesan dari akun yang tampak seperti support: 'verifikasi Anda manusia', tekan Windows+R, Ctrl+V, Enter. Inilah ClickFix." |
| 0:35–1:00 | Klik ikon VeilTrace, lalu **Pindai halaman** | "VeilTrace hanya berjalan saat diminta, dan semuanya di perangkat ini; Wi-Fi saya mati. Hasilnya: konten manipulatif, aturan R1. Setiap klaim punya bukti." |
| 1:00–1:15 | Klik **Tunjukkan di halaman** pada E-02 | "Tombol ini menandai elemennya, tepat di dalam widget komunitas, bukan di artikel milik perusahaan." |
| 1:15–1:30 | Tab 2, pindai | "Halaman yang sama dengan jawaban biasa: tidak ada temuan. VeilTrace tidak pernah menyebut halaman 'aman'; ia hanya melaporkan apa yang ditemukan." |
| 1:30–1:50 | Tab 3, pindai | "Penipuan OTP dengan bahasa gaul: 'kasih liat dong angka yg barusan masuk ke hp lu'. Tetap terdeteksi sebagai permintaan kode yang manipulatif." |
| 1:50–2:10 | Tab 4, pindai | "Hadiah undian yang meminta pajak hadiah ditransfer dulu ke rekening petugas: pola bayar-dulu-untuk-menerima. Nominalnya tidak pernah disalin ke laporan." |
| 2:10–2:30 | Tab 5, pindai | "Alarm virus palsu dengan nomor telepon. Browser asli tidak menampilkan alarm seperti ini di dalam halaman web. Nomor teleponnya tidak disalin." |
| 2:30–2:45 | Tab 6, pindai | "Bagian yang tidak bisa diperiksa, seperti frame dari situs lain, dilaporkan apa adanya: pemindaian sebagian." |
| 2:45–3:00 | `chrome://extensions` → Detail VeilTrace, lalu kartu penutup | "Dua izin saja, tanpa server, tanpa telemetri, dalam Bahasa Indonesia dan Inggris. VeilTrace: lihat buktinya, bukan hanya peringatannya." |

## Yang tidak boleh diucapkan

- Jangan katakan "aman", "dijamin", "real-time", atau "memblokir".
- Jangan menyiratkan bahwa VeilTrace disetujui atau dipakai oleh TNI AD atau instansi mana pun.
- Jika menyebut akurasi, sebutkan angka held-out apa adanya: recall 75%, presisi 81,8%, false positive 14,3% pada 26 skenario sintetis, dengan ketiga target tidak tercapai.
