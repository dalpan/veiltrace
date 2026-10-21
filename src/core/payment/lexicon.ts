// Lexicon of the EXPERIMENTAL payment-manipulation detector (M5.2), English and Indonesian. Written for VEILTRACE (D-012).
// Negation, reported-speech and educational cues are reused read-only from the ClickFix lexicon.
import { LEXICON } from '../lexicon/index.js';
import { APOS, B, E } from '../lexicon/patterns.js';
import type { Lang, Strength } from '../types.js';
import type { PayLexiconEntry } from './types.js';

function entry(id: string, signal: PayLexiconEntry['signal'], lang: Lang, strength: Strength, source: string, examples: string[]): PayLexiconEntry {
  return { id, signal, lang, strength, pattern: new RegExp(source, 'gu'), examples };
}

const NUM = '\\d[\\d.,]*';

const REQUESTS: PayLexiconEntry[] = [
  // Imperatives and obligations addressed to the reader. Past tense ("paid", "transferred") is a report, not a request.
  entry('pay.en.pay', 'PY.PAY', 'en', 'strong',
    `${B}(?:pay|make\\s+(?:a\\s+|the\\s+)?payment|transfer|wire|deposit|top\\s+up|send\\s+(?:the\\s+|a\\s+|us\\s+|me\\s+)?(?:money|funds|payment|fee|amount|deposit)|(?:buy|purchase|get)\\s+(?:[\\p{L}\\d$]+\\s+){0,3}?(?:gift|google\\s+play|itunes|steam|apple)\\s+cards?)${E}`,
    ['pay', 'make a payment', 'transfer', 'send the money', 'buy three Google Play gift cards']),
  entry('pay.id.pay', 'PY.PAY', 'id', 'strong',
    `${B}(?:bayar(?:kan|lah)?|transfer(?:kan|lah)?|tf|lakukan\\s+(?:pembayaran|transfer)|setor(?:kan)?|top\\s*-?up|lunasi|kirim(?:kan)?\\s+(?:uang|dana|biaya|pembayaran)|(?:harus|wajib|perlu|diharuskan|segera|mohon|silakan|cukup)\\s+(?:membayar|mentransfer|menyetor|melunasi|mengirim(?:kan)?\\s+(?:uang|dana|biaya))|beli(?:kan)?\\s+(?:voucher|kartu\\s+hadiah))${E}`,
    ['bayar', 'transfer', 'lakukan pembayaran', 'kirimkan uang', 'wajib membayar', 'belikan voucher']),
];

const OBJECTS: PayLexiconEntry[] = [
  // Amounts: matched to tie a request to money. The value itself is never reported (PayObservation.text is "").
  entry('pay.amount', 'PA.AMOUNT', 'en', 'strong',
    `${B}(?:(?:rp\\.?|idr|usd|us\\$|\\$|€|£|eur)\\s?${NUM}(?:\\s?(?:juta|jt|ribu|rb|k|million|thousand))?|${NUM}\\s?(?:juta|jt|ribu|rb)?\\s?(?:rupiah|dollars?|usd|idr|euros?))${E}`,
    ['Rp 150.000', 'Rp2 juta', '$49.99', 'USD 200', '300 dollars', '500 ribu rupiah']),
  // Informal amounts without a currency sign ("50rb", "2jt", "100k"): only an object when a pay verb is in the same block.
  entry('pay.amount.informal', 'PA.AMOUNT', 'id', 'strong', `${B}\\d[\\d.,]*\\s?(?:rb|ribu|jt|juta|k)${E}`, ['50rb', '2jt', '100k', '150 ribu']),
  entry('pay.en.fee', 'PF.FEE', 'en', 'weak', `${B}(?:fees?|surcharges?|charges?)${E}`, ['fee', 'charges']),
  entry('pay.id.fee', 'PF.FEE', 'id', 'weak', `${B}(?:biaya|ongkos(?:\\s+kirim)?|ongkir|pajak)${E}`, ['biaya', 'ongkir', 'pajak']),
  // A fee whose stated purpose is to release, unlock or hand over something: the core of advance-fee fraud.
  entry('pay.en.release_fee', 'PF.RELEASE_FEE', 'en', 'strong',
    `${B}(?:(?:account\\s+)?(?:verification|unlock(?:ing)?|unblock(?:ing)?|reactivation|account\\s+activation|release|clearance|anti-?money\\s+laundering|aml)\\s+(?:fees?|charges?|deposits?|tax(?:es)?)|(?:prize|winnings|lottery)\\s+(?:tax(?:es)?|fees?)|(?:tax(?:es)?|fees?)\\s+on\\s+(?:your\\s+)?(?:prize|winnings))${E}`,
    ['verification fee', 'unlock fee', 'release fee', 'clearance fee', 'prize tax', 'tax on your winnings']),
  entry('pay.id.release_fee', 'PF.RELEASE_FEE', 'id', 'strong',
    `${B}(?:biaya\\s+(?:verifikasi|aktivasi\\s+akun|buka\\s+blokir|pembukaan\\s+blokir|pencairan|pelepasan|klaim(?:\\s+hadiah)?|pengurusan\\s+hadiah)|pajak\\s+(?:hadiah|undian|pemenang)|uang\\s+jaminan)${E}`,
    ['biaya verifikasi', 'biaya buka blokir', 'biaya pencairan', 'pajak hadiah', 'uang jaminan']),
];

const DESTINATIONS: PayLexiconEntry[] = [
  // "your personal account" is the reader's own account (ordinary banking), so only someone else's personal account counts.
  entry('pay.en.personal', 'PD.PERSONAL', 'en', 'strong',
    `${B}(?:my|his|her|their|this|(?:the|our|an?)\\s+agent${APOS}s)\\s+(?:personal|private|own)\\s+(?:bank\\s+)?(?:account|wallet)${E}`,
    ['my personal account', "the agent's personal account"]),
  entry('pay.id.personal', 'PD.PERSONAL', 'id', 'strong',
    `${B}rekening\\s+(?:(?:pribadi|perorangan)(?!\\s+(?:anda|kamu))(?:\\s+(?:saya|kami|admin|petugas|agen))?|(?:saya|admin|petugas|agen|kurir))${E}`,
    ['rekening pribadi saya', 'rekening pribadi', 'rekening admin']),
  entry('pay.id.personal_informal', 'PD.PERSONAL', 'id', 'strong',
    `${B}(?:rek\\.?|norek|rekening)\\s+(?:admin|sy|aku|gw|gue|petugas|agen|kurir)${E}|${B}(?:dana|ovo|gopay|shopeepay|e-?wallet)\\s+(?:saya|sy|aku|gw|gue|admin|petugas)${E}`,
    ['rek admin', 'norek sy', 'dana sy', 'ovo admin']),
  entry('pay.en.off_platform', 'PD.OFF_PLATFORM', 'en', 'strong',
    `${B}(?:(?:outside|off)\\s+(?:of\\s+)?(?:the\\s+|this\\s+)?(?:app|platform|marketplace|website|site|escrow)|directly\\s+to\\s+(?:me|my\\s+(?:account|number|wallet))|(?:skip|avoid|bypass|instead\\s+of)\\s+(?:using\\s+)?(?:the\\s+)?(?:checkout|escrow|platform\\s+payment|app\\s+payment))${E}`,
    ['outside the app', 'directly to me', 'instead of using the checkout']),
  entry('pay.id.off_platform', 'PD.OFF_PLATFORM', 'id', 'strong',
    `${B}(?:di\\s+luar\\s+(?:aplikasi|platform|marketplace|situs|rekber)|langsung\\s+ke\\s+(?:saya|rekening\\s+saya|nomor\\s+saya)|tanpa\\s+(?:melalui|lewat)\\s+(?:aplikasi|platform|checkout|rekber)|(?:transfer|tf)\\s+langsung)${E}`,
    ['di luar aplikasi', 'langsung ke saya', 'tanpa melalui aplikasi', 'transfer langsung']),
  entry('pay.en.gift_card', 'PD.GIFT_CARD', 'en', 'strong',
    `${B}(?:gift\\s*cards?|google\\s+play\\s+(?:gift\\s+)?cards?|itunes\\s+cards?|steam\\s+(?:gift\\s+|wallet\\s+)?cards?)${E}`, ['gift card', 'Google Play cards']),
  entry('pay.id.gift_card', 'PD.GIFT_CARD', 'id', 'strong',
    `${B}(?:kartu\\s+hadiah|voucher\\s+(?:google\\s+play|steam|itunes))${E}`, ['kartu hadiah', 'voucher Google Play']),
  entry('pay.en.crypto', 'PD.CRYPTO', 'en', 'strong',
    `${B}(?:bitcoin|btc|usdt|crypto(?:currency)?(?:\\s+wallet)?|wallet\\s+address)${E}`, ['bitcoin', 'USDT', 'wallet address']),
  entry('pay.id.crypto', 'PD.CRYPTO', 'id', 'strong', `${B}(?:aset\\s+kripto|kripto|alamat\\s+dompet)${E}`, ['kripto', 'alamat dompet']),
];

const RECEIVE: PayLexiconEntry[] = [
  entry('pay.en.refund', 'PR.REFUND', 'en', 'weak',
    `${B}(?:refunds?|reimbursement|compensation|overpayment|(?:release|unfreeze)\\s+(?:your\\s+|the\\s+)?(?:funds|money|payment|package|parcel|shipment)|(?:funds|money|payment|package|parcel)\\s+(?:is|are|has\\s+been|have\\s+been)\\s+(?:on\\s+hold|held|frozen))${E}`,
    ['refund', 'compensation', 'release your funds', 'package is on hold']),
  entry('pay.id.refund', 'PR.REFUND', 'id', 'weak',
    `${B}(?:pengembalian\\s+dana|refund|ganti\\s+rugi|kompensasi|kelebihan\\s+(?:bayar|pembayaran)|(?:dana|paket)(?:\\s+(?:anda|kamu))?\\s+(?:tertahan|dibekukan|ditahan)|(?:pencairan|mencairkan)\\s+dana)${E}`,
    ['pengembalian dana', 'kompensasi', 'dana Anda tertahan', 'pencairan dana']),
  entry('pay.id.release_informal', 'PR.REFUND', 'id', 'weak',
    `${B}(?:saldo|bonus|hadiah|dana|uang|cashback|komisi)\\s+(?:[\\p{L}\\d]+\\s+){0,4}?(?:siap\\s+|bisa\\s+|langsung\\s+)?(?:dicair(?:kan|in)|cair|ditarik|withdraw)${E}`,
    ['saldo bonus 2jt kakak udah siap dicairin', 'komisi bisa ditarik']),
  entry('pay.en.prize', 'PR.PRIZE', 'en', 'weak',
    `${B}(?:you(?:${APOS}ve|\\s+have)?\\s+(?:won|been\\s+selected)|(?:lucky|selected)\\s+winner|your\\s+(?:prize|winnings|reward)|claim\\s+(?:your\\s+)?(?:prize|winnings|reward)|grand\\s+prize|lottery\\s+winnings?)${E}`,
    ["you've won", 'lucky winner', 'claim your prize']),
  entry('pay.id.prize', 'PR.PRIZE', 'id', 'weak',
    `${B}(?:anda\\s+(?:telah\\s+|resmi\\s+)?(?:memenangkan|terpilih|menang|mendapatkan\\s+hadiah)|pemenang(?:\\s+(?:undian|program|giveaway))?|hadiah\\s+(?:undian|utama|anda|uang\\s+tunai)|klaim\\s+hadiah|undian\\s+berhadiah)${E}`,
    ['Anda memenangkan', 'pemenang undian', 'hadiah utama', 'klaim hadiah']),
  entry('pay.en.unlock', 'PR.UNLOCK', 'en', 'weak',
    `${B}(?:(?:unlock|unblock|reactivate|re-activate|restore|reopen|unfreeze)\\s+(?:your\\s+|the\\s+)?(?:account|wallet|card|access|profile|withdrawals?)|(?:verify|activate)\\s+(?:your\\s+)?(?:account|wallet))${E}`,
    ['unlock your account', 'reactivate your wallet', 'verify your account']),
  entry('pay.id.unlock', 'PR.UNLOCK', 'id', 'weak',
    `${B}(?:buka\\s+blokir|membuka\\s+blokir|aktivasi(?:\\s+ulang)?|mengaktifkan(?:\\s+kembali)?|memulihkan|pemulihan|verifikasi)\\s+(?:akun|rekening|dompet|kartu|saldo)${E}`,
    ['buka blokir akun', 'aktivasi ulang akun', 'verifikasi akun']),
  entry('pay.id.unlock_informal', 'PR.UNLOCK', 'id', 'weak',
    `${B}(?:buka|bka|aktifin|aktifkan|pulihin|balikin)\\s+(?:lagi\\s+)?akun(?:nya|\\s+(?:kamu|lu|lo|kakak|kak))?${E}`, ['buka akunnya', 'aktifin lagi akun kamu']),
  // The clause that makes the payment a precondition for receiving something.
  entry('pay.en.condition', 'PC.CONDITION', 'en', 'weak',
    `${B}(?:(?:in\\s+order\\s+)?to|before\\s+(?:we|you)\\s+can|so\\s+(?:that\\s+)?(?:we|you)\\s+can|for\\s+us\\s+to)\\s+(?:receive|claim|release|unlock|unblock|reactivate|activate|withdraw|collect|redeem|restore|recover|unfreeze|process\\s+(?:your\\s+|the\\s+)?(?:refund|prize|withdrawal))${E}`,
    ['to receive', 'to claim', 'before we can release', 'to process your refund']),
  entry('pay.id.condition', 'PC.CONDITION', 'id', 'weak',
    `${B}(?:agar|supaya|untuk|sebelum|baru)\\s+(?:(?:dapat|bisa)\\s+)?(?:menerima|mencairkan|dicairkan|mengklaim|diklaim|membuka|dibuka|mengaktifkan|diaktifkan|menarik|ditarik|memulihkan|dipulihkan|dilepas)${E}`,
    ['agar dapat dicairkan', 'untuk mencairkan', 'supaya bisa dibuka']),
  entry('pay.id.condition_informal', 'PC.CONDITION', 'id', 'weak',
    `${B}(?:(?:abis|habis|setelah|sesudah)\\s+(?:itu|bayar|transfer|tf)|baru(?:\\s+(?:bisa|dapat))?)\\s+(?:langsung\\s+)?(?:cair|dicair(?:kan|in)|masuk|dikirim|aktif|dibuka|kebuka)${E}`,
    ['abis itu langsung cair', 'setelah transfer langsung masuk', 'baru bisa cair']),
  entry('pay.en.condition_after', 'PC.CONDITION', 'en', 'weak',
    `${B}(?:then|after\\s+that|once\\s+(?:paid|you\\s+pay))\\s+(?:your\\s+)?(?:funds|money|prize|refund|balance|parcel|package|account)\\s+(?:will\\s+be\\s+)?(?:released|sent|unlocked|credited|delivered)${E}`,
    ['then your funds will be released', 'once paid your parcel will be delivered']),
];

const PRESSURE: PayLexiconEntry[] = [
  entry('pay.en.threat', 'PP.THREAT', 'en', 'weak',
    `${B}(?:(?:account|wallet|card|access|profile|funds|number|sim)\\s+(?:will\\s+be|has\\s+been|is\\s+being|may\\s+be)\\s+(?:permanently\\s+)?(?:suspended|locked|blocked|disabled|deactivated|closed|terminated|frozen|restricted|seized)|(?:will|may|could)\\s+be\\s+(?:arrested|prosecuted|sued|charged|jailed|detained|deported)|arrest\\s+warrant|warrant\\s+for\\s+your\\s+arrest|(?:face|facing)\\s+(?:legal\\s+action|prosecution|criminal\\s+charges|arrest)|legal\\s+action\\s+(?:will|against\\s+you))${E}`,
    ['account will be suspended', 'will be arrested', 'warrant for your arrest', 'face legal action']),
  entry('pay.id.threat', 'PP.THREAT', 'id', 'weak',
    `${B}(?:(?:akun|rekening|kartu|dompet|saldo|nomor)(?:\\s+(?:anda|kamu))?\\s+(?:akan\\s+|telah\\s+|sudah\\s+)?(?:di)?(?:blokir|nonaktifkan|tutup|bekukan|sita|tangguhkan)|akan\\s+(?:di)?(?:tangkap|penjarakan|pidanakan|polisikan|proses\\s+(?:secara\\s+)?hukum|laporkan\\s+ke\\s+(?:polisi|pihak\\s+berwajib))|surat\\s+(?:penangkapan|perintah\\s+penangkapan)|terancam\\s+(?:pidana|penjara|ditangkap))${E}`,
    ['akun Anda akan diblokir', 'akan ditangkap', 'terancam pidana']),
  entry('pay.id.threat_informal', 'PP.THREAT', 'id', 'weak',
    `${B}(?:(?:ke|ter)hapus\\s+permanen|kena\\s+(?:blokir|banned|suspend)|(?:bakal|mau)\\s+(?:di)?(?:blokir|hapus|banned|suspend))${E}`,
    ['kehapus permanen', 'kena blokir', 'bakal diblokir']),
  // Deadlines in minutes or hours and explicit pressure. "Expires in / valid for" on real payment links is excluded.
  entry('pay.en.urgency', 'PP.URGENCY', 'en', 'weak',
    `${B}(?:(?<!(?:expires?|valid\\s+for|valid)\\s)within\\s+\\d+\\s+(?:minutes?|mins?|hours?|hrs?)|immediately|right\\s+now|act\\s+now|urgent(?:ly)?|as\\s+soon\\s+as\\s+possible|before\\s+it${APOS}?s\\s+too\\s+late|final\\s+warning|last\\s+chance)${E}`,
    ['within 2 hours', 'immediately', 'urgent', 'final warning']),
  entry('pay.id.urgency', 'PP.URGENCY', 'id', 'weak',
    `${B}(?:(?<!(?:berlaku|kedaluwarsa|kadaluarsa|hangus)\\s)dalam\\s+(?:waktu\\s+)?\\d+\\s+(?:menit|jam)|segera|sekarang\\s+juga|hari\\s+ini\\s+juga|peringatan\\s+terakhir|mendesak|secepatnya|kesempatan\\s+terakhir)${E}`,
    ['dalam 30 menit', 'segera', 'sekarang juga', 'secepatnya']),
  entry('pay.id.urgency_informal', 'PP.URGENCY', 'id', 'weak',
    `${B}(?:buruan|cepetan|cpt|sebelum\\s+jam\\s+\\d+|sampe\\s+jam\\s+\\d+|slot(?:nya)?\\s+(?:cuma|terbatas))${E}`, ['buruan', 'cpt', 'sampe jam 12', 'slotnya cuma']),
  // Claimed identity or authority. Never verified; never escalates on its own.
  entry('pay.en.authority', 'PP.AUTHORITY', 'en', 'weak',
    `${B}(?:customer\\s+(?:support|service|care)(?:\\s+(?:team|agent|officer|representative))?|support\\s+(?:team|agent|staff|desk)|help\\s*desk|(?:security|fraud|billing|compliance|verification)\\s+(?:team|department|officer|agent)|bank\\s+(?:officer|representative|staff|manager)|police(?:\\s+(?:officer|department))?|customs\\s+(?:office|officer|department|authority)|tax\\s+(?:office|officer|authority|department)|court\\s+(?:officer|order)|(?:government|federal)\\s+agent|official\\s+(?:support|agent|representative|account))${E}`,
    ['customer service', 'support agent', 'fraud department', 'police officer', 'customs officer']),
  entry('pay.id.authority', 'PP.AUTHORITY', 'id', 'weak',
    `${B}(?:customer\\s+service|cs\\s+resmi|layanan\\s+pelanggan|petugas(?:\\s+(?:bank|resmi|bea\\s+cukai|pajak|kepolisian|kurir|ekspedisi))?|pihak\\s+(?:bank|kepolisian|bea\\s+cukai|berwajib)|polisi|kepolisian|bea\\s+cukai|kantor\\s+pajak|admin\\s+resmi|tim\\s+(?:keamanan|resmi|verifikasi)|kurir\\s+resmi)${E}`,
    ['customer service', 'petugas bank', 'pihak kepolisian', 'bea cukai']),
];

/** Context cues reused unchanged from the ClickFix lexicon (negation, reported speech, educational framing). */
const SHARED_CONTEXT: PayLexiconEntry[] = LEXICON
  .filter((e) => e.signal === 'C.NEGATION' || e.signal === 'C.REPORTED' || e.signal === 'C.EDUCATIONAL')
  .map((e) => ({ ...e, signal: e.signal as 'C.NEGATION' | 'C.REPORTED' | 'C.EDUCATIONAL' }));

export const PAY_LEXICON: readonly PayLexiconEntry[] = [...REQUESTS, ...OBJECTS, ...DESTINATIONS, ...RECEIVE, ...PRESSURE, ...SHARED_CONTEXT];
export const PAY_OWN_LEXICON: readonly PayLexiconEntry[] = [...REQUESTS, ...OBJECTS, ...DESTINATIONS, ...RECEIVE, ...PRESSURE];
