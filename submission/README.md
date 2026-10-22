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

> VeilTrace adalah tool anti-social engineering yang berjalan sepenuhnya on-device, dalam dua bentuk: browser extension (Chrome, Edge, Firefox termasuk Android) dan PWA "Cek Pesan" untuk memeriksa pesan WhatsApp/SMS di HP. VeilTrace membaca isi halaman atau pesan, bukan URL-nya, lalu menunjukkan dengan bukti yang bisa di-highlight kapan teks itu mencoba membuat pengguna melakukan sesuatu yang merugikan, misalnya:
> - menjalankan command (CAPTCHA palsu/ClickFix);
> - menyerahkan OTP atau password;
> - membayar di muka (refund, hadiah, atau lowongan palsu);
> - mengikuti "CS bank" atau pejabat palsu.
>
> **Manfaat:** melindungi personel, PNS, dan keluarga dari penipuan yang memakai identitas institusi (rekrutmen, pencatutan pangkat, CS palsu), termasuk lure di situs resmi yang lolos dari URL blocklist. VeilTrace berjalan tanpa server, tanpa telemetry, dan tanpa internet, sehingga cocok untuk air-gapped network. Managed deployment lewat browser policy dimungkinkan tanpa memantau pengguna (sesuai UU PDP). Seluruhnya open source dan auditable.
>
> **Status:** prototype sudah berjalan dengan 4 detector, dashboard bilingual, auto-scan opt-in, PWA yang sudah live, dan 737 automated test. Evaluasi dilakukan secara jujur memakai held-out test set yang di-lock dan pesan penipuan nyata. On-device AI juga sudah kami uji, lalu tidak dipakai karena false positive rate-nya 71%. Selama hackathon kami memperluas dataset pesan nyata Indonesia dan menyiapkan pilot managed deployment.

VeilTrace adalah proyek independen dan tidak berafiliasi dengan TNI AD atau instansi mana pun.
