// Lexicon of the EXPERIMENTAL credential-disclosure detector (M5.1), English and Indonesian. Written for VEILTRACE (D-012).
// Negation, reported-speech and educational cues are reused read-only from the ClickFix lexicon.
import { LEXICON } from '../lexicon/index.js';
import { B, E } from '../lexicon/patterns.js';
import type { Lang, Strength } from '../types.js';
import type { CredLexiconEntry } from './types.js';

function entry(id: string, signal: CredLexiconEntry['signal'], lang: Lang, strength: Strength, source: string, examples: string[]): CredLexiconEntry {
  return { id, signal, lang, strength, pattern: new RegExp(source, 'gu'), examples };
}

const YOUR = '(?:your\\s+|the\\s+|this\\s+|that\\s+|my\\s+|a\\s+|any\\s+)?';
const ANDA = '(?:\\s+(?:anda|kamu|mu|nya|lu|lo|elu|loe|tersebut|ini|itu))?';

const SECRETS: CredLexiconEntry[] = [
  entry('cred.en.secret.password', 'S.PASSWORD', 'en', 'strong', `${B}(?:password|passcode|passwd)s?${E}`, ['password', 'Passcode']),
  entry('cred.en.secret.otp', 'S.OTP', 'en', 'strong',
    `${B}(?:one[\\s-]?time\\s+(?:pass)?code|otp(?:\\s+code)?|verification\\s+code|security\\s+code|login\\s+code|sign[\\s-]?in\\s+code|2fa\\s+code|authentication\\s+code|sms\\s+code|(?:6|six|4|four)[\\s-]?digit\\s+code|code\\s+(?:we|i|you)\\s+(?:just\\s+)?(?:sent|texted|received)|code\\s+(?:sent|texted)\\s+to\\s+your\\s+(?:phone|number|mobile|email))${E}`,
    ['one-time code', 'OTP', 'verification code', 'the 6-digit code', 'code we just sent', 'code sent to your phone']),
  entry('cred.en.secret.pin', 'S.PIN', 'en', 'strong', `${B}(?:atm\\s+|card\\s+|account\\s+|wallet\\s+)?pin(?:\\s+(?:code|number))?${E}`, ['PIN', 'ATM PIN']),
  entry('cred.en.secret.recovery_code', 'S.RECOVERY_CODE', 'en', 'strong', `${B}(?:recovery|backup)\\s+codes?${E}`, ['recovery code', 'backup codes']),
  entry('cred.en.secret.seed', 'S.SEED_PHRASE', 'en', 'strong',
    `${B}(?:(?:secret\\s+)?recovery\\s+phrase|seed\\s+(?:phrase|words?)|mnemonic(?:\\s+phrase)?|(?:12|24|twelve|twenty[\\s-]four)[\\s-]words?(?:\\s+(?:recovery\\s+)?phrase)?|wallet\\s+phrase|private\\s+key)${E}`,
    ['Secret Recovery Phrase', 'seed phrase', '12-word phrase', 'private key']),
  entry('cred.en.secret.token', 'S.TOKEN', 'en', 'strong',
    `${B}(?:(?:auth(?:entication)?|access|session|api|bearer|login)\\s+tokens?|session\\s+cookies?)${E}`, ['session token', 'API token', 'session cookie']),

  entry('cred.id.secret.password', 'S.PASSWORD', 'id', 'strong', `${B}(?:kata\\s+sandi|sandi|kata\\s+kunci)${E}`, ['kata sandi', 'sandi']),
  entry('cred.id.secret.otp', 'S.OTP', 'id', 'strong',
    `${B}(?:kode\\s+(?:otp|verif(?:ikasi)?|keamanan|sms|aktivasi)|otp|kode\\s+(?:(?:yang|yg)\\s+)?(?:barusan\\s+|baru\\s+|tadi\\s+)?(?:masuk|dikirim|terkirim|nyampe|sampe)(?:\\s+(?:ke|di|lewat)\\s+(?:hp|ponsel|sms|nomor|wa|whatsapp)(?:\\s+(?:anda|kamu|mu|lu|lo|elu))?)?|kode\\s+(?:6|enam)\\s+digit)${E}`,
    ['kode OTP', 'kode verifikasi', 'kode verif', 'kode yang masuk ke HP', 'kode yg barusan masuk', 'kode yang dikirim']),
  // Informal: the code described only as digits that just arrived ("angka yg barusan masuk ke hp lu", "6 angka dari sms tadi").
  entry('cred.id.secret.otp_digits', 'S.OTP', 'id', 'strong',
    `${B}(?:(?:\\d|enam|empat)\\s+)?(?:angka|digit)\\s+(?:(?:yang|yg)\\s+(?:barusan\\s+|baru\\s+(?:aja\\s+|saja\\s+)?|tadi\\s+)?(?:masuk|dikirim|nyampe|sampe|sampai|muncul)|dari\\s+(?:sms|wa|whatsapp))(?:\\s+(?:ke|di)\\s+(?:hp|ponsel|wa|nomor)(?:\\s+(?:anda|kamu|mu|lu|lo|elu))?)?${E}`,
    ['angka yg barusan masuk ke hp lu', '6 angka dari sms', 'angka yang masuk']),
  entry('cred.id.secret.pin', 'S.PIN', 'id', 'strong', `${B}pin(?:\\s+(?:atm|m-?banking|kartu|transaksi))?${E}`, ['PIN', 'PIN ATM']),
  entry('cred.id.secret.recovery_code', 'S.RECOVERY_CODE', 'id', 'strong', `${B}kode\\s+(?:pemulihan|cadangan)${E}`, ['kode pemulihan']),
  entry('cred.id.secret.seed', 'S.SEED_PHRASE', 'id', 'strong',
    `${B}(?:frasa\\s+(?:pemulihan|rahasia|benih|dompet)|(?:12|24)\\s+kata(?:\\s+(?:rahasia|pemulihan))?|kunci\\s+privat)${E}`,
    ['frasa pemulihan', '12 kata rahasia', 'kunci privat']),
  entry('cred.id.secret.token', 'S.TOKEN', 'id', 'strong', `${B}token\\s+(?:akses|sesi|login)${E}`, ['token akses']),
];

const DISCLOSURE: CredLexiconEntry[] = [
  // Giving a secret to a person or channel. Legitimate services ask you to type codes into their own form, never to send them on.
  entry('cred.en.send', 'D.SEND', 'en', 'strong',
    `${B}(?:send|share|give|tell|forward|text|dm|message|read\\s+out|reply\\s+with|respond\\s+with|post|comment|paste\\s+(?:it\\s+)?(?:here|below|in\\s+the\\s+(?:chat|comments?|reply|thread)))(?:\\s+(?:me|us|him|her|them|the\\s+agent|our\\s+(?:team|agent)|support|it))?${E}`,
    ['send', 'share', 'reply with', 'tell me', 'post', 'paste it here']),
  entry('cred.id.send', 'D.SEND', 'id', 'strong',
    `${B}(?:(?:kirim|mengirim)(?:kan)?|kirimin|(?:mem)?bagikan|(?:mem)?berikan|(?:mem)?beri(?:tahu|kan)|kasih(?:\\s+(?:tau|tahu|liat|lihat))?|(?:sebutkan|menyebutkan|sebutin)|(?:mem)?bacakan|bacain|balas\\s+dengan|tulis(?:kan|in)?\\s+di\\s+(?:kolom\\s+)?komentar|japri|dm|spill|fotoin|ss(?:in)?|screenshot(?:in)?)${E}`,
    ['kirimkan', 'mengirim', 'kirimin', 'berikan', 'memberikan', 'kasih tau', 'kasih liat', 'sebutkan', 'sebutin', 'balas dengan', 'spill']),
  // Typing a secret into the page.
  entry('cred.en.enter', 'D.ENTER', 'en', 'strong',
    `${B}(?:enter|type|input|provide|confirm|submit|fill\\s+in|key\\s+in|re-?enter|paste)${E}`, ['Enter', 'type', 're-enter', 'fill in']),
  entry('cred.id.enter', 'D.ENTER', 'id', 'strong',
    `${B}(?:masukkan|masukan|masukin|isi(?:kan|in)?|ketik(?:kan|in)?|input(?:kan|in)?|lengkapi|konfirmasi|tempel(?:kan|in)?)${E}`, ['masukkan', 'masukin', 'isi', 'ketik']),
];

const PRETEXTS: CredLexiconEntry[] = [
  entry('cred.en.threat', 'CP.ACCOUNT_THREAT', 'en', 'weak',
    `${B}(?:(?:account|wallet|card|mailbox|access|profile|funds)\\s+(?:will\\s+be|has\\s+been|is\\s+being|is|may\\s+be)\\s+(?:permanently\\s+)?(?:suspended|locked|blocked|disabled|deactivated|closed|terminated|deleted|restricted|frozen|compromised)|to\\s+avoid\\s+(?:suspension|deactivation|account\\s+closure|losing\\s+(?:access|your\\s+(?:account|funds))))${E}`,
    ['account will be suspended', 'wallet has been restricted', 'to avoid suspension']),
  entry('cred.id.threat', 'CP.ACCOUNT_THREAT', 'id', 'weak',
    `${B}(?:(?:akun|rekening|kartu|dompet|saldo)(?:nya|\\s+(?:anda|kamu|lu|lo))?\\s+(?:akan\\s+|bakal\\s+|mau\\s+|telah\\s+|sudah\\s+|sedang\\s+)?(?:di)?(?:blokir|nonaktifkan|tutup|bekukan|hapus|tangguhkan|batasi|banned|suspend)|untuk\\s+menghindari\\s+(?:pemblokiran|penonaktifan|penutupan)|kena\\s+(?:banned|blokir|suspend))${E}`,
    ['akun Anda akan diblokir', 'rekening dibekukan', 'untuk menghindari pemblokiran', 'akunnya bakal disuspend', 'kena banned']),
  // Deadlines; "expires in / valid for N minutes" on real codes is excluded.
  entry('cred.en.urgency', 'CP.URGENCY', 'en', 'weak',
    `${B}(?:(?<!(?:expires?|valid\\s+for|valid)\\s)within\\s+\\d+\\s+(?:minutes?|hours?|days?)|immediately|right\\s+now|act\\s+now|final\\s+(?:warning|notice)|urgent(?:ly)?|as\\s+soon\\s+as\\s+possible|before\\s+it${"['’]"}?s\\s+too\\s+late)${E}`,
    ['within 24 hours', 'immediately', 'urgent', 'final warning']),
  entry('cred.id.urgency', 'CP.URGENCY', 'id', 'weak',
    `${B}(?:(?<!(?:berlaku|kedaluwarsa|kadaluarsa|hangus)\\s)dalam\\s+(?:waktu\\s+)?\\d+\\s+(?:menit|jam|hari)|segera|sekarang\\s+juga|peringatan\\s+terakhir|mendesak|hari\\s+ini\\s+juga|cepetan|buruan|cpt|sebelum\\s+(?:expired|kedaluwarsa|hangus))${E}`,
    ['dalam 24 jam', 'segera', 'sekarang juga', 'cepetan', 'buruan']),
  // Claimed identity or authority. Never verified; never escalates on its own.
  entry('cred.en.support', 'CP.SUPPORT', 'en', 'weak',
    `${B}(?:(?:customer\\s+)?support\\s+(?:team|agent|staff|desk)|(?:security|fraud|it|help\\s*desk|verification)\\s+(?:team|department|agent|officer)|(?:site\\s+|group\\s+)?(?:administrator|moderator)|official\\s+(?:support|team|account|staff|agent)|bank\\s+(?:officer|representative|staff)|on\\s+behalf\\s+of)${E}`,
    ['support team', 'Security Team', 'moderator', 'official support', 'bank officer']),
  entry('cred.id.support', 'CP.SUPPORT', 'id', 'weak',
    `${B}(?:(?:tim|petugas|staf|admin|agen)\\s+(?:resmi|bank|keamanan|dukungan|support|verifikasi)|customer\\s+service|layanan\\s+pelanggan|pihak\\s+bank|admin\\s+(?:grup|komunitas|forum))${E}`,
    ['petugas bank', 'tim keamanan', 'customer service', 'pihak bank']),
  // Verification framing: normal in MFA, so it only counts together with a send request or a recovery phrase.
  entry('cred.en.verify', 'CP.VERIFY', 'en', 'weak',
    `${B}(?:verify|validate|confirm|authenticate|re-?activate|synchroni[sz]e|sync|unlock|restore\\s+access\\s+to)\\s+${YOUR}(?:account|identity|wallet|profile|access|ownership)${E}`,
    ['verify your account', 'validate your wallet', 'sync your wallet']),
  entry('cred.id.verify', 'CP.VERIFY', 'id', 'weak',
    `${B}(?:(?:verifikasi|verif|validasi|konfirmasi|aktivasi\\s+ulang|sinkronisasi|pulihkan)\\s+(?:akun|identitas|dompet|data|kepemilikan)${ANDA}|(?:buat|untuk)\\s+(?:verifikasi|verif))${E}`,
    ['verifikasi akun', 'validasi dompet Anda', 'verif akun', 'buat verifikasi']),
  entry('cred.en.reward', 'CP.REWARD', 'en', 'weak',
    `${B}(?:giveaway|airdrop|prize|reward|bonus|refund|claim\\s+your|you${"['’]"}?ve\\s+won|you\\s+won)${E}`, ['airdrop', 'claim your', "you've won"]),
  entry('cred.id.reward', 'CP.REWARD', 'id', 'weak',
    `${B}(?:hadiah|undian|cashback|klaim|anda\\s+(?:menang|terpilih)|pengembalian\\s+dana)${E}`, ['hadiah', 'klaim', 'pengembalian dana']),
];

/** Context cues reused unchanged from the ClickFix lexicon (negation, reported speech, educational framing). */
const SHARED_CONTEXT: CredLexiconEntry[] = LEXICON
  .filter((e) => e.signal === 'C.NEGATION' || e.signal === 'C.REPORTED' || e.signal === 'C.EDUCATIONAL')
  .map((e) => ({ ...e, signal: e.signal as 'C.NEGATION' | 'C.REPORTED' | 'C.EDUCATIONAL' }));

export const CRED_LEXICON: readonly CredLexiconEntry[] = [...SECRETS, ...DISCLOSURE, ...PRETEXTS, ...SHARED_CONTEXT];
export const CRED_OWN_LEXICON: readonly CredLexiconEntry[] = [...SECRETS, ...DISCLOSURE, ...PRETEXTS];
