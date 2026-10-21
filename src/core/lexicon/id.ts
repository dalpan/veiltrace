// Indonesian lexicon, including informal register (pencet, copas) and common English loanwords
// (paste, copy, enter). Written for VEILTRACE (D-012).
import type { LexiconEntry } from '../types.js';
import { B, E, QUOTE, SHELL, WIN, entry } from './patterns.js';

const OBJ = '(?:kode|perintah|teks|skrip|script|isi)(?:nya)?';

export const ID: LexiconEntry[] = [
  // A.OPEN_RUN
  entry('id.open.run_dialog', 'A.OPEN_RUN', 'id', 'strong',
    `${B}buka\\s+(?:jendela\\s+|kotak\\s+(?:dialog\\s+)?|dialog\\s+|aplikasi\\s+)?run${E}`,
    ['Buka jendela Run', 'buka kotak dialog Run']),
  entry('id.open.shell', 'A.OPEN_RUN', 'id', 'strong',
    `${B}(?:buka|jalankan|luncurkan)\\s+(?:aplikasi\\s+)?${SHELL}${E}`,
    ['Buka PowerShell', 'jalankan Terminal', 'buka aplikasi Command Prompt']),
  entry('id.open.search_shell', 'A.OPEN_RUN', 'id', 'strong',
    `${B}(?:cari|ketik(?:kan)?)\\s+${QUOTE}(?:powershell|terminal|cmd|command\\s+prompt)${E}`,
    ['Cari PowerShell', 'ketik "cmd"']),
  entry('id.open.right_click_start', 'A.OPEN_RUN', 'id', 'strong',
    `${B}klik\\s+kanan\\s+(?:pada\\s+)?(?:tombol\\s+|menu\\s+|ikon\\s+|logo\\s+)?(?:start|windows)${E}`,
    ['Klik kanan tombol Start']),
  entry('id.open.hold_win', 'A.OPEN_RUN', 'id', 'weak',
    `${B}(?:tekan|tahan|pencet)\\s+(?:dan\\s+tahan\\s+)?${WIN}${E}`,
    ['Tekan dan tahan tombol Windows', 'pencet tombol Windows']),

  // A.PASTE
  entry('id.paste.object', 'A.PASTE', 'id', 'strong',
    `${B}(?:tempel(?:kan)?|paste(?:kan)?)\\s+${OBJ}${E}`,
    ['Tempelkan kode', 'paste perintahnya']),
  entry('id.paste.into', 'A.PASTE', 'id', 'strong',
    `${B}(?:tempel(?:kan)?|paste(?:kan)?)\\s+(?:[\\p{L}]+\\s+)?(?:ke|di)\\s+(?:dalam\\s+)?(?:kotak|jendela|terminal|powershell|run|kolom|dialog)${E}`,
    ['tempelkan ke kotak Run', 'paste kode di jendela PowerShell']),
  entry('id.paste.copas', 'A.PASTE', 'id', 'weak',
    `${B}(?:copas|salin\\s*(?:dan|&|lalu)\\s*tempel|copy\\s*(?:dan|&)\\s*paste)${E}`,
    ['copas', 'salin dan tempel']),
  entry('id.paste.right_click', 'A.PASTE', 'id', 'strong',
    `${B}klik\\s+kanan\\s+(?:lalu\\s+|untuk\\s+|dan\\s+)?(?:pilih\\s+)?(?:tempel|paste)${E}`,
    ['klik kanan lalu pilih Paste']),
  entry('id.paste.clipboard', 'A.PASTE', 'id', 'weak', `${B}(?:dari|di)\\s+(?:papan\\s+klip|clipboard)${E}`,
    ['dari clipboard', 'di papan klip']),

  // A.EXECUTE
  entry('id.exec.press_enter', 'A.EXECUTE', 'id', 'strong',
    `${B}(?:tekan|pencet|klik|tap)\\s+(?:tombol\\s+)?(?:enter|return)${E}`,
    ['Tekan Enter', 'pencet tombol Enter']),
  entry('id.exec.click_ok', 'A.EXECUTE', 'id', 'weak',
    `${B}(?:klik|tekan|pilih)\\s+(?:tombol\\s+)?${QUOTE}ok${QUOTE}${E}`,
    ['klik OK', 'tekan tombol "OK"']),
  entry('id.exec.run_command', 'A.EXECUTE', 'id', 'strong',
    `${B}(?:jalankan|eksekusi)\\s+${OBJ}${E}`,
    ['jalankan perintah', 'eksekusi kodenya']),
  entry('id.exec.run_it', 'A.EXECUTE', 'id', 'strong', `${B}(?:jalankan|eksekusi)(?:lah)?\\s+(?:itu|ini|tersebut)${E}`,
    ['jalankan ini']),
  entry('id.exec.then_enter', 'A.EXECUTE', 'id', 'strong', `${B}(?:lalu|kemudian|dan)\\s+(?:enter|tekan\\s+enter)${E}`,
    ['Ctrl+V lalu Enter']),

  // A.COPY_TRIGGER
  entry('id.copy.click_button', 'A.COPY_TRIGGER', 'id', 'strong',
    `${B}(?:klik|tekan|ketuk)\\s+(?:tombol|kotak)\\s+${QUOTE}(?:salin|copy|verifikasi|verify|saya\\s+bukan\\s+robot)${E}`,
    ['klik tombol Salin', 'Klik kotak "Saya bukan robot"']),
  entry('id.copy.copy_command', 'A.COPY_TRIGGER', 'id', 'weak',
    `${B}salin\\s+${OBJ}(?:\\s+(?:di\\s+)?(?:bawah|atas)(?:\\s+ini)?)?${E}`,
    ['salin kode di bawah ini']),

  // P.HUMAN_VERIFY (strong pretext)
  entry('id.verify.human', 'P.HUMAN_VERIFY', 'id', 'strong',
    `${B}(?:verifikasi|konfirmasi|buktikan)\\s+(?:bahwa\\s+)?(?:anda|kamu)\\s+(?:adalah\\s+)?(?:manusia|bukan\\s+(?:robot|bot))${E}`,
    ['Verifikasi bahwa Anda manusia', 'buktikan Anda bukan robot']),
  entry('id.verify.not_robot', 'P.HUMAN_VERIFY', 'id', 'strong', `${B}(?:saya|aku)\\s+bukan\\s+(?:robot|bot)${E}`,
    ['Saya bukan robot']),
  entry('id.verify.human_verification', 'P.HUMAN_VERIFY', 'id', 'strong',
    `${B}verifikasi\\s+(?:manusia|captcha|keamanan|robot|bot)${E}`,
    ['Verifikasi manusia', 'verifikasi keamanan']),
  entry('id.verify.verification_id', 'P.HUMAN_VERIFY', 'id', 'strong', `${B}id\\s+verifikasi\\s*[:#]`,
    ['ID Verifikasi: 4821']),
  entry('id.verify.complete', 'P.HUMAN_VERIFY', 'id', 'strong',
    `${B}(?:selesaikan|lengkapi|lanjutkan)\\s+(?:proses\\s+|langkah\\s+)?(?:verifikasi|captcha)${E}`,
    ['Selesaikan verifikasi', 'lengkapi langkah verifikasi']),
  entry('id.verify.steps', 'P.HUMAN_VERIFY', 'id', 'strong', `${B}langkah(?:-langkah)?\\s+verifikasi${E}`,
    ['Langkah-langkah verifikasi']),

  // P.FAKE_FIX (weak pretext)
  entry('id.fix.fix_error', 'P.FAKE_FIX', 'id', 'weak',
    `${B}(?:perbaiki|atasi)\\s+(?:kesalahan|error|masalah|galat)${E}`, ['Perbaiki kesalahan']),
  entry('id.fix.to_resolve', 'P.FAKE_FIX', 'id', 'weak',
    `${B}untuk\\s+(?:mengatasi|memperbaiki|menyelesaikan)\\s+(?:masalah|kesalahan|error)${E}`,
    ['untuk mengatasi masalah ini']),
  entry('id.fix.update_required', 'P.FAKE_FIX', 'id', 'weak',
    `${B}(?:pembaruan|update)\\s+(?:browser|peramban|chrome|driver|font|sistem)(?:\\s+(?:diperlukan|dibutuhkan|wajib))?${E}`,
    ['Pembaruan browser diperlukan']),
  entry('id.fix.error_occurred', 'P.FAKE_FIX', 'id', 'weak', `${B}terjadi\\s+(?:kesalahan|error|galat|masalah)${E}`,
    ['Terjadi kesalahan']),
  entry('id.fix.failed_load', 'P.FAKE_FIX', 'id', 'weak', `${B}gagal\\s+(?:memuat|menampilkan|memutar)${E}`,
    ['Gagal memuat halaman']),
  entry('id.fix.font_missing', 'P.FAKE_FIX', 'id', 'weak', `${B}font\\s+tidak\\s+(?:ditemukan|tersedia)${E}`,
    ['Font tidak ditemukan']),

  // P.URGENCY (weak pretext)
  entry('id.urg.within', 'P.URGENCY', 'id', 'weak', `${B}dalam\\s+(?:waktu\\s+)?\\d+\\s+(?:jam|menit)${E}`,
    ['dalam 24 jam']),
  entry('id.urg.will_be_blocked', 'P.URGENCY', 'id', 'weak',
    `${B}(?:akun|akses|perangkat|komputer)(?:\\s+(?:anda|kamu))?\\s+akan\\s+(?:diblokir|dinonaktifkan|ditangguhkan|dihapus|dikunci)${E}`,
    ['Akun Anda akan diblokir']),
  entry('id.urg.final_warning', 'P.URGENCY', 'id', 'weak', `${B}(?:peringatan|kesempatan)\\s+terakhir${E}`,
    ['Peringatan terakhir']),
  entry('id.urg.act_now', 'P.URGENCY', 'id', 'weak',
    `${B}segera\\s+(?:lakukan|selesaikan|verifikasi|perbaiki)${E}`, ['Segera lakukan']),

  // P.AUTHORITY (weak pretext)
  entry('id.auth.team', 'P.AUTHORITY', 'id', 'weak', `${B}tim\\s+(?:keamanan|teknis|it|dukungan|support)${E}`,
    ['Tim Keamanan']),
  entry('id.auth.official', 'P.AUTHORITY', 'id', 'weak',
    `${B}(?:layanan|dukungan)\\s+(?:pelanggan|teknis)\\s+resmi${E}`, ['layanan pelanggan resmi']),
  entry('id.auth.vendor', 'P.AUTHORITY', 'id', 'weak',
    `${B}(?:tim|dukungan|layanan)\\s+(?:microsoft|windows|apple|google|cloudflare)${E}`, ['Tim Microsoft']),
  entry('id.auth.officer', 'P.AUTHORITY', 'id', 'weak', `${B}petugas\\s+(?:bank|resmi|keamanan)${E}`,
    ['petugas bank']),

  // C.NEGATION cues
  entry('id.neg.cue', 'C.NEGATION', 'id', 'strong',
    `${B}(?:jangan(?:lah)?(?:\\s+pernah|\\s+sekali-kali)?|tidak\\s+boleh|dilarang|hindari)${E}(?!\\s+(?:khawatir|ragu|lupa|panik|cemas|takut|tunggu)${E})`,
    ['Jangan pernah', 'jangan', 'dilarang']),

  // C.REPORTED cues
  entry('id.rep.passive', 'C.REPORTED', 'id', 'strong',
    `${B}(?:korban|pengguna|pengunjung|nasabah|mereka)\\s+(?:diminta|disuruh|diarahkan|diperintahkan|ditipu|dibujuk|diinstruksikan)${E}`,
    ['korban diminta']),
  entry('id.rep.agent', 'C.REPORTED', 'id', 'strong',
    `${B}(?:pelaku|penipu|penyerang|peretas|hacker|halaman\\s+palsu|situs\\s+palsu|modus\\s+ini)\\s+(?:meminta|menyuruh|mengarahkan|memerintahkan|menipu|membujuk|menginstruksikan)${E}`,
    ['Pelaku meminta', 'halaman palsu menyuruh']),
  entry('id.rep.object', 'C.REPORTED', 'id', 'strong',
    `${B}(?:meminta|menyuruh|mengarahkan)\\s+(?:korban|pengguna|pengunjung|nasabah)${E}`,
    ['menyuruh korban']),

  // C.EDUCATIONAL cues
  entry('id.edu.how_to', 'C.EDUCATIONAL', 'id', 'strong',
    `${B}cara\\s+(?:mengenali|menghindari|mendeteksi|mengidentifikasi)${E}`, ['Cara mengenali']),
  entry('id.edu.example_of', 'C.EDUCATIONAL', 'id', 'strong',
    `${B}contoh\\s+(?:modus|penipuan|serangan|phishing)${E}`, ['Contoh modus']),
  entry('id.edu.beware', 'C.EDUCATIONAL', 'id', 'strong',
    `${B}waspada(?:i|lah)?\\s+(?:terhadap\\s+)?(?:modus|penipuan|serangan|phishing|scam)${E}`,
    ['Waspadai modus']),
  entry('id.edu.scam_mode', 'C.EDUCATIONAL', 'id', 'strong',
    `${B}modus\\s+(?:penipuan|baru|clickfix|kejahatan)${E}`, ['modus penipuan']),
  entry('id.edu.signs', 'C.EDUCATIONAL', 'id', 'strong',
    `${B}ciri-ciri\\s+(?:penipuan|phishing|situs\\s+palsu|modus)${E}`, ['Ciri-ciri penipuan']),
  entry('id.edu.tips', 'C.EDUCATIONAL', 'id', 'strong', `${B}tips\\s+keamanan${E}`, ['Tips keamanan']),
];
