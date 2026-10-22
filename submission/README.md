# Materi Kartika Cyber Hackathon 2026

Semua materi dalam Bahasa Indonesia (D-080). PDF dibuat dengan `npm run submission:pdf` → `submission/dist/` (tidak di-commit).

| Materi (persyaratan) | Berkas |
|---|---|
| Proposal solusi | [PROPOSAL.md](PROPOSAL.md) → `submission/dist/PROPOSAL.pdf` |
| Dokumentasi teknis | [../docs/README.md](../docs/README.md) dan [../README.md](../README.md) |
| Video demo purwarupa | [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md); cadangan otomatis `npm run submission:video` |
| Slide penjelasan proyek | deck "VeilTrace · Kartika Cyber Hackathon 2026" (diunduh sebagai PPTX/PDF dari artifact milik tim) |
| Tautan karya | https://github.com/dalpan/veiltrace · coba langsung: https://dalpan.github.io/veiltrace/ |
| Persiapan tanya-jawab | [QNA_JURI.md](QNA_JURI.md) |

## Isian formulir "Pengajuan Ide Karya"

**Nama Karya:** VeilTrace: Uncover the Manipulation Behind the Page

**Kategori:** Penangkalan (Defensive Shield)

**Deskripsi:**

> VeilTrace adalah penangkal rekayasa sosial yang berjalan sepenuhnya di perangkat pengguna: ekstensi browser (Chrome, Edge, Firefox termasuk Android) dan aplikasi web "Cek Pesan" untuk pesan WhatsApp/SMS di HP. VeilTrace membaca isi halaman atau pesan, bukan alamatnya, lalu menunjukkan dengan bukti yang dapat disorot kapan teks itu mencoba membuat penggunanya melakukan sesuatu yang merugikan: menjalankan perintah (CAPTCHA palsu/ClickFix), menyerahkan OTP atau password, membayar di muka (refund, hadiah, atau lowongan palsu), atau mengikuti "CS bank"/pejabat palsu.
>
> Manfaat: melindungi personel, PNS, dan keluarga dari penipuan yang memakai identitas institusi (rekrutmen, pencatutan pangkat, CS palsu), termasuk umpan di situs yang sah yang tidak terdeteksi daftar blokir. Tanpa server, tanpa telemetri, dan tanpa internet, sehingga cocok untuk jaringan tertutup dan dapat dipasang serentak lewat kebijakan browser tanpa memantau pengguna (sesuai UU PDP). Kode terbuka dan dapat diaudit.
>
> Status: purwarupa sudah berjalan dengan 4 detektor, dashboard dwibahasa, mode otomatis opt-in, PWA yang sudah online, dan 737 tes otomatis. Evaluasi dilakukan jujur dengan set uji yang dikunci serta pesan penipuan nyata. Kami juga menguji AI di perangkat lalu tidak memakainya karena 71% salah alarm. Selama hackathon, kami memperluas data nyata Indonesia dan menyiapkan pilot penggelaran terkelola.

VeilTrace adalah proyek independen dan tidak berafiliasi dengan TNI AD atau instansi mana pun.
