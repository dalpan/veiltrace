// Lexicon of the EXPERIMENTAL fake-support and authority-impersonation detector (M5.3), English and Indonesian (including
// informal Indonesian). Written for VEILTRACE (D-012). Negation, reported-speech and educational cues are reused read-only
// from the ClickFix lexicon.
import { LEXICON } from '../lexicon/index.js';
import { B, E } from '../lexicon/patterns.js';
import type { Lang, Strength } from '../types.js';
import type { SupportLexiconEntry } from './types.js';

function entry(id: string, signal: SupportLexiconEntry['signal'], lang: Lang, strength: Strength, source: string, examples: string[]): SupportLexiconEntry {
  return { id, signal, lang, strength, pattern: new RegExp(source, 'gu'), examples };
}

const REMOTE_TOOL = '(?:anydesk|teamviewer(?:\\s+quick\\s*support)?|quick\\s*support|rustdesk|ultraviewer|supremo|airdroid|remote\\s+desktop|remote\\s+access\\s+(?:app|tool|software))';
const APP = '(?:apps?|application|software|program|tool|apk|\\.apk|aplikasi|apl|file\\s+apk)';

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
    `${B}(?:(?:instal|install|pasang|unduh|download|dl|donlot|buka|jalankan)\\s+${REMOTE_TOOL}|(?:izinkan|berikan|kasih)\\s+akses\\s+(?:jarak\\s+jauh|remote)|(?:bagikan|share|bagi)\\s+layar|(?:kirim|kasih|sebutkan|berikan)\\s+(?:kode|id)\\s+(?:anydesk|teamviewer))${E}`,
    ['instal AnyDesk', 'izinkan akses jarak jauh', 'share layar', 'kirim kode anydesk']),
  // Installing an app or file the page or message points to.
  entry('sup.en.install', 'SA.INSTALL', 'en', 'strong',
    `${B}(?:install|download)\\s+(?:the\\s+|this\\s+|our\\s+|a\\s+)?(?:[\\p{L}-]+\\s+){0,2}?${APP}${E}`,
    ['install our security app', 'download this application', 'download the apk']),
  entry('sup.id.install', 'SA.INSTALL', 'id', 'strong',
    `${B}(?:instal|install|pasang|unduh|download|dl|donlot)\\s+(?:[\\p{L}-]+\\s+){0,2}?${APP}${E}`,
    ['instal aplikasi', 'unduh aplikasi berikut', 'dl apk', 'download aplikasi cek resi']),
];

const CHANNELS: SupportLexiconEntry[] = [
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
    `${B}(?:customer\\s+service|cs(?:\\s+(?:resmi|official|kami))?|layanan\\s+pelanggan|call\\s+center|teknisi\\s+resmi|tim\\s+(?:support|dukungan|bantuan)|pusat\\s+bantuan\\s+resmi|kurir(?:\\s+resmi)?|petugas\\s+(?:ekspedisi|pengiriman))${E}`,
    ['customer service', 'CS resmi', 'call center', 'teknisi resmi', 'kurir']),
  entry('sup.en.claim_bank', 'SI.BANK', 'en', 'weak',
    `${B}(?:bank\\s+(?:officer|representative|staff|security|fraud\\s+team)|fraud\\s+(?:department|team|prevention\\s+team)|(?:your|the)\\s+bank${"['’]"}s\\s+(?:security|fraud)\\s+team)${E}`,
    ['bank officer', 'fraud department']),
  entry('sup.id.claim_bank', 'SI.BANK', 'id', 'weak', `${B}(?:petugas\\s+bank|pihak\\s+bank|staf\\s+bank|tim\\s+fraud|cs\\s+bank)${E}`, ['petugas bank', 'pihak bank']),
  entry('sup.en.claim_admin', 'SI.ADMIN', 'en', 'weak',
    `${B}(?:(?:system|site|network|it)\\s+administrator|administrator|admin\\s+team|it\\s+department|moderator\\s+team)${E}`, ['system administrator', 'IT department']),
  entry('sup.id.claim_admin', 'SI.ADMIN', 'id', 'weak', `${B}(?:admin(?:istrator)?(?:\\s+(?:resmi|grup|sistem))?|mimin|tim\\s+it|bagian\\s+it)${E}`, ['admin', 'mimin', 'tim IT']),
  entry('sup.en.claim_security', 'SI.SECURITY', 'en', 'weak',
    `${B}(?:security\\s+(?:team|department|center|centre)|(?:microsoft|windows|apple)\\s+(?:security|defender)|cyber\\s+security\\s+unit)${E}`, ['security team', 'Windows Defender']),
  entry('sup.id.claim_security', 'SI.SECURITY', 'id', 'weak', `${B}(?:tim\\s+keamanan|pusat\\s+keamanan|divisi\\s+keamanan)${E}`, ['tim keamanan']),
];

const PRESSURE: SupportLexiconEntry[] = [
  // A virus, hack or lock asserted about the reader's device or browser; conditionals ("if your PC is infected") are hypothetical.
  entry('sup.en.alert', 'SW.ALERT', 'en', 'strong',
    `${B}(?:(?:your|this)\\s+(?:computer|pc|device|system|browser|phone|mac|windows)\\s+(?:is|has\\s+been|was|may\\s+be)\\s+(?:infected|compromised|hacked|locked|blocked|disabled)|(?:virus(?:es)?|trojans?|malware|spyware|adware)\\s+(?:has\\s+been\\s+|have\\s+been\\s+|were\\s+)?(?:detected|found)\\s+on\\s+(?:your|this)|(?:access\\s+to\\s+)?this\\s+(?:pc|computer)\\s+has\\s+been\\s+blocked|security\\s+breach\\s+detected|do\\s+not\\s+(?:shut\\s+down|restart|turn\\s+off|close)\\s+(?:your\\s+)?(?:computer|pc|this\\s+(?:window|page)))${E}`,
    ['Your computer is infected', 'virus detected on your', 'This PC has been blocked', 'Do not restart your computer']),
  entry('sup.id.alert', 'SW.ALERT', 'id', 'strong',
    `${B}(?:(?:komputer|pc|perangkat|hp|ponsel|laptop|browser)(?:\\s+(?:anda|kamu|mu|nya))?\\s+(?:telah\\s+|sudah\\s+|sedang\\s+)?(?:terinfeksi|diretas|dibajak|kena\\s+(?:virus|hack|retas)|terkunci|diblokir)|virus\\s+(?:terdeteksi|ditemukan)\\s+(?:di|pada)\\s+(?:perangkat|komputer|hp)|jangan\\s+(?:matikan|restart|tutup)\\s+(?:komputer|pc|halaman|jendela))${E}`,
    ['komputer Anda terinfeksi', 'hp kamu kena virus', 'virus terdeteksi di perangkat', 'jangan matikan komputer']),
  entry('sup.en.threat', 'ST.THREAT', 'en', 'weak',
    `${B}(?:(?:account|wallet|card|access|profile|data|files|license)\\s+(?:will\\s+be|has\\s+been|is\\s+being|may\\s+be)\\s+(?:permanently\\s+)?(?:suspended|locked|blocked|disabled|deactivated|closed|terminated|deleted|erased|frozen)|(?:lose|losing)\\s+(?:all\\s+)?(?:your\\s+)?(?:data|files|access|account))${E}`,
    ['account will be suspended', 'data will be deleted', 'lose all your files']),
  entry('sup.id.threat', 'ST.THREAT', 'id', 'weak',
    `${B}(?:(?:akun|rekening|kartu|data|file|nomor)(?:nya|\\s+(?:anda|kamu|mu))?\\s+(?:akan\\s+|bakal\\s+|telah\\s+|sudah\\s+|mau\\s+)?(?:di)?(?:blokir|suspend|nonaktifkan|tutup|bekukan|hapus|banned)|kena\\s+(?:blokir|suspend|banned))${E}`,
    ['akun Anda akan diblokir', 'akunnya bakal disuspend', 'kena blokir']),
  entry('sup.en.urgency', 'SU.URGENCY', 'en', 'weak',
    `${B}(?:(?<!(?:expires?|valid\\s+for|valid)\\s)within\\s+\\d+\\s+(?:minutes?|mins?|hours?|hrs?)|immediately|right\\s+now|act\\s+now|urgent(?:ly)?|as\\s+soon\\s+as\\s+possible|asap|final\\s+warning)${E}`,
    ['immediately', 'within 5 minutes', 'urgent']),
  entry('sup.id.urgency', 'SU.URGENCY', 'id', 'weak',
    `${B}(?:dalam\\s+(?:waktu\\s+)?\\d+\\s+(?:menit|jam)|segera|sekarang\\s+juga|secepatnya|buruan|cpt|cepetan|skrg\\s+juga|hari\\s+ini\\s+juga|peringatan\\s+terakhir)${E}`,
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
const SHARED_CONTEXT: SupportLexiconEntry[] = LEXICON
  .filter((e) => e.signal === 'C.NEGATION' || e.signal === 'C.REPORTED' || e.signal === 'C.EDUCATIONAL')
  .map((e) => ({ ...e, signal: e.signal as 'C.NEGATION' | 'C.REPORTED' | 'C.EDUCATIONAL' }));

export const SUPPORT_LEXICON: readonly SupportLexiconEntry[] = [...ACTIONS, ...CHANNELS, ...CLAIMS, ...PRESSURE, ...OWN_CONTEXT, ...SHARED_CONTEXT];
