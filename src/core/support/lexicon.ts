// Lexicon of the EXPERIMENTAL fake-support and authority-impersonation detector (M5.3), English and Indonesian (including
// informal Indonesian). Written for VEILTRACE (D-012). Negation, reported-speech and educational cues are reused read-only
// from the ClickFix lexicon.
import { AWARENESS_ID, AWARENESS_ID_EXAMPLES, IMPERSONATION_REPORT_ID, IMPERSONATION_REPORT_ID_EXAMPLES } from '../awareness.js';
import { LEXICON } from '../lexicon/index.js';
import { B, E } from '../lexicon/patterns.js';
import type { Lang, Strength } from '../types.js';
import type { SupportLexiconEntry } from './types.js';

function entry(id: string, signal: SupportLexiconEntry['signal'], lang: Lang, strength: Strength, source: string, examples: string[]): SupportLexiconEntry {
  return { id, signal, lang, strength, pattern: new RegExp(source, 'gu'), examples };
}

const REMOTE_TOOL = '(?:anydesk|teamviewer(?:\\s+quick\\s*support)?|quick\\s*support|rustdesk|ultraviewer|supremo|airdroid|remote\\s+desktop|remote\\s+access\\s+(?:app|tool|software))';
const APP = '(?:apps?|application|software|program|tool|apk|\\.apk|aplikasi|apl|file\\s+apk)';

// Indonesian banks, e-wallets and marketplaces most often named in impersonated notices (sup-0.4.0, D-091). A name is a claim only.
const BRAND_ID = '(?:bri|bni|bca|mandiri|bsi|btn|cimb(?:\\s+niaga)?|danamon|permata|dana|ovo|gopay|shopee(?:pay)?|tokopedia|lazada|bukalapak|blibli|akulaku|kredivo|jne|j&t|sicepat|pln|pertamina|telkomsel|indosat|bpjs(?:\\s+kesehatan)?|pos\\s+indonesia|indomaret|alfamart)';

// Winning verbs as written in SMS prize scams, abbreviations included ("tpilih", "mndpt", "m-dptkan", "mendptkn").
const WIN_VERB = "(?:t(?:er)?pil(?:i)?h|terpilh|mendapat(?:kan)?|m['’-]?\\s?dpt(?:kan|kn)?|mndpt(?:kan|kn)?|mendpt(?:kan|kn)?|men-?dpt(?:kan|kn)?|meraih|memenangkan|menang)";

const ACTIONS: SupportLexiconEntry[] = [
  entry('sup.en.contact', 'SC.CONTACT', 'en', 'strong',
    `${B}(?:call|phone|ring|dial|contact|reach|text|message|chat\\s+with|speak\\s+(?:to|with)|talk\\s+to|get\\s+in\\s+touch\\s+with)${E}`,
    ['call', 'contact', 'chat with', 'speak to']),
  entry('sup.id.contact', 'SC.CONTACT', 'id', 'strong',
    `${B}(?:hubungi|hubungin|hub|kontak|telepon|telpon|telp|tlp|tlpn|chat|japri|wa(?=\\s+(?:ke|kami|cs|admin|mimin|min|aja|saja))|hubungi\\s+kami)${E}`,
    ['hubungi', 'hub', 'telp', 'japri', 'wa ke']),
  // Remote control of the reader's device: a tool name with a direction, granting access, or sharing the screen.
  entry('sup.en.remote', 'SA.REMOTE', 'en', 'strong',
    `${B}(?:(?:install|download|open|run|launch|use|start)\\s+(?:the\\s+|our\\s+)?${REMOTE_TOOL}|(?:allow|grant|give)\\s+(?:us\\s+|me\\s+|the\\s+technician\\s+|our\\s+technician\\s+)?remote\\s+(?:access|control)|share\\s+(?:your|the)\\s+screen|(?:read|send|give)\\s+(?:us\\s+|me\\s+)?the\\s+(?:anydesk|teamviewer)\\s+(?:code|id))${E}`,
    ['install AnyDesk', 'download TeamViewer QuickSupport', 'allow remote access', 'share your screen']),
  entry('sup.id.remote', 'SA.REMOTE', 'id', 'strong',
    `${B}(?:(?:instal|install|pasang|unduh|download|dl|donlot|buka|jalankan)\\s+${REMOTE_TOOL}|(?:izinkan|berikan|kasih)\\s+akses\\s+(?:kendali\\s+)?(?:jarak\\s+jauh|remote)|(?:bagikan|share|bagi)\\s+layar|(?:kirim|kasih|sebutkan|berikan)\\s+(?:kode|id)\\s+(?:anydesk|teamviewer))${E}`,
    ['instal AnyDesk', 'izinkan akses jarak jauh', 'berikan akses kendali jarak jauh', 'share layar', 'kirim kode anydesk']),
  // A reply, choice, link or form that moves the reader into the sender's flow (sup-0.4.0, D-091). "Reply STOP" opt-outs are not.
  entry('sup.id.respond', 'SC.RESPOND', 'id', 'strong',
    `${B}(?:balas(?:lah)?\\s+(?:dengan\\s+)?(?:angka\\s+)?(?:\\d|ya|setuju|pesan\\s+ini)|ketik\\s*[,(]*\\s*\\(?\\s*(?:ya|y|setuju|\\d)\\b|kirim(?:kan)?\\s+(?:jawaban|balasan)|(?:klik|buka|kunjungi|akses)\\s+(?:link|tautan|situs|website)|(?:isi|lengkapi)\\s+(?:formulir|form|data\\s+(?:diri|anda))|(?:melalui|lewat|via)\\s+(?:tautan|link)|konfirmasi\\s*/\\s*persetujuan|(?:di\\s?)?wajib(?:kan)?\\s+(?:melakukan\\s+)?(?:verifikasi|pengosongan|pemulihan|menghubungkan|hubungkan)|wajib\\s+hubungkan)${E}`,
    ['balas 1 atau 2', 'ketik,(YA)', 'kirim jawaban', 'klik link', 'isi formulir', 'melalui tautan', 'KONFIRMASI/PERSETUJUAN', 'di wajibkan melakukan verifikasi']),
  entry('sup.en.respond', 'SC.RESPOND', 'en', 'strong',
    `${B}(?:reply\\s+(?:with\\s+)?(?:yes|y|\\d)|(?:click|tap|open|visit)\\s+(?:on\\s+)?(?:the\\s+|this\\s+)?(?:link|here)|fill\\s+(?:in|out)\\s+(?:the\\s+|this\\s+)?form|(?:via|through|using)\\s+the\\s+link)${E}`,
    ['reply YES', 'click the link', 'fill out the form', 'via the link']),
  // A quiz or questionnaire the reader is asked to answer (sup-0.5.0, prize-survey lures).
  entry('sup.id.survey', 'SC.SURVEY', 'id', 'strong',
    `${B}(?:kuesioner|kuisioner|survei|pertanyaan\\s+\\d+\\s+dari\\s+\\d+|jawab(?:lah)?\\s+(?:\\d+\\s+)?pertanyaan)${E}`, ['kuesioner', 'Pertanyaan 1 dari 4', 'jawab 4 pertanyaan']),
  entry('sup.en.survey', 'SC.SURVEY', 'en', 'strong',
    `${B}(?:questionnaire|survey|question\\s+\\d+\\s+of\\s+\\d+|answer\\s+(?:\\d+\\s+)?(?:simple\\s+)?questions)${E}`, ['questionnaire', 'Question 1 of 4']),
  // Installing an app or file the page or message points to.
  entry('sup.en.install', 'SA.INSTALL', 'en', 'strong',
    `${B}(?:install|download)\\s+(?:the\\s+|this\\s+|our\\s+|a\\s+)?(?:[\\p{L}-]+\\s+){0,2}?${APP}${E}`,
    ['install our security app', 'download this application', 'download the apk']),
  entry('sup.id.install', 'SA.INSTALL', 'id', 'strong',
    `${B}(?:instal|install|pasang|unduh|download|dl|donlot)\\s+(?:[\\p{L}-]+\\s+){0,2}?${APP}${E}`,
    ['instal aplikasi', 'unduh aplikasi berikut', 'dl apk', 'download aplikasi cek resi']),
];

const CHANNELS: SupportLexiconEntry[] = [
  // A link in the text. Only its presence counts; the address is never reported or judged (no domain lists, D1).
  entry('sup.link', 'SX.LINK', 'en', 'strong',
    `${B}(?:https?://[^\\s<>"']+|www\\.[^\\s<>"']+|[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:com|id|net|org|xyz|top|site|online|info|link|me|io|app|ly|cc|biz|click|icu|vip|shop)/[^\\s<>"']*)`,
    ['https://example.invalid/x', 'www.example.invalid', 'bio.site/konfirmasi']),
  // Phone numbers (9–15 digits, checked in analyze.ts). The number itself is never reported.
  entry('sup.phone', 'SX.PHONE', 'en', 'strong',
    `${B}(?:\\+\\s?\\d{1,3}[\\s.-]?)?(?:\\(\\d{1,4}\\)\\s?)?\\d{2,5}(?:[\\s.-]\\d{2,5}){1,4}${E}|${B}\\+?\\d{9,15}${E}`,
    ['+1 (888) 555-0199', '0812-3456-7890', '+62 812 3456 7890', '081234567890']),
  entry('sup.en.messenger', 'SX.MESSENGER', 'en', 'strong',
    `${B}(?:whats\\s?app|wa\\.me|telegram|t\\.me|messenger|wechat|viber|line\\s+id|direct\\s+message|dm)${E}`,
    ['WhatsApp', 'Telegram', 'DM']),
  entry('sup.id.messenger', 'SX.MESSENGER', 'id', 'strong',
    `${B}(?:wa|whatsapp|japri|tele|telegram|inbox|dm)${E}`, ['WA', 'japri', 'tele']),
];

const CLAIMS: SupportLexiconEntry[] = [
  entry('sup.en.claim_support', 'SI.SUPPORT', 'en', 'weak',
    `${B}(?:(?:customer|technical|tech)\\s+support|support\\s+(?:team|agent|center|centre|line|desk)|help\\s*desk|customer\\s+(?:service|care)|courier|delivery\\s+(?:agent|team)|official\\s+(?:support|account|team)|(?:certified|authori[sz]ed)\\s+technicians?|(?:microsoft|windows|apple|google)\\s+(?:support|technicians?|helpline))${E}`,
    ['technical support', 'support team', 'help desk', 'Windows support', 'certified technician']),
  entry('sup.id.claim_support', 'SI.SUPPORT', 'id', 'weak',
    `${B}(?:customer\\s+service|cs(?:\\s+(?:resmi|official|kami))?|layanan\\s+pelanggan|call\\s+center|teknisi\\s+resmi|tim\\s+(?:support|dukungan|bantuan)|pusat\\s+bantuan\\s+resmi|kurir(?:\\s+resmi)?|petugas(?:\\s+(?:ekspedisi|pengiriman|resmi))?|dukungan\\s+teknis)${E}`,
    ['customer service', 'CS resmi', 'call center', 'teknisi resmi', 'kurir']),
  entry('sup.en.claim_bank', 'SI.BANK', 'en', 'weak',
    `${B}(?:bank\\s+(?:officer|representative|staff|security|fraud\\s+team)|fraud\\s+(?:department|team|prevention\\s+team)|(?:your|the)\\s+bank${"['’]"}s\\s+(?:security|fraud)\\s+team)${E}`,
    ['bank officer', 'fraud department']),
  entry('sup.id.claim_bank', 'SI.BANK', 'id', 'weak', `${B}(?:petugas\\s+bank|pihak\\s+bank|staf\\s+bank|tim\\s+fraud|cs\\s+bank)${E}`, ['petugas bank', 'pihak bank']),
  // A notice addressed to a bank's customers or signed as a bank (sup-0.4.0): still a claim, never verified.
  entry('sup.id.claim_bank_notice', 'SI.BANK', 'id', 'weak',
    `${B}(?:(?:kepada|yth\\.?)\\s+(?:bpk\\s*/\\s*ibu\\s+|bapak\\s*/\\s*ibu\\s+)?nasabah|nasabah\\s+(?:yang\\s+terhormat|yth|bank)|pt\\.?\\s+bank\\s+\\p{L}+|bank\\s+${BRAND_ID}|${BRAND_ID}\\s+info|kartu\\s+kredit\\s+${BRAND_ID}|kartu\\s+(?:kredit|debit)\\s+(?:bank\\s+)?\\p{L}+(?:\\s+\\p{L}+)?\\s+anda)${E}`,
    ['Kepada Nasabah', 'Nasabah Yang Terhormat', 'PT. Bank Negara', 'Bank BRI', 'BRI Info', 'Kartu Kredit BNI']),
  entry('sup.id.claim_brand_support', 'SI.SUPPORT', 'id', 'weak',
    `${B}(?:${BRAND_ID}\\s+(?:care|cs|official|support|affiliate|indonesia)|(?:cs|customer(?:\\s+service)?|layanan(?:\\s+pelanggan)?|pelayanan|admin|tim|pihak)\\s+(?:resmi\\s+)?${BRAND_ID}|pt\\.?\\s+${BRAND_ID})${E}`,
    ['DANA Care', 'CUSTOMER DANA', 'Layanan Pelanggan Shopee', 'Admin Shopee', 'PT SHOPEE']),
  // A company or institution named with an anniversary, prize or promotion (sup-0.5.0): a claim only, never verified.
  entry('sup.id.claim_org', 'SI.ORG', 'id', 'weak',
    `${B}(?:${BRAND_ID}\\s*[-–·:]?\\s*(?:\\d+\\s*(?:th\\s+)?)?(?:anniversary|hut|ulang\\s+tahun|hadiah|promo)|(?:hut|ulang\\s+tahun|anniversary)\\s+(?:ke-?\\s*\\d+\\s+)?${BRAND_ID})${E}`,
    ['PLN - 81 anniversary', 'HUT ke-81 PLN', 'Pertamina hadiah']),
  entry('sup.en.claim_admin', 'SI.ADMIN', 'en', 'weak',
    `${B}(?:(?:system|site|network|it)\\s+administrator|administrator|admin\\s+team|it\\s+department|moderator\\s+team)${E}`, ['system administrator', 'IT department']),
  entry('sup.id.claim_admin', 'SI.ADMIN', 'id', 'weak', `${B}(?:admin(?:istrator)?(?:\\s+(?:resmi|grup|sistem))?|mimin|tim\\s+it|bagian\\s+it)${E}`, ['admin', 'mimin', 'tim IT']),
  entry('sup.en.claim_security', 'SI.SECURITY', 'en', 'weak',
    `${B}(?:security\\s+(?:team|department|center|centre)|(?:microsoft|windows|apple)\\s+(?:security|defender)|cyber\\s+security\\s+unit)${E}`, ['security team', 'Windows Defender']),
  entry('sup.id.claim_security', 'SI.SECURITY', 'id', 'weak', `${B}(?:tim\\s+keamanan|pusat\\s+keamanan|divisi\\s+keamanan)${E}`, ['tim keamanan']),
  // Ranks, positions and investigators used to impersonate officials (P2, D-087): a claim only, never verified.
  entry('sup.id.claim_official', 'SI.OFFICIAL', 'id', 'weak', `${B}(?:dandim|danrem|pangdam|danyon|danramil|kapolres|kapolda|kapolsek|kasdam|ajudan|babinsa|perwira|komandan|kolonel|letkol|mayor|kapten|lettu|letda|jenderal|brigjen|sertu|serka|pejabat|staf\\s+ahli|penyidik|bagian\\s+penyidikan|petugas\\s+kepolisian|pihak\\s+kepolisian)${E}`, ['Kapten', 'penyidik', 'Dandim', 'pihak kepolisian']),
  entry('sup.en.claim_official', 'SI.OFFICIAL', 'en', 'weak', `${B}(?:colonel|captain|lieutenant|commanding\\s+officer|investigator|detective|police\\s+officer|federal\\s+agent)${E}`, ['investigator', 'police officer']),
];

const PRESSURE: SupportLexiconEntry[] = [
  // A virus, hack or lock asserted about the reader's device or browser; conditionals ("if your PC is infected") are hypothetical.
  entry('sup.en.alert', 'SW.ALERT', 'en', 'strong',
    `${B}(?:(?:your|this)\\s+(?:computer|pc|device|system|browser|phone|mac|windows)\\s+(?:is|has\\s+been|was|may\\s+be)\\s+(?:infected|compromised|hacked|locked|blocked|disabled)|(?:virus(?:es)?|trojans?|malware|spyware|adware)\\s+(?:has\\s+been\\s+|have\\s+been\\s+|were\\s+)?(?:detected|found)\\s+on\\s+(?:your|this)|(?:access\\s+to\\s+)?this\\s+(?:pc|computer)\\s+has\\s+been\\s+blocked|security\\s+breach\\s+detected|do\\s+not\\s+(?:shut\\s+down|restart|turn\\s+off|close)\\s+(?:your\\s+)?(?:computer|pc|this\\s+(?:window|page)))${E}`,
    ['Your computer is infected', 'virus detected on your', 'This PC has been blocked', 'Do not restart your computer']),
  // Detection claims by a named or generic "security" component ("Windows has detected a Zeus trojan", "a threat was detected").
  entry('sup.en.alert_detected', 'SW.ALERT', 'en', 'strong',
    `${B}(?:(?:has|have)\\s+detected\\s+(?:an?\\s+)?(?:[\\p{L}-]+\\s+){0,2}?(?:threat|virus(?:es)?|trojan|malware|spyware|infection|intrusion|hack(?:ing)?\\s+attempt)s?|(?<!(?:no|0|zero)\\s)(?:threats?|virus(?:es)?|trojans?|malware|spyware|infections?)\\s+(?:(?:was|were|has\\s+been|have\\s+been)\\s+)?detected(?:\\s+on\\s+(?:this|your)\\s+(?:device|computer|pc|system))?)${E}`,
    ['Windows has detected a Zeus trojan', 'has detected a threat', 'virus detected on this device']),
  entry('sup.id.alert', 'SW.ALERT', 'id', 'strong',
    `${B}(?:(?:komputer|pc|perangkat|hp|ponsel|laptop|browser)(?:\\s+(?:anda|kamu|mu|nya|bapak\\s*/\\s*ibu))?\\s+(?:telah\\s+|sudah\\s+|sedang\\s+)?(?:terinfeksi|diretas|dibajak|kena\\s+(?:virus|hack|retas)|terkunci|diblokir)|virus\\s+(?:terdeteksi|ditemukan)\\s+(?:di|pada)\\s+(?:perangkat|komputer|hp)|jangan\\s+(?:matikan|restart|tutup)\\s+(?:komputer|pc|halaman|jendela))${E}`,
    ['komputer Anda terinfeksi', 'hp kamu kena virus', 'virus terdeteksi di perangkat', 'jangan matikan komputer']),
  entry('sup.id.alert_detected', 'SW.ALERT', 'id', 'strong',
    `${B}(?:(?:telah\\s+|sudah\\s+)?mendeteksi\\s+(?:adanya\\s+)?(?:ancaman|virus|trojan|malware|spyware|serangan)|(?<!(?:tidak\\s+ada|tak\\s+ada|0)\\s)(?:ancaman|virus|trojan|malware|spyware)\\s+(?:telah\\s+|sudah\\s+)?terdeteksi)${E}`,
    ['telah mendeteksi ancaman', 'virus terdeteksi']),
  entry('sup.en.threat', 'ST.THREAT', 'en', 'weak',
    `${B}(?:(?:account|wallet|card|access|profile|data|files|license)\\s+(?:will\\s+be|has\\s+been|is\\s+being|may\\s+be)\\s+(?:permanently\\s+)?(?:suspended|locked|blocked|disabled|deactivated|closed|terminated|deleted|erased|frozen)|(?:lose|losing)\\s+(?:all\\s+)?(?:your\\s+)?(?:data|files|access|account))${E}`,
    ['account will be suspended', 'data will be deleted', 'lose all your files']),
  entry('sup.id.threat', 'ST.THREAT', 'id', 'weak',
    `${B}(?:(?:akun|rekening|kartu|data|file|nomor)(?:nya|\\s+(?:anda|kamu|mu))?\\s+(?:akan\\s+|bakal\\s+|telah\\s+|sudah\\s+|mau\\s+)?(?:di)?(?:blokir|suspend|nonaktifkan|tutup|bekukan|hapus|banned)|kena\\s+(?:blokir|suspend|banned))${E}`,
    ['akun Anda akan diblokir', 'akunnya bakal disuspend', 'kena blokir']),
  // Account alarms used to open impersonated notices: an unfamiliar sign-in, an unrecognized transaction, a feature or tariff the
  // reader did not ask for (sup-0.4.0, D-091). Genuine notices raise them too; they count only with a claim and a lure.
  entry('sup.id.account_alarm', 'SW.ACCOUNT', 'id', 'weak',
    `${B}(?:percobaan\\s+login|login\\s+(?:dari\\s+perangkat\\s+(?:lain|baru)|tidak\\s+(?:di\\s?)?kenal)|terdeteksi\\s+login|(?:aktivitas|tindakan|transaksi)\\s+(?:yang\\s+)?(?:tidak\\s+biasa|mencurigakan)|(?:trx|transaksi)\\s+(?:yang\\s+)?tidak\\s+(?:anda\\s+)?(?:kenal|kenali)|tidak\\s+merasa\\s+(?:melakukan|mengaktifkan|mengajukan)|perubahan\\s+(?:skema\\s+)?tarif|tarif\\s+baru)${E}`,
    ['Percobaan Login', 'login tidak di kenal', 'aktivitas tidak biasa', 'Trx Tidak Anda Kenal', 'tidak merasa mengaktifkan', 'Perubahan Tarif']),
  entry('sup.en.account_alarm', 'SW.ACCOUNT', 'en', 'weak',
    `${B}(?:(?:unusual|suspicious)\\s+(?:activity|sign-?in|login|transaction)|(?:sign-?in|login)\\s+attempt|unrecogni[sz]ed\\s+(?:transaction|purchase|charge|device|login)|(?:did\\s+not|didn${"['’]"}t)\\s+(?:make|authori[sz]e|request)\\s+this)${E}`,
    ['unusual activity', 'sign-in attempt', 'unrecognized transaction', "didn't authorize this"]),
  // A consequence that applies unless the reader answers, or a criminal penalty (sup-0.4.0).
  entry('sup.id.default_threat', 'ST.THREAT', 'id', 'weak',
    `${B}(?:jika\\s+tidak\\s+ada\\s+(?:konfirmasi|balasan|jawaban)|(?:di\\s?)?anggap\\s+(?:setuju|aktif|menyetujui)|agar\\s+tidak\\s+(?:di\\s?)?(?:berlakukan|kenakan|bebankan)|sanksi\\s+pidana|(?:di\\s?)?pidana\\s+penjara|denda\\s+paling\\s+banyak|auto\\s*debet)${E}`,
    ['JIKA TIDAK ADA KONFIRMASI', 'DI ANGGAP AKTIF', 'agar tidak diberlakukan', 'sanksi pidana', 'di pidana penjara']),
  // A reward offered to start the exchange (points to redeem, vouchers, cash).
  entry('sup.id.reward', 'SP.REWARD', 'id', 'weak',
    `${B}(?:poin\\s+(?:[\\p{L}]+\\s+){0,4}?(?:dapat|bisa)\\s+(?:di\\s?)?tukar(?:kan)?|tukar(?:kan)?\\s+poin|voucher\\s+belanja|uang\\s+tunai|hadiah\\s+(?:undian|langsung|uang))${E}`,
    ['poin Dapat di tukar', 'voucher belanja', 'uang tunai']),
  entry('sup.id.reward_chance', 'SP.REWARD', 'id', 'weak',
    `${B}(?:berkesempatan\\s+(?:untuk\\s+)?(?:mendapatkan|memenangkan|meraih)\\s+(?:uang\\s+)?(?:tunai\\s+)?(?:rp\\.?\\s?\\d[\\d.,]*|hadiah|saldo)|hadiah\\s+(?:tahun\\s+baru|ulang\\s+tahun|hut|anniversary|lebaran|natal|spesial)|anniversary\\s+hadiah|bantuan\\s+(?:sosial|tunai)\\s+(?:sebesar\\s+)?rp)${E}`,
    ['berkesempatan mendapatkan Rp1500000', 'Hadiah Tahun Baru', 'anniversary Hadiah']),
  // Congratulating the reader on a prize they did not enter for.
  entry('sup.id.won', 'SP.WON', 'id', 'weak',
    `${B}(?:selamat\\s*!|selamat\\s*[,!]?\\s*(?:anda|kamu|kak(?:ak)?)\\s+(?:terpilih|mendapatkan|memenangkan|berhak)|anda\\s+(?:terpilih|beruntung|berhak\\s+mendapatkan))`,
    ['Selamat!', 'Selamat, Anda terpilih', 'Anda berhak mendapatkan']),
  // SMS-style prize notices with abbreviations: a number "chosen" as winner, a winner's PIN (sup-0.6.0).
  entry('sup.id.won_sms', 'SP.WON', 'id', 'weak',
    `${B}(?:(?:no(?:mor)?\\.?|norek|nmr|sim\\s*card|rekening|no\\.?\\s*id)\\s*(?:hp|tri|3care|anda|kamu|bpk|ibu|\\s)*(?:resmi\\s+|telah\\s+|t\\s*,\\s*)?${WIN_VERB}|selamat\\s*[,!]?\\s*(?:\\p{L}+\\s+){0,3}?(?:anda|kamu)\\s+(?:telah\\s+)?${WIN_VERB}|(?:sbg|sebagai)\\s+p(?:e)?menang|p(?:e)?menang\\s+ke\\s?-?\\s?\\(?\\d|hadiah\\s+ke\\s?-?\\s?\\(?(?:\\d|i+)|pin\\s*(?:p(?:e)?menang|anda|undian)|selamat\\s+no(?:mor)?\\.?)`,
    ['No anda Terpilih', "No.anda Terpilih M'dpt", 'No anda tpilih mndpt', 'Selamat anda m-dptkan', 'sbg Pemenang', 'Hadiah ke-I', 'Pin Pmenang', 'Norek anda terpilih', 'SELAMAT No.HP']),
  entry('sup.id.reward_sms', 'SP.REWARD', 'id', 'weak',
    `${B}(?:cek\\s+(?:tunai|rp|\\d)|(?:\\d+\\s*)?unit\\s+mobil|tabungan\\s+rp|hadiah|undian|${WIN_VERB}\\s+(?:hadiah|mobil|cek|uang|tabungan))`,
    ['Cek tunai', 'Cek 35jt', '1 Unit MOBIL', 'Tabungan Rp', 'M-dpt Hadiah', 'undian']),
  entry('sup.en.won', 'SP.WON', 'en', 'weak', `${B}(?:congratulations|you(?:${"['’]"}ve|\\s+have)\\s+been\\s+selected|you\\s+are\\s+(?:our\\s+)?(?:lucky|selected))${E}`, ['Congratulations', "you've been selected"]),
  // An offer to get into someone else's messages, account or phone (sup-0.5.0): such services are illegal, and paying for
  // them is a common scam.
  entry('sup.id.illicit', 'SO.ILLICIT', 'id', 'strong',
    `${B}(?:(?:jasa\\s+)?(?:sadap|menyadap|penyadap(?:an)?)\\s+(?:wa|whatsapp|hp|ponsel|telepon|chat|percakapan|akun)|jasa\\s+(?:sadap|hack(?:er)?|bobol|retas|peretas(?:an)?)|(?:hack|bobol|retas|bajak)\\s+akun\\s+(?:wa|whatsapp|ig|instagram|fb|facebook|tiktok|gmail|email|orang)|tanpa\\s+(?:sepengetahuan|diketahui)\\s+(?:target|pemilik|pasangan)|(?:hp|ponsel|nomor|akun)\\s+target)${E}`,
    ['jasa sadap WA', 'menyadap WA', 'hack akun IG', 'tanpa sepengetahuan target', 'HP target']),
  entry('sup.en.illicit', 'SO.ILLICIT', 'en', 'strong',
    `${B}(?:(?:hack|spy\\s+on|monitor)\\s+(?:someone(?:${"['’]"}s)?|any(?:one(?:${"['’]"}s)?)?|your\\s+(?:partner|spouse)(?:${"['’]"}s)?)\\s+(?:whats\\s?app|phone|account|messages)|hacker\\s+for\\s+hire|without\\s+(?:them|the\\s+target)\\s+knowing|target(?:${"['’]"}s)?\\s+phone)${E}`,
    ["hack someone's WhatsApp", 'hacker for hire', 'without them knowing', "target's phone"]),
  // A buyer or tenant who sends the reader to a relative or "proxy" to settle the price or payment (fake-buyer scams).
  entry('sup.id.proxy', 'SO.PROXY', 'id', 'strong',
    `${B}(?:hub(?:ungi)?|tlp|telp|telepon|kontak|nego(?:siasi)?|bicarakan)\\.?\\s+(?:\\p{L}+\\s+){0,3}?(?:suami|istri|saudara|sodara|bapa|bapak|ayah|kakak|adik|om|paman)\\s+(?:sy|saya|aku)${E}`,
    ['hubungi suami saya', 'hub saudara sy', 'Mohon hub Bapa sy', 'nego hrg silahkan Hub saudara sy']),
  entry('sup.en.reward', 'SP.REWARD', 'en', 'weak', `${B}(?:redeem\\s+(?:your\\s+)?points|reward\\s+points|cash\\s+prize|shopping\\s+voucher)${E}`, ['redeem your points', 'cash prize']),
  entry('sup.en.urgency', 'SU.URGENCY', 'en', 'weak',
    `${B}(?:(?<!(?:expires?|valid\\s+for|valid)\\s)within\\s+\\d+\\s+(?:minutes?|mins?|hours?|hrs?)|immediately|right\\s+now|act\\s+now|urgent(?:ly)?|as\\s+soon\\s+as\\s+possible|asap|final\\s+warning)${E}`,
    ['immediately', 'within 5 minutes', 'urgent']),
  entry('sup.id.urgency', 'SU.URGENCY', 'id', 'weak',
    `${B}(?:dalam\\s+(?:waktu\\s+)?\\d+\\s+(?:menit|jam)|segerah?|secepat\\s+mungkin|sekarang\\s+juga|secepatnya|buruan|cpt|cepetan|skrg\\s+juga|hari\\s+ini\\s+juga|peringatan\\s+terakhir)${E}`,
    ['segera', 'buruan', 'cpt', 'dalam 10 menit']),
];

const OWN_CONTEXT: SupportLexiconEntry[] = [
  // Makes an alert a condition ("if your PC is infected") or something a message says ("a pop-up that says …"), not an assertion.
  entry('sup.en.hypothetical', 'SH.UNASSERTED', 'en', 'strong', `${B}(?:if|when|whenever|in\\s+case)${E}`, ['if', 'when']),
  entry('sup.id.hypothetical', 'SH.UNASSERTED', 'id', 'strong', `${B}(?:jika|jikalau|kalau|kalo|apabila|bila|seandainya)${E}`, ['jika', 'kalau', 'apabila']),
  entry('sup.en.attributed', 'SH.UNASSERTED', 'en', 'strong', `${B}(?:says|saying|said|claims?|claiming|warns?|warning\\s+that|states?|stating)(?:\\s+that)?${E}`,
    ['that says', 'claiming', 'warns that']),
  entry('sup.id.attributed', 'SH.UNASSERTED', 'id', 'strong', `${B}(?:yang\\s+)?(?:menyatakan|mengatakan|bilang|menyebut(?:kan)?|mengklaim)(?:\\s+bahwa)?${E}`,
    ['yang menyatakan', 'mengklaim', 'bilang']),
];

/** Context cues reused unchanged from the ClickFix lexicon (negation, reported speech, educational framing). */
/** Awareness phrasing ("waspadai pesan yang mengatasnamakan …"), shared with the credential and payment detectors. */
const AWARENESS: SupportLexiconEntry[] = [entry('sup.id.awareness', 'C.EDUCATIONAL', 'id', 'strong', AWARENESS_ID, AWARENESS_ID_EXAMPLES),
  entry('sup.id.impersonation_report', 'C.REPORTED', 'id', 'strong', IMPERSONATION_REPORT_ID, IMPERSONATION_REPORT_ID_EXAMPLES)];

const SHARED_CONTEXT: SupportLexiconEntry[] = LEXICON
  .filter((e) => e.signal === 'C.NEGATION' || e.signal === 'C.REPORTED' || e.signal === 'C.EDUCATIONAL')
  .map((e) => ({ ...e, signal: e.signal as 'C.NEGATION' | 'C.REPORTED' | 'C.EDUCATIONAL' }));

export const SUPPORT_LEXICON: readonly SupportLexiconEntry[] = [...ACTIONS, ...CHANNELS, ...CLAIMS, ...PRESSURE, ...OWN_CONTEXT, ...AWARENESS, ...SHARED_CONTEXT];
